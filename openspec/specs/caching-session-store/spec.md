## Requirements

### Requirement: Session 驗證走 memory cache，miss 時 fallback DB

`CachingSessionStore` 的 `findById` SHALL 先查詢 memory layer；若 memory 中不存在，SHALL 查詢 DB layer，並在回傳前將結果存入 memory。

#### Scenario: Memory hit
- **WHEN** `findById` 被呼叫，且 session 存在於 memory 中且未過期
- **THEN** 直接回傳 memory 中的 session，不觸發任何 DB 查詢

#### Scenario: Memory miss，DB hit（cold-start / 重啟後）
- **WHEN** `findById` 被呼叫，memory 中不存在，但 DB 中存在未過期的 session
- **THEN** 從 DB 讀取 session，存入 memory，回傳該 session

#### Scenario: Memory miss，DB 也沒有
- **WHEN** `findById` 被呼叫，memory 與 DB 皆無該 session
- **THEN** 回傳 `null`

### Requirement: Cache 層負責過期判斷

`CachingSessionStore.findById` SHALL 檢查 session 的 `expiresAt`，過期的 session 不應被回傳。

#### Scenario: Memory 中存在但已過期
- **WHEN** `findById` 被呼叫，memory 中存在該 session，但 `expiresAt` 已早於當前時間
- **THEN** 從 memory 中移除該 session，繼續走 DB fallback

#### Scenario: DB 中存在但已過期
- **WHEN** `findById` 被呼叫，memory miss，DB 中存在該 session 但 `expiresAt` 已早於當前時間
- **THEN** 不將該 session 存入 memory，回傳 `null`

### Requirement: 寫操作同步更新 memory 與 DB

`save`、`delete`、`deleteByPlayerId`、`refresh` 操作 SHALL 同時作用於 DB layer 與 memory layer，保持兩層一致。

#### Scenario: save 新 session
- **WHEN** `save` 被呼叫
- **THEN** session 持久化至 DB，並同時存入 memory

#### Scenario: delete session（如 logout）
- **WHEN** `delete` 被呼叫
- **THEN** session 從 DB 刪除，並同時從 memory 移除

#### Scenario: deleteByPlayerId（如帳號刪除、單裝置登入踢除舊 session）
- **WHEN** `deleteByPlayerId` 被呼叫
- **THEN** DB 中該 playerId 的所有 session 被刪除，memory 中所有 `playerId` 相符的 session 也被同步移除

#### Scenario: refresh session（滑動過期）
- **WHEN** `refresh` 被呼叫
- **THEN** DB 中的 `expiresAt` 與 `lastAccessedAt` 更新，memory 中的副本同步替換為更新後的 session

### Requirement: 定期清理過期 session

`CachingSessionStore.cleanupExpired` SHALL 清理 memory 中與 DB 中所有已過期的 session。

#### Scenario: 清理執行
- **WHEN** `cleanupExpired` 被呼叫
- **THEN** memory 與 DB 中 `expiresAt` 早於當前時間的 session 均被刪除，回傳實際刪除數量

### Requirement: SessionCleanup plugin 連接正確的維護介面

`sessionCleanup.ts` plugin SHALL 透過 DI Container 暴露的維護介面呼叫 `cleanupExpired`，而非任何孤立的全域單例。

#### Scenario: Plugin 執行清理
- **WHEN** cleanup interval 觸發（每 30 分鐘）
- **THEN** `getIdentityContainer().sessionMaintenance.cleanupExpired()` 被呼叫，memory 與 DB 中過期 session 均被清除
