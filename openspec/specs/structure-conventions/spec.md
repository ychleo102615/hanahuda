## ADDED Requirements

### Requirement: Server BC 目錄命名一致性
`server/` 下所有 BC 的 Adapter 層目錄 SHALL 統一命名為 `adapters`（複數）。

#### Scenario: 新 server BC 的目錄命名
- **WHEN** 在 `server/` 下建立新的 BC
- **THEN** Adapter 層目錄 MUST 命名為 `adapters`

---

### Requirement: App BC 目錄命名一致性
`app/` 下所有 BC 的 Adapter 層目錄 SHALL 統一命名為 `adapter`（單數）。

#### Scenario: 新 app BC 的目錄命名
- **WHEN** 在 `app/` 下建立新的 BC
- **THEN** Adapter 層目錄 MUST 命名為 `adapter`

---

### Requirement: API 路由版本前綴
`server/api/` 下所有業務 API 路由 SHALL 放置於 `v1/` 子目錄內。

#### Scenario: 新 API 端點的版本位置
- **WHEN** 新增一個業務 API 路由
- **THEN** 路由檔案 MUST 放置於 `server/api/v1/<resource>/` 下

---

### Requirement: BC 邊界的 Composable 歸屬
依賴特定 BC Adapter 層的 Composable SHALL 放置於對應 BC 的 `adapter/composables/` 目錄內，而非全域 `app/composables/`。

#### Scenario: Composable 引用 BC 內部 Adapter
- **WHEN** 一個 Composable 直接 import 某個 BC 的 Adapter 類別或函式
- **THEN** 該 Composable MUST 位於同一 BC 的 `adapter/composables/` 目錄中

---

### Requirement: API 呼叫透過 Adapter 封裝
`app/pages/` 層 SHALL 不直接使用 `$fetch` 或 `useFetch` 呼叫業務 API，應透過對應 BC 的 Adapter 層封裝。

#### Scenario: pages 層呼叫 private-room API
- **WHEN** `app/pages/` 中的任何頁面需要操作 private-room 資源
- **THEN** 頁面 MUST 透過 `PrivateRoomApiClient`（位於 `game-client/adapter/api/`）發起請求，不得直接呼叫 `/api/v1/private-room/...`

---

### Requirement: 測試目錄位置
所有測試檔案 SHALL 放置於根層 `tests/` 目錄下，按 `tests/{client,server}/<BC名稱>/` 組織，不得在原始碼目錄內建立 `__tests__/` 子目錄。

#### Scenario: 為 server BC 新增測試
- **WHEN** 為 `server/<BC>` 的某層新增測試
- **THEN** 測試檔案 MUST 放置於 `tests/server/<BC>/` 對應路徑下
