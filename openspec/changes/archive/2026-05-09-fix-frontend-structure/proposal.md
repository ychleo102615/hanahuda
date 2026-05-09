## Why

`front-end/` 目錄存在命名不一致、空殘留目錄、API 路由版本控制缺漏，以及 BC 邊界洩漏等問題，使得新成員難以理解慣例、測試與原始碼定位混亂。這些問題在功能持續增加下會加速累積，現在修正成本最低。

## What Changes

- **刪除** `server/matchmaking/adapters/registry/__tests__/`（空目錄殘留）
- **刪除** `server/matchmaking/application/use-cases/__tests__/`（空目錄殘留）
- **移動** `tests/server/{adapters,application,domain,fixtures,mocks}/` → `tests/server/core-game/`（補齊 BC 前綴）
- **移動** `server/api/private-room/` → `server/api/v1/private-room/`（統一 API 版本路由）
- **重新命名** `server/opponent/adapter/` → `server/opponent/adapters/`（與其他 server BC 一致）
- **重新命名** `app/shared/adapters/` → `app/shared/adapter/`（與其他 app BC 一致）
- **移動** Telegram 認證叢集 → `identity` BC（詳見下方）
  - `app/game-client/application/ports/output/telegram-auth.port.ts` → `app/identity/application/ports/output/`
  - `app/game-client/adapter/api/TelegramAuthAdapter.ts` → `app/identity/adapter/api/`
  - `app/game-client/adapter/telegram/TelegramSdkClient.ts` → `app/identity/adapter/telegram/`
  - `app/composables/useTelegram.ts` → `app/identity/adapter/composables/`
- **刪除** `app/user-interface/`（整個 BC 無任何實作與引用，全部為空目錄骨架）
- **刪除** `app/stores/`（腳手架殘留 `counter.ts` 及空目錄，store 應屬 BC 的 `adapter/stores/`）

## Capabilities

### New Capabilities

（本次變更無新功能，純結構整理，不新增 spec）

### Modified Capabilities

（無 spec 層行為變更）

## Impact

- **`server/opponent/` 所有內部 import 路徑**：`adapter/` → `adapters/`
- **`app/shared/` 所有內部 import 路徑**：`adapters/` → `adapter/`
- **Telegram 認證叢集遷移**：
  - `app/game-client/application/ports/output/index.ts` 需移除 `TelegramAuthPort` 的 export
  - `app/plugins/02.telegram-webapp.client.ts` 的 import 路徑需更新（從 `game-client` → `identity`）
  - 4 個 `useTelegram` 呼叫點需更新 import 路徑
- **`server/api/private-room/` 路由**：移入 `v1/` 後，前端 API 呼叫路徑需對應更新（`/api/private-room/` → `/api/v1/private-room/`）
- **CI / 測試**：刪除空 `__tests__` 目錄不影響測試執行
- **無 API 合約破壞**（private-room 路由移動屬 **BREAKING**，需同步更新前端呼叫點）
