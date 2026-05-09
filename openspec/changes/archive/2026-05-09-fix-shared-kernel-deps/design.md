## Context

目前有兩個架構違規：

**違規 1：Shared Kernel 反向依賴 BC Adapter**

```
app/shared/adapter/ToastNotificationAdapter
  └── import useUIStateStore  ←── game-client/adapter/stores/uiState（BC 內部）
```

`uiState` 同時管理兩種性質不同的狀態：遊戲專屬狀態（Modal、重連）與跨 BC 狀態（Toast）。Toast 狀態放在 BC 內部導致 Shared Kernel 無法獨立存在。

**違規 2：API 呼叫未封裝**

`app/pages/` 層有 3 個頁面直接呼叫 `$fetch('/api/v1/private-room/...')`，共 4 個呼叫點，沒有 Adapter 封裝，違反「pages 層不直接操作 API」的慣例。

## Goals / Non-Goals

**Goals:**
- 建立 `app/shared/stores/toastStore.ts`，移出 toast 狀態至 Shared Kernel
- 讓 `ToastNotificationAdapter` 依賴 shared toastStore，消除跨 BC import
- 建立 `PrivateRoomApiClient` 封裝 private-room API
- pages 層改為透過 `PrivateRoomApiClient` 呼叫

**Non-Goals:**
- 重構 `NotificationPort` 介面或其他 UseCase 邏輯
- 修改 toast 的 UI 顯示元件（`UnifiedToast.vue`）樣式
- 處理 `uiState` 中其他非 toast 狀態的歸屬問題

## Decisions

### D1：toast 狀態以 shared Pinia store 形式獨立

**決策**：在 `app/shared/stores/toastStore.ts` 建立 Pinia store，包含 `activeToasts`、`addToast()`、`removeToast()`、`removeToastByType()`、`clearAllToasts()`。

**理由**：toast 是跨 BC 的 UI 關切點，應由 Shared Kernel 持有狀態。Pinia store 符合現有專案慣例，且與 Vue DevTools 整合完整。

**考慮替代方案**：
- 用 Vue `provide/inject` 傳遞 toast — 需要在根元件設置，與現有 Pinia 慣例不一致，不採用
- 用 event bus — 無型別保障，不採用

---

### D2：`uiState` 的 toast 方法改為委派至 toastStore

**決策**：`uiState` 保留 `addToast()`、`removeToast()`、`removeToastByType()` 方法作為委派層，內部呼叫 `useToastStore()`，而非直接管理 `activeToasts`。

**理由**：`NotificationPortAdapter` 大量呼叫 `store.addToast()`（共 8 處），若直接移除方法需改動每一行。委派層讓 `NotificationPortAdapter` 無需修改，保持改動範圍最小化。同時 `reset()` 中的 `this.activeToasts = []` 可改為 `useToastStore().clearAllToasts()` 以維持重置行為。

**考慮替代方案**：直接修改所有 `NotificationPortAdapter` 中的呼叫 — 改動面過大，不採用。

---

### D3：`PrivateRoomApiClient` 放置於 `game-client` BC

**決策**：建立 `app/game-client/adapter/api/PrivateRoomApiClient.ts`，提供 `create()`、`join(roomId)`、`dissolve(roomId)`、`getStatus(roomId)` 四個方法。

**理由**：前端無獨立 matchmaking BC，private-room 的發起與解散由遊戲流程驅動，歸屬 `game-client` 與現有 `TelegramAuthAdapter`、`ApiErrorHandler` 的慣例一致。

**考慮替代方案**：放在 Shared Kernel — private-room 是遊戲特定概念，不屬於 Shared Kernel 的跨域職責，不採用。

---

### D4：pages 層改用 `PrivateRoomApiClient`，不引入 DI

**決策**：pages 中直接 `import { createPrivateRoomApiClient } from '~/game-client/adapter/api/PrivateRoomApiClient'`，透過 factory function 建立實例，與現有 `createToastNotificationAdapter()` 的慣例一致。不引入 DI Container。

**理由**：pages 層呼叫屬於 one-off 操作，不需要 singleton 生命週期管理。DI 只在需要共享狀態或依賴替換時才有價值。

## Risks / Trade-offs

- **[uiState 委派的隱性行為]** `reset()` 原先清除 `activeToasts`；改為呼叫 `toastStore.clearAllToasts()` 語意相同，但若重置時機與 toast 生命週期衝突，可能意外清除其他 BC 觸發的 toast → 觀察現有 reset 呼叫時機（重連後），確認行為符合預期
- **[pages 層 import 路徑跨 BC]** pages 層 import `game-client/adapter/api/PrivateRoomApiClient` 屬於已存在的慣例（多個 pages 已 import game-client 的 stores），不引入新的架構問題

## Migration Plan

1. 建立 `app/shared/stores/toastStore.ts`
2. 修改 `uiState`：移除 `activeToasts` 狀態，toast 方法改委派至 `toastStore`
3. 修改 `UnifiedToast.vue`：改從 `toastStore` 讀取 `activeToasts`
4. 修改 `ToastNotificationAdapter`：改 import `toastStore`
5. 建立 `app/game-client/adapter/api/PrivateRoomApiClient.ts`
6. 更新三個 pages 改用 `PrivateRoomApiClient`
7. 執行 `pnpm --prefix front-end lint` 與 `pnpm --prefix front-end test:unit` 驗證

回滾：所有改動可透過 `git revert` 還原，無持久性副作用。

## Open Questions

（無）
