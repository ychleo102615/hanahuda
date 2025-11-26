# Implementation Plan: UI Animation Refactor

**Branch**: `005-ui-animation-refactor` | **Date**: 2025-11-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-ui-animation-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

重構前端 UI 動畫系統，**首要任務是重構 Output Ports 架構**，將 TriggerUIEffectPort 拆分為 AnimationPort 和 NotificationPort，實現職責分離並提供可 await 的動畫 API。

在此架構基礎上，實作：獲得區卡片分組、牌堆視圖、動畫系統重構（ZoneRegistry + AnimationService）、配對成功動畫、發牌動畫、拖曳配對功能。使用 @vueuse/motion 實現流暢視覺動畫效果。

## Technical Context

**Language/Version**: TypeScript 5.9
**Primary Dependencies**: Vue 3.5, @vueuse/motion, Pinia
**Storage**: N/A（UI Layer 不處理持久化）
**Testing**: Vitest
**Target Platform**: Web Browser (Chrome, Firefox, Safari)
**Project Type**: Web application (frontend)
**Performance Goals**: 動畫 60fps、發牌動畫 2 秒內完成、配對動畫 500ms 內完成、拖曳響應 < 16ms
**Constraints**: 動畫中斷後 100ms 內恢復狀態
**Scale/Scope**: 遊戲 UI 層動畫系統，影響 CardComponent、各區域組件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture | ✅ PASS | 動畫系統位於 Adapter Layer，符合分層。ZoneRegistry 作為 Adapter 服務，不污染 Domain |
| II. Domain-Driven Development | ✅ PASS | 使用既有 Domain 概念（CardType, Card）。新增 ZoneRegistry、ZonePosition 為 Adapter 層概念 |
| III. Server Authority | ✅ PASS | 動畫系統僅處理 UI 呈現，不影響遊戲狀態。符合例外條款（UI 提示驗證） |
| IV. Command-Event Architecture | ✅ PASS | 動畫由 SSE 事件觸發（RoundDealt、CardPlayedFromHand 等），遵循事件驅動 |
| V. Test-First Development | ✅ PASS | 需為 ZoneRegistry、AnimationService 重構撰寫單元測試，覆蓋率 > 70% |
| VI. Bounded Context Isolation | ✅ PASS | 全部在 User Interface BC 內實作，不跨 BC 邊界 |
| VII. Microservice-Ready Design | ✅ PASS | 無狀態設計，動畫狀態不影響遊戲邏輯 |
| VIII. API Contract Adherence | ✅ PASS | 不修改 SSE 事件結構，僅擴展前端 UI 處理 |

**Gate Verdict**: ✅ PASS - 可進入 Phase 0 研究

## Project Structure

### Documentation (this feature)

```text
specs/005-ui-animation-refactor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
front-end/
├── src/
│   ├── user-interface/
│   │   ├── adapter/
│   │   │   ├── animation/                 # 動畫系統重構
│   │   │   │   ├── AnimationPortAdapter.ts # 實作 AnimationPort 介面
│   │   │   │   ├── ZoneRegistry.ts        # 區域位置註冊
│   │   │   │   └── types.ts               # 動畫類型定義
│   │   │   └── stores/
│   │   │       └── gameState.ts           # 獲得區分組邏輯
│   │   └── domain/
│   │       └── types.ts                   # CardType 已存在
│   └── views/
│       └── GamePage/
│           └── components/
│               ├── CardComponent.vue   # 擴展拖曳支援
│               ├── DeckZone.vue        # 新增：牌堆視圖
│               ├── DepositoryZone.vue  # 重構：分組顯示
│               └── FieldZone.vue       # 擴展位置註冊
└── tests/
    ├── adapter/
    │   └── animation/
    │       ├── AnimationPortAdapter.spec.ts
    │       └── ZoneRegistry.spec.ts
    └── unit/
```

**Structure Decision**: 在現有 front-end 結構內擴展，主要修改 Adapter Layer 的 animation 模組和 views 組件。

## Contract Changes

本功能需要重構 003-ui-application-layer 的 Output Ports 契約，將 `TriggerUIEffectPort` 拆分為更清晰的職責劃分。

### 變更內容

**原有設計**（2 個 Port）：
- `UIStatePort` - 狀態更新 + 部分 UI 邏輯混雜
- `TriggerUIEffectPort` - 動畫 + 通知 + Modal 混雜

**新設計**（3 個 Port）：
- `GameStatePort` - 純遊戲數據狀態更新
- `AnimationPort` - 動畫系統（純語意化 API，支援 await）
- `NotificationPort` - 通知/Modal/提示

### 變更理由

1. **職責分離**：動畫邏輯複雜度高，需獨立管理
2. **可等待動畫**：Use Case 可 await 動畫完成後再更新狀態
3. **更好封裝**：AnimationPortAdapter（Adapter 層實現）內部使用 ZoneRegistry 處理位置計算，Use Case 不需知道

### 影響範圍

- 修改：`specs/003-ui-application-layer/contracts/output-ports.md`
- 修改：所有 Use Case 的 Port 注入
- 新增：AnimationPort 和 NotificationPort 的 Adapter 實作
- 向後相容：原有實作可逐步遷移

詳見：`specs/005-ui-animation-refactor/contracts/output-ports-v2.md`

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無違反項目，不需要複雜度證明。
