# Implementation Plan: 事件時間倒數功能

**Branch**: `006-event-countdown-timer` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-event-countdown-timer/spec.md`

## Summary

為遊戲事件協定新增時間倒數功能，讓玩家知道可操作的剩餘時間。主要工作包含：

1. **協議擴展**：為 8 個事件新增 `action_timeout_seconds` 欄位，為 3 個回合結束事件新增 `display_timeout_seconds` 欄位
2. **狀態管理**：在 UIStateStore 中新增倒數時限狀態（`actionTimeoutRemaining`, `displayTimeoutRemaining`）
3. **UI 組件**：在頂部資訊列、決策面板、回合結束面板中顯示倒數計時
4. **視覺回饋**：低於 5 秒時顯示警示色（`text-red-500`）

## Technical Context

**Language/Version**: TypeScript 5.9 + Vue 3.5
**Primary Dependencies**: Vue 3, Pinia, @vueuse/motion
**Storage**: N/A（前端功能，狀態由 Pinia store 管理）
**Testing**: Vitest 3.2.4 (jsdom environment)
**Target Platform**: 現代瀏覽器（支援 SSE）
**Project Type**: Web application (前端 SPA)
**Performance Goals**: 倒數計時顯示精度 ±2 秒（考慮網路延遲），60fps 動畫
**Constraints**: 倒數計時器需能正確響應事件更新、頁面重連後恢復
**Scale/Scope**: User Interface BC 內的功能擴展，影響約 10 個檔案

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0 Gate)

| 原則 | 狀態 | 說明 |
|------|------|------|
| **I. Clean Architecture** | ✅ PASS | 倒數狀態屬於 Adapter Layer (UI 狀態管理)，不涉及 Domain 層 |
| **II. Domain-Driven Development** | ✅ PASS | 新增 ActionTimeout / DisplayTimeout Value Objects 使用領域語言 |
| **III. Server Authority** | ✅ PASS | 時限由伺服器決定並透過事件傳遞，客戶端僅顯示 |
| **IV. Command-Event Architecture** | ✅ PASS | 時限資訊透過 SSE 事件傳遞，符合既有模式 |
| **V. Test-First Development** | ⏳ PENDING | 將在實作階段遵循 TDD |
| **VI. Bounded Context Isolation** | ✅ PASS | 功能在 User Interface BC 內，不跨越邊界 |
| **VII. Microservice-Ready Design** | ✅ PASS | 使用事件傳遞時限，無狀態依賴 |
| **VIII. API Contract Adherence** | ⏳ PENDING | 需更新 protocol.md 規格 |

**Gate Result**: ✅ PASS - 可進入 Phase 0 研究

---

### Post-Design Check (Phase 1 Completion)

| 原則 | 狀態 | 說明 |
|------|------|------|
| **I. Clean Architecture** | ✅ PASS | 設計確認：事件型別在 Application Types，倒數邏輯在 Adapter (UIStateStore + composable)，UI 在 Views |
| **II. Domain-Driven Development** | ✅ PASS | 使用 `action_timeout_seconds` / `display_timeout_seconds` 作為領域語言欄位名稱 |
| **III. Server Authority** | ✅ PASS | 所有時限值由後端事件傳遞，前端僅本地遞減顯示 |
| **IV. Command-Event Architecture** | ✅ PASS | 透過 optional 欄位擴展既有 SSE 事件，向後兼容 |
| **V. Test-First Development** | ⏳ READY | 測試策略已定義於 quickstart.md，將在實作時執行 TDD |
| **VI. Bounded Context Isolation** | ✅ PASS | 所有變更限於 User Interface BC，使用 Port 介面隔離 |
| **VII. Microservice-Ready Design** | ✅ PASS | 無新增狀態依賴，時限透過事件傳遞 |
| **VIII. API Contract Adherence** | ✅ PASS | contracts/protocol-updates.md 已定義所有協議變更 |

**Gate Result**: ✅ PASS - 設計完成，可進入 Phase 2 (tasks 生成)

## Project Structure

### Documentation (this feature)

```text
specs/006-event-countdown-timer/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
front-end/src/user-interface/
├── domain/                          # Domain Layer - 不需修改
├── application/
│   └── types/
│       └── events.ts                # 修改: 新增 action_timeout_seconds / display_timeout_seconds 欄位
├── adapter/
│   ├── stores/
│   │   └── uiState.ts               # 修改: 新增 timeout 相關狀態和 actions
│   └── composables/
│       └── useCountdown.ts          # 新增: 倒數計時 composable

front-end/src/views/GamePage/components/
├── TopInfoBar.vue                   # 修改: 顯示回合操作倒數
├── DecisionModal.vue                # 修改: 顯示決策倒數 (若存在)
└── RoundEndPanel.vue                # 新增/修改: 顯示下一回合倒數

front-end/tests/
├── adapter/
│   ├── stores/uiState.spec.ts       # 修改: 測試 timeout 狀態管理
│   └── composables/useCountdown.spec.ts  # 新增: 測試倒數計時邏輯
└── views/
    └── countdown.spec.ts            # 新增: 測試 UI 倒數顯示

doc/shared/
└── protocol.md                      # 修改: 更新事件規格
```

**Structure Decision**: 採用現有 Clean Architecture 結構，在 User Interface BC 的 Adapter Layer 新增倒數計時功能。遵循既有的分層模式：
- **Application Types**: 擴展事件型別定義
- **Adapter Stores**: 管理倒數狀態
- **Adapter Composables**: 封裝倒數計時邏輯
- **Views Components**: 顯示倒數 UI

## Complexity Tracking

> **無憲法違規需要證明**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
