## Context

專案採用 Clean Architecture + DDD，將前後端各自組織成多個 Bounded Context（BC）。由於功能持續迭代，目前存在以下四類問題累積：

1. **空 `__tests__` 目錄**：兩個空目錄殘留在 `server/matchmaking/` 內，與「測試集中在 `tests/` 根目錄」的慣例衝突。
2. **`adapter` vs `adapters` 命名分歧**：server 側 `opponent` BC 使用單數，其餘 BC 使用複數；app 側 `shared` 使用複數，其餘 BC 使用單數。
3. **API 路由版本管理缺漏**：`server/api/private-room/` 未納入 `v1/` 前綴，與其他所有路由不一致。
4. **Telegram 認證叢集 BC 歸屬錯誤**：`TelegramAuthPort`、`TelegramAuthAdapter`、`TelegramSdkClient`、`useTelegram` 全部坐落在 `game-client` BC，但 Telegram 認證的語意是「身份驗證」，應屬 `identity` BC。`useTelegram` 因此流落至全域 `app/composables/`，形成更外層的邊界洩漏。

## Goals / Non-Goals

**Goals:**
- 消除所有空殘留目錄
- 統一 server 側 BC 目錄命名為 `adapters`（複數）
- 統一 app 側 BC 目錄命名為 `adapter`（單數）
- 將 `private-room` API 路由納入 `v1/` 版本前綴
- 將 Telegram 認證叢集（Port、Adapter、SdkClient、Composable）整體遷移至 `identity` BC

**Non-Goals:**
- 重構 `app/user-interface/` BC 的 domain 內容（空目錄保留問題另案處理）
- 調整任何業務邏輯或 UseCase 行為
- 修改 `server/gateway/` 的結構問題
- 改動測試檔案內容

## Decisions

### D1：`adapter` 單數 vs 複數的標準

**決策**：server 側統一用 `adapters`（複數），app 側統一用 `adapter`（單數）。

**理由**：兩側各自已有多數遵循的慣例，最小化改動量。`opponent` BC 是 server 側唯一的例外，改動範圍最小。`app/shared` 是 app 側唯一的例外，同樣如此。不引入跨側統一（兩側都改）以降低風險。

**考慮替代方案**：全域統一改為複數 → 影響 app 側所有三個 BC（`game-client`, `identity`, `user-interface`），變動面過大，不採用。

---

### D2：`private-room` 路由移入方式

**決策**：整個 `server/api/private-room/` 目錄移動至 `server/api/v1/private-room/`，並同步更新前端所有呼叫點。

**理由**：路由結構移動屬 BREAKING CHANGE，但所有前端呼叫點可一次性批量更新，無版本相容性需求（非公開 API）。

**受影響的前端呼叫點（共 3 個頁面）：**
- `app/pages/room/[roomId].vue`
- `app/pages/lobby/index.vue`
- `app/pages/game/components/MatchmakingStatusOverlay.vue`

---

### D3：Telegram 認證叢集的目標 BC

**決策**：將 `TelegramAuthPort`、`TelegramAuthAdapter`、`TelegramSdkClient`、`useTelegram` 整體移至 `identity` BC，而非 `game-client`。

**理由**：Telegram 認證的核心語意是「驗證使用者身份並取得 Player 資訊」，這正是 `identity` BC 的職責。呼叫端（`auth.global.ts`、`NavigationBar`、`PlayerProfilePopover`、`ResponsiveMenu`）皆屬於身份展示或認證流程，與遊戲邏輯無關。

「目前依賴 `game-client` Adapter」只是歷史耦合，不是歸屬依據。整體遷移後：
- `game-client/application/ports/output/index.ts` 移除 `TelegramAuthPort` export
- `app/plugins/02.telegram-webapp.client.ts` import 從 `game-client` → `identity`
- 4 個 `useTelegram` 呼叫點更新 import 路徑

**考慮替代方案**：只移動 `useTelegram` 至 `game-client/adapter/composables/` → 身份相關的呼叫端（`auth.global.ts`、`NavigationBar`）會跨 BC 依賴 `game-client`，問題換位不解決。

**遷移後的檔案位置：**
- `app/identity/application/ports/output/telegram-auth.port.ts`
- `app/identity/adapter/api/TelegramAuthAdapter.ts`
- `app/identity/adapter/telegram/TelegramSdkClient.ts`
- `app/identity/adapter/composables/useTelegram.ts`

---

### D4：空 `__tests__` 目錄處理

**決策**：直接刪除，不留任何佔位符或說明文件。

**理由**：目錄為空，刪除後對測試執行無任何影響。測試慣例已記錄在 `CLAUDE.md` 中。

## Risks / Trade-offs

- **[路由 BREAKING CHANGE]** `private-room` 路由路徑改變 → 開發環境直接測試前確認所有呼叫點已更新，且無外部系統直接呼叫此 API
- **[import 路徑更新遺漏]** `useTelegram` 或 `adapters/` 目錄重新命名後，若有 dynamic import 或字串拼接路徑未被靜態分析捕捉 → 執行 `pnpm lint` + `pnpm test:unit` 作為驗證

## Migration Plan

所有改動為本地檔案系統操作，無資料庫遷移、無 deployment 特殊步驟。

1. 刪除空目錄
2. 重新命名 `server/opponent/adapter` → `adapters`，更新所有 import
3. 重新命名 `app/shared/adapters` → `adapter`，更新所有 import
4. 移動 `server/api/private-room/` → `server/api/v1/private-room/`，更新前端呼叫路徑
5. 遷移 Telegram 認證叢集至 `identity` BC，更新所有 import 與 plugin
6. 執行 `pnpm --prefix front-end lint` 與 `pnpm --prefix front-end test:unit` 確認無回歸

**回滾**：所有改動均可透過 `git revert` 還原，無持久性副作用。

## Open Questions

- `app/user-interface/domain/` 的空子目錄（`matching`, `opponent`, `progress`, `yaku`）是否為未來功能預留骨架？若是，應加入 `.gitkeep` 說明；若非，應一併刪除。（本次暫不處理，待確認後另案）

- **`app/shared/` Adapter 依賴方向**：`ToastNotificationAdapter` 在 Shared Kernel 內直接 import `game-client/adapter/stores/uiState`，形成 Shared Kernel → BC Adapter 的依賴。正確方向應是由 BC Adapter 實作 Shared Kernel 定義的 Port，而非 Shared Kernel 自己去包裝 BC 的 store。另外 `private-room` API 的 `$fetch` 呼叫直接散落在 `app/pages/` 層，沒有對應的 Adapter 封裝（應建立 `game-client/adapter/api/PrivateRoomApiClient`）。兩者均留待下次另案處理。
