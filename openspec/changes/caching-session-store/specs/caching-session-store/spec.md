## ADDED Requirements

### Requirement: Session 驗證走 memory cache，miss 時 fallback DB

`CachingSessionStore` 的 `findById` SHALL 先查詢 memory layer；若 memory 中不存在，SHALL 查詢 DB layer，並在回傳前將結果存入 memory。

#### Scenario: Memory hit
- **WHEN** `findById` 被呼叫，且 session 存在於 memory 中
- **THEN** 直接回傳 memory 中的 session，不觸發任何 DB 查詢

#### Scenario: Memory miss，DB hit（cold-start / 重啟後）
- **WHEN** `findById` 被呼叫，memory 中不存在，但 DB 中存在有效 session
- **THEN** 從 DB 讀取 session，存入 memory，回傳該 session

#### Scenario: Memory miss，DB 也沒有
- **WHEN** `findById` 被呼叫，memory 與 DB 皆無該 session
- **THEN** 回傳 `null`

### Requirement: 寫操作同步更新 memory 與 DB

`save`、`delete`、`refresh` 操作 SHALL 同時作用於 DB layer 與 memory layer，保持兩層一致。

#### Scenario: save 新 session
- **WHEN** `save` 被呼叫
- **THEN** session 持久化至 DB，並同時存入 memory

#### Scenario: delete session（如 logout）
- **WHEN** `delete` 被呼叫
- **THEN** session 從 DB 刪除，並同時從 memory 移除

#### Scenario: refresh session（滑動過期）
- **WHEN** `refresh` 被呼叫
- **THEN** DB 中的 `expiresAt` 與 `lastAccessedAt` 更新，memory 中的副本同步替換為更新後的 session

### Requirement: 定期清理過期 session

`cleanupExpired` SHALL 清理 memory 中與 DB 中所有已過期的 session。

#### Scenario: 清理執行
- **WHEN** `cleanupExpired` 被呼叫
- **THEN** memory 與 DB 中 `expiresAt` 早於當前時間的 session 均被刪除，回傳實際刪除數量

### Requirement: SessionCleanup plugin 連接正確的 store 實例

`sessionCleanup.ts` plugin SHALL 呼叫 DI Container 中 `CachingSessionStore` 的 `cleanupExpired`，而非任何孤立的全域單例。

#### Scenario: Plugin 執行清理
- **WHEN** cleanup interval 觸發（每 30 分鐘）
- **THEN** `CachingSessionStore.cleanupExpired` 被呼叫，memory 與 DB 中過期 session 均被清除
