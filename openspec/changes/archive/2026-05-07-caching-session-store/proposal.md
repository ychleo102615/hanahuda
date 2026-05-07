## Why

每次遊戲操作（出牌、選目標牌等）都會觸發一次 PostgreSQL SELECT 來驗證 Session，造成不必要的資料庫延遲。Session 資料結構穩定（只含 `playerId` 與到期時間），非常適合 in-memory caching。

## What Changes

- **新增** `CachingSessionStore`：`SessionStorePort` 的唯一生產實作，內部組合 memory 層與 DB 層，實現 read-through / write-through cache 語意
- **退階** `DrizzleSessionStore`：不再直接實作 `SessionStorePort`，重命名為 `SessionDbStore`，成為 `CachingSessionStore` 的內部 DB 存取元件
- **退階** `InMemorySessionStore`：不再直接實作 `SessionStorePort`，重命名為 `SessionMemoryStore`，成為 `CachingSessionStore` 的內部 cache 元件
- **修正** `sessionCleanup.ts` plugin：目前連接到錯誤的 store 實例（永遠空的 Map），修正為連接 `CachingSessionStore` 的 cleanup 方法

## Capabilities

### New Capabilities

- `caching-session-store`: In-memory read-through cache 層，作為 Session 驗證的快取，減少 DB 查詢；包含 cold-start DB fallback、write-through 同步、與定期過期清理邏輯

### Modified Capabilities

（無 spec 層行為變更，僅為 Adapter 層實作重構）

## Impact

**修改的檔案：**
- `front-end/server/identity/adapters/di/container.ts` — 改接 `CachingSessionStore`，並暴露 `cleanupExpired` 維護介面給 plugin
- `front-end/server/plugins/sessionCleanup.ts` — 修正連接目標

**新增的檔案：**
- `front-end/server/identity/adapters/session/caching-session-store.ts`
- `front-end/server/identity/adapters/session/internal/session-db-store.ts`（從 `drizzle-session-store.ts` 提取，移除 Port 繼承）
- `front-end/server/identity/adapters/session/internal/session-memory-store.ts`（從 `in-memory-session-store.ts` 提取，移除 Port 繼承與全域單例）

**刪除的檔案：**
- `front-end/server/identity/adapters/persistence/drizzle-session-store.ts`
- `front-end/server/identity/adapters/session/in-memory-session-store.ts`

**不受影響：**
- 所有 Use Cases（依賴 `SessionStorePort` 抽象，不感知實作）
- 所有測試（使用 `vi.fn()` mock `SessionStorePort`，不依賴具體實作）
- Domain layer、Application layer
