## 1. 建立 shared toastStore

- [x] 1.1 建立 `app/shared/stores/toastStore.ts`，包含 `ToastType`、`ToastData` 型別、`activeToasts` 狀態，以及 `addToast()`、`removeToast()`、`removeToastByType()`、`clearAllToasts()` 方法，邏輯與現有 `uiState` 中的 toast 實作相同
- [x] 1.2 在 `app/shared/stores/index.ts`（若不存在則新增）export `useToastStore`

## 2. 修改 uiState — 移除 toast 狀態，改為委派

- [x] 2.1 從 `uiState` 的 state 定義中移除 `activeToasts: ToastData[]`
- [x] 2.2 從 `uiState` 的 interface 中移除 `addToast`、`removeToast`、`removeToastByType`、`clearAllToasts` 方法簽名
- [x] 2.3 在 `uiState` 的 actions 中，將 `addToast()`、`removeToast()`、`removeToastByType()`、`clearAllToasts()` 實作改為委派至 `useToastStore()`（實際執行：完全移除 toast actions，NotificationPortAdapter 改直接使用 toastStore）
- [x] 2.4 在 `uiState` 的 `reset()` 中，將 `this.activeToasts = []` 改為 `useToastStore().clearAllToasts()`
- [x] 2.5 移除 `uiState` 中 `ToastType`、`ToastData` 的本地定義（或改為從 `~/shared/stores/toastStore` re-export 以維持向後相容）

## 3. 修改 ToastNotificationAdapter

- [x] 3.1 將 `app/shared/adapter/ToastNotificationAdapter.ts` 中的 `import { useUIStateStore } from '~/game-client/adapter/stores/uiState'` 改為 `import { useToastStore } from '~/shared/stores/toastStore'`
- [x] 3.2 更新 `addToast()` 實作改用 `useToastStore()`

## 4. 修改 UnifiedToast.vue

- [x] 4.1 將 `app/components/UnifiedToast.vue` 中的 `useUIStateStore()` 改為 `useToastStore()`，`activeToasts` 來源改為 shared toastStore

## 5. 建立 PrivateRoomApiClient

- [x] 5.1 建立 `app/game-client/adapter/api/PrivateRoomApiClient.ts`，提供以下方法：
  - `create(options)` → POST `/api/v1/private-room/create`
  - `join(roomId, options)` → POST `/api/v1/private-room/{roomId}/join`
  - `dissolve(roomId)` → DELETE（或 POST）`/api/v1/private-room/{roomId}/dissolve`
  - `getStatus(roomId)` → GET `/api/v1/private-room/{roomId}/status`
- [x] 5.2 提供 `createPrivateRoomApiClient()` factory function

## 6. 更新 pages 層改用 PrivateRoomApiClient

- [x] 6.1 更新 `app/pages/lobby/index.vue`：將 `$fetch('/api/v1/private-room/create', ...)` 與 `$fetch('/api/v1/private-room/${roomId}/join', ...)` 改為透過 `PrivateRoomApiClient`
- [x] 6.2 更新 `app/pages/room/[roomId].vue`：將 `$fetch('/api/v1/private-room/${roomId}/join', ...)` 改為透過 `PrivateRoomApiClient`
- [x] 6.3 更新 `app/pages/game/components/MatchmakingStatusOverlay.vue`：將 `$fetch('/api/v1/private-room/${roomId}/dissolve', ...)` 改為透過 `PrivateRoomApiClient`

## 7. 更新 pages 層的 toast 呼叫（選擇性）

- [x] 7.1 評估 `app/pages/index.vue`、`app/pages/lobby/index.vue`、`app/pages/room/[roomId].vue`、`app/pages/game/components/MatchmakingStatusOverlay.vue` 中直接呼叫 `uiStore.addToast()` 的地方：若委派層仍可運作則保持不動，若需直接呼叫 `toastStore` 則更新 import

## 8. 驗證

- [x] 8.1 執行 `pnpm --prefix front-end lint` 確認無 import 錯誤
- [x] 8.2 執行 `pnpm --prefix front-end test:unit` 確認所有測試通過
- [x] 8.3 確認 `ToastNotificationAdapter` 的 import 列表中無任何 `~/game-client/` 路徑
