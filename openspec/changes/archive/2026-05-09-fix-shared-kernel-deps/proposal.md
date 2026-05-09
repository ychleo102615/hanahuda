## Why

Shared Kernel（`app/shared/`）目前存在兩個架構違規：`ToastNotificationAdapter` 反向依賴 `game-client` BC 的內部 store，而 private-room API 呼叫散落在 `app/pages/` 層而非封裝於 Adapter。兩者皆為已知技術債，導致跨 BC 邊界的隱性耦合，阻礙後續維護。

## What Changes

- **將 toast 狀態從 `game-client/adapter/stores/uiState` 抽出**，建立 `app/shared/stores/toastStore.ts`（shared Pinia store），`ToastNotificationAdapter` 改為依賴此 shared store
- **建立 `app/game-client/adapter/api/PrivateRoomApiClient.ts`**，集中封裝所有 private-room HTTP 呼叫（`create`、`join`、`dissolve`、`getStatus`）
- **更新 pages 層**：`lobby/index.vue`、`room/[roomId].vue`、`game/components/MatchmakingStatusOverlay.vue` 改用 `PrivateRoomApiClient`，移除直接 `$fetch` 呼叫
- **更新 `NotificationPortAdapter`**：toast 操作改為依賴 shared toastStore 而非 uiState 內的 toast 方法
- **更新 `UnifiedToast.vue`**：改從 shared toastStore 讀取 `activeToasts`

## Capabilities

### New Capabilities

- `shared-toast-store`: Shared Kernel 的 toast 狀態管理，提供跨 BC 統一的 toast 發布與訂閱介面

### Modified Capabilities

- `structure-conventions`: private-room API 呼叫現在應透過 Adapter 層封裝，而非直接在 pages 層使用 `$fetch`

## Impact

- `app/shared/stores/toastStore.ts`（新增）
- `app/shared/adapter/ToastNotificationAdapter.ts`（修改 import）
- `app/game-client/adapter/stores/uiState.ts`（移除 toast 相關狀態與方法）
- `app/game-client/adapter/notification/NotificationPortAdapter.ts`（修改 toast 操作改用 toastStore）
- `app/game-client/adapter/api/PrivateRoomApiClient.ts`（新增）
- `app/components/UnifiedToast.vue`（修改 store 來源）
- `app/pages/lobby/index.vue`（修改）
- `app/pages/room/[roomId].vue`（修改）
- `app/pages/game/components/MatchmakingStatusOverlay.vue`（修改）
