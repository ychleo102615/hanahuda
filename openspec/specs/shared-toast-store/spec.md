## ADDED Requirements

### Requirement: Toast 狀態由 Shared Kernel 持有
Toast 通知的狀態（`activeToasts`）SHALL 由 `app/shared/stores/toastStore.ts` 持有，任何 BC 均可透過此 store 發布或訂閱 toast，Shared Kernel 的 Adapter 層不得依賴任何 BC 內部的 store。

#### Scenario: 跨 BC 發布 toast
- **WHEN** 任意 BC 的 Adapter 需要顯示 toast 通知
- **THEN** 該 Adapter MUST 透過 `app/shared/stores/toastStore` 或 `ToastNotificationPort` 介面發布，不得直接 import BC 內部的 Pinia store

---

### Requirement: ToastNotificationAdapter 無跨 BC 依賴
`app/shared/adapter/ToastNotificationAdapter.ts` SHALL 僅依賴 `app/shared/` 內部的資源，不得 import 任何具體 BC 的 Adapter 層。

#### Scenario: ToastNotificationAdapter 的 import 來源
- **WHEN** 檢視 `ToastNotificationAdapter` 的 import 列表
- **THEN** 所有 import 路徑 MUST 以 `~/shared/` 或相對路徑指向 `app/shared/` 內部，無任何 `~/game-client/` 或其他 BC 路徑

---

### Requirement: Toast 狀態在重置時維持 BC 隔離
當 `game-client` BC 執行 UI 狀態重置（`uiState.reset()`）時，SHALL 同步清除 shared toastStore 中的所有 toast，以確保遊戲重連後不殘留過期通知。

#### Scenario: 遊戲重連後清除 toast
- **WHEN** `uiState.reset()` 被呼叫（通常於重連流程）
- **THEN** `toastStore.clearAllToasts()` MUST 同步執行
