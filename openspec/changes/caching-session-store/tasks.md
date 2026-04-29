## 1. 建立 internal store 元件

- [ ] 1.1 建立 `adapters/session/internal/` 目錄
- [ ] 1.2 建立 `internal/session-db-store.ts`：從 `drizzle-session-store.ts` 提取邏輯，移除 `SessionStorePort` 繼承，class 改名為 `SessionDbStore`
- [ ] 1.3 建立 `internal/session-memory-store.ts`：從 `in-memory-session-store.ts` 提取邏輯，移除 `SessionStorePort` 繼承與 `getSessionStore()` 全域單例，class 改名為 `SessionMemoryStore`；移除 `clear()`，保留 `size` getter 供 logging 使用

## 2. 建立 CachingSessionStore

- [ ] 2.1 建立 `adapters/session/caching-session-store.ts`，實作 `SessionStorePort`，constructor 注入 `SessionDbStore` 與 `SessionMemoryStore`
- [ ] 2.2 實作 `findById`：memory hit 且未過期 → 回傳；memory hit 但過期 → 從 memory 移除、繼續 DB fallback；memory miss → DB 查詢，過期則回 null，未過期則存入 memory 並回傳
- [ ] 2.3 實作 `save`：寫入 DB 後同步存入 memory
- [ ] 2.4 實作 `delete`：刪除 DB 後同步移除 memory
- [ ] 2.5 實作 `deleteByPlayerId`：刪除 DB 後同步移除 memory 中同一 playerId 的所有 session
- [ ] 2.6 實作 `refresh`：更新 DB 後同步替換 memory 中的副本
- [ ] 2.7 實作 `cleanupExpired`：分別清理 memory 與 DB，回傳總刪除數量（注意：不在 `SessionStorePort` 介面中，僅是 concrete class 方法）

## 3. 更新 DI Container

- [ ] 3.1 更新 `adapters/di/container.ts`：import `CachingSessionStore` 取代 `DrizzleSessionStore`，組合 `SessionDbStore` 與 `SessionMemoryStore` 注入
- [ ] 3.2 在 `IdentityContainer` 介面增加 `sessionMaintenance: { cleanupExpired(): Promise<number> }`，於 factory 中設為 `CachingSessionStore` 實例（同物件、不同視角，避免重複建構）

## 4. 修正 sessionCleanup plugin

- [ ] 4.1 更新 `plugins/sessionCleanup.ts`：移除 `getSessionStore()` 的孤立全域單例呼叫，改呼叫 `getIdentityContainer().sessionMaintenance.cleanupExpired()`，logging 不再依賴 `size` getter（因 `sessionStore` 為 Port 型別，不暴露 size）

## 5. 移除舊檔案

- [ ] 5.1 刪除 `adapters/persistence/drizzle-session-store.ts`
- [ ] 5.2 刪除 `adapters/session/in-memory-session-store.ts`
- [ ] 5.3 確認整個 codebase 無殘留 import 指向已刪除檔案

## 6. 驗證

- [ ] 6.1 執行 `pnpm --prefix front-end type-check`，無 type error
- [ ] 6.2 執行 `pnpm --prefix front-end test:unit`，所有測試通過
- [ ] 6.3 執行 `pnpm --prefix front-end lint`，無 lint error
