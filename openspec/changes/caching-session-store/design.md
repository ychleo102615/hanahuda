## Context

目前 `SessionStorePort` 有兩個平行實作：`DrizzleSessionStore`（生產用，接 PostgreSQL）與 `InMemorySessionStore`（MVP 備用）。DI Container 接的是 `DrizzleSessionStore`，每次 Session 驗證都觸發一次 DB SELECT。

`sessionCleanup.ts` plugin 目前呼叫 `getSessionStore()` 回傳的是 `InMemorySessionStore` 的全域單例，但此單例與 DI Container 的 sessionStore 完全無關，導致 cleanup 每 30 分鐘清理一個永遠為空的 Map（dead code）。

部署環境為 Fly.io 單台 VM（256mb），有 auto-stop/start 行為，重啟後 memory 狀態消失。

## Goals / Non-Goals

**Goals:**
- 遊戲操作的 Session 驗證改為走 memory，消除 hot-path 的 DB SELECT
- 機器重啟後能從 DB 自動 reload session（cold-start fallback）
- `SessionStorePort` 維持單一生產實作，消除「兩個實作選哪個」的語意模糊
- 修正 `sessionCleanup.ts` 實際執行清理邏輯
- 不動 Use Cases、tests、Domain / Application layer

**Non-Goals:**
- 不引入 Redis 或其他外部 cache 基礎設施
- 不處理多台 server / load balancer 場景（目前架構是單台）
- 不改變 Session domain 邏輯（滑動過期、7 天 TTL）

## Decisions

### 1. 新增 `CachingSessionStore` 作為唯一 Port 實作（Composition）

`CachingSessionStore` 實作 `SessionStorePort`，內部組合 `SessionMemoryStore`（in-memory Map）與 `SessionDbStore`（DB）。所有 Port 操作透過這層協調。

非嚴格的 Decorator pattern——因為 internal store 不再實作 `SessionStorePort`，兩者是 `CachingSessionStore` 的私有依賴而非可互換的同型別實作，所以採用 Composition / Facade 描述更精確。

**拒絕的替代方案：讓 `InMemorySessionStore` 直接加入 DB 存取能力**
→ 命名說謊（叫 InMemory 卻偷偷用 DB），兩個 store 的職責模糊，測試複雜度上升。

### 2. `SessionDbStore` / `SessionMemoryStore` 退出 Port 繼承體系

兩者不再 extend `SessionStorePort`，成為純粹的基礎設施工具，只服務 `CachingSessionStore`。命名去掉語意過重的 `Drizzle` / `InMemory` 前綴，改為反映角色的 `Db` / `Memory` 後綴詞。

檔案移至 `adapters/session/internal/` 以表達非 Port 身份。`SessionMemoryStore` 不再保留 `getSessionStore()` 全域單例（原本就是 dead code），也不再保留 `clear()`（原本只給測試用，CachingSessionStore 不需要）。

### 3. Cache 策略：Read-through + Write-through

```
findById:
  memory hit  → 回傳（零 DB）
  memory miss → db.findById → 存入 memory → 回傳（cold-start / 首次存取）

save:
  db.save → memory.set（寫入同時更新快取）

delete:
  db.delete → memory.delete（logout 同步清除，雖然 cookie 已清所以無安全影響）

refresh:
  db.refresh → memory.set（更新快取中的 expiresAt）

cleanupExpired:
  memory.cleanupExpired（清理 Map）
  db.cleanupExpired（清理 DB，保持持久層一致）
```

**為何 delete 也同步清 memory？**
雖然 logout 後 cookie 已清，殘留的 stale session 在實際上不會被使用，但同步清除能保持兩層一致，避免未來 debug 困惑。

### 4. `cleanupExpired` 不加進 `SessionStorePort`，由 Container 額外暴露維護介面

`cleanupExpired` 是 infra layer 的維護操作（排程清理過期資料），不是 Use Case 會用到的 Port 契約。將它加進 `SessionStorePort` 會讓 Application layer 的 Use Cases 看見一個它們不該關心的方法。

選擇：`IdentityContainer` 在 `sessionStore: SessionStorePort` 之外，額外暴露 `sessionMaintenance: { cleanupExpired(): Promise<number> }`，型別由 `CachingSessionStore` 直接提供（concrete export 中包含 `cleanupExpired`）。Plugin 透過 `getIdentityContainer().sessionMaintenance.cleanupExpired()` 呼叫。

**拒絕的替代方案 A：把 `cleanupExpired` 加進 `SessionStorePort`**
→ 污染 Port 契約，Use Cases 都看得到一個不該用的方法。

**拒絕的替代方案 B：plugin 直接 import `CachingSessionStore` concrete type**
→ Plugin 跨層直接依賴 concrete adapter，違反 DI Container 作為唯一裝配點的原則。

### 5. Cache 層為過期負責

`CachingSessionStore.findById` 在 memory hit 與 DB fallback 兩條路徑都檢查 `expiresAt`：
- Memory hit 但已過期 → 從 memory 移除，視為 miss，繼續走 DB fallback
- DB 撈到但已過期 → 不存入 memory，回傳 null（並可選地觸發 lazy delete）

理由：
- **契約一致性**：`findById` 不應回傳「DB 已該被 cleanup 但還沒清」的 stale row
- **單一責任**：過期判斷集中在 store 層，Use Case 的 `isSessionExpired` 退為深度防禦而非唯一防線
- **避免 cold-start window**：機器重啟後第一次 `cleanupExpired` 要等 30 分鐘，這期間若無 cache 過期檢查，過期 session 會被 `findById` 回傳

### 6. `sessionCleanup.ts` 改呼叫 `sessionMaintenance.cleanupExpired()`

透過 DI Container 取得 `sessionMaintenance` 介面，而非呼叫 `getSessionStore()` 的孤立全域單例。

## Risks / Trade-offs

**[Memory 增長]** 活躍 session 全部常駐 memory → 對單台 256mb VM 影響極小（每個 session 約 200 bytes，1000 個 session ≈ 200KB）。cleanupExpired 每 30 分鐘定期清理。

**[Refresh 後 memory 有舊 expiresAt]** 若 `refresh` 的 DB 更新成功但 memory 更新失敗（極端情況），memory 的 expiresAt 會比 DB 短，玩家比預期更早需要從 DB reload → 保守失效，不影響安全性，下次 DB fallback 會取到正確值。

**[auto-stop 重啟]** 機器重啟後 memory 清空，第一批請求每個 session 各 fallback 一次 DB → 這是預期行為，屬於 cold-start 成本。

## Migration Plan

1. 新增 `internal/session-db-store.ts`、`internal/session-memory-store.ts`（從現有兩個 store 提取邏輯，移除 Port 繼承）
2. 新增 `caching-session-store.ts`（組合兩個 internal store）
3. 更新 DI Container，改接 `CachingSessionStore`
4. 更新 `sessionCleanup.ts`，改呼叫 container 的 sessionStore
5. 刪除原有 `drizzle-session-store.ts`、`in-memory-session-store.ts`

無資料庫 migration，無 API 變更，無需特殊 rollback 步驟（還原 git commit 即可）。
