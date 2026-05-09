## ADDED Requirements

### Requirement: API 呼叫透過 Adapter 封裝
`app/pages/` 層 SHALL 不直接使用 `$fetch` 或 `useFetch` 呼叫業務 API，應透過對應 BC 的 Adapter 層封裝。

#### Scenario: pages 層呼叫 private-room API
- **WHEN** `app/pages/` 中的任何頁面需要操作 private-room 資源
- **THEN** 頁面 MUST 透過 `PrivateRoomApiClient`（位於 `game-client/adapter/api/`）發起請求，不得直接呼叫 `/api/v1/private-room/...`
