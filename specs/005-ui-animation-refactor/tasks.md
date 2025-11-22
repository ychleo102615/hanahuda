# Tasks: UI Animation Refactor

**Input**: Design documents from `/specs/005-ui-animation-refactor/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: 根據 spec.md 和 plan.md，需為動畫系統撰寫單元測試（Constitution Check: 覆蓋率 > 70%）

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Front-end**: `front-end/src/`, `front-end/tests/`
- Adapter Layer: `front-end/src/user-interface/adapter/`
- Application Layer: `front-end/src/user-interface/application/`
- Views: `front-end/src/views/GamePage/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and environment verification

- [x] T001 確認 @vueuse/motion 已安裝，執行 `npm list @vueuse/motion` 驗證
- [x] T002 [P] 確認專案可編譯，執行 `npm run type-check` 驗證無錯誤

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] 定義 ZoneName 類型在 front-end/src/user-interface/adapter/animation/types.ts
- [x] T004 [P] 定義 Position、ZonePosition 類型在 front-end/src/user-interface/adapter/animation/types.ts
- [x] T005 [P] 定義 AnimationType 擴展類型在 front-end/src/user-interface/adapter/animation/types.ts
- [x] T006 [P] 定義 CardMoveParams、CardMergeParams、CardsToDepositoryParams 在 front-end/src/user-interface/adapter/animation/types.ts
- [x] T007 定義 DealAnimationParams 類型在 front-end/src/user-interface/adapter/animation/types.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 獲得區牌種分組顯示 (Priority: P1) 🎯 MVP

**Goal**: 玩家能在獲得區看到卡片按類型分組（光牌、種牌、短冊、かす），快速評估役種進度

**Independent Test**: 透過觀察獲得區顯示驗證分組邏輯和視覺呈現，無需動畫功能

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] 單元測試 getCardTypeFromId + groupByCardType 在 front-end/tests/domain/card-logic.test.ts
- [ ] T009 [P] [US1] 組件測試 DepositoryZone 分組顯示在 front-end/tests/views/DepositoryZone.spec.ts

### Implementation for User Story 1

- [x] T010 [P] [US1] 定義 GroupedDepository 類型在 front-end/src/user-interface/domain/types.ts
- [x] T011 [US1] 實作 getCardTypeFromId + groupByCardType 在 front-end/src/user-interface/domain/card-logic.ts
- [x] T012 [US1] 新增 groupedMyDepository computed 在 front-end/src/user-interface/adapter/stores/gameState.ts
- [x] T013 [US1] 新增 groupedOpponentDepository computed 在 front-end/src/user-interface/adapter/stores/gameState.ts
- [x] T014 [US1] 重構 PlayerDepositoryZone.vue 使用分組資料
- [x] T015 [US1] 重構 OpponentDepositoryZone.vue 使用分組資料
- [x] T016 [US1] 實作空分組佔位顯示

**Checkpoint**: User Story 1 fully functional - 獲得區按四種類型分組顯示，空分組保持佔位

---

## Phase 4: User Story 2 - Output Ports 重構 (Priority: P2)

**Goal**: 重構 Application Layer Output Ports，將 TriggerUIEffectPort 拆分為 AnimationPort + NotificationPort

**Independent Test**: 透過單元測試驗證 Port 介面定義和 DI 註冊

### Tests for User Story 2 ⚠️

- [x] T017 [P] [US2] 單元測試 AnimationPort 介面在 front-end/tests/adapter/animation/AnimationPort.spec.ts
- [x] T018 [P] [US2] 單元測試 NotificationPort 介面在 front-end/tests/adapter/notification/NotificationPort.spec.ts
- [x] T019 [P] [US2] 單元測試 GameStatePort 介面在 front-end/tests/adapter/stores/GameStatePort.spec.ts

### Implementation for User Story 2

- [x] T020 [P] [US2] 定義 AnimationPort 介面在 front-end/src/user-interface/application/ports/output/animation.port.ts
- [x] T021 [P] [US2] 定義 NotificationPort 介面在 front-end/src/user-interface/application/ports/output/notification.port.ts
- [x] T022 [P] [US2] 定義 GameStatePort 介面在 front-end/src/user-interface/application/ports/output/game-state.port.ts
- [x] T023 [US2] 更新 output ports barrel export 在 front-end/src/user-interface/application/ports/output/index.ts
- [x] T024 [US2] 新增 AnimationPort、NotificationPort、GameStatePort tokens 在 front-end/src/user-interface/adapter/di/tokens.ts
- [x] T025 [US2] 實作 NotificationPortAdapter 在 front-end/src/user-interface/adapter/notification/NotificationPortAdapter.ts
- [x] T026 [US2] 實作 AnimationPortAdapter 骨架（不含 registerZone，僅 stub 動畫方法和 interrupt/isAnimating）在 front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts
- [x] T027 [US2] 更新 DI Container 註冊新 Ports 在 front-end/src/user-interface/adapter/di/registry.ts
- [x] T028 [US2] 標記 TriggerUIEffectPort 為 @deprecated 在 front-end/src/user-interface/application/ports/output/trigger-ui-effect.port.ts
- [x] T029 [US2] 新 Ports 已註冊可用，Use Cases 遷移將在後續 Phase 逐步進行（漸進遷移策略）

**Checkpoint**: User Story 2 fully functional - 新 Port 介面定義完成，DI 註冊正確，編譯無錯誤

---

## Phase 5: User Story 3 - 牌堆視圖 (Priority: P3)

**Goal**: 顯示牌堆組件和剩餘牌數，作為發牌動畫的視覺起點

**Independent Test**: 開始新回合並觀察牌堆顯示，無需完整動畫功能

### Tests for User Story 3 ⚠️

- [x] T030 [P] [US3] 組件測試 DeckZone 剩餘牌數顯示在 front-end/tests/views/DeckZone.spec.ts
- [x] T031 [P] [US3] 組件測試 DeckZone 視覺堆疊效果在 front-end/tests/views/DeckZone.spec.ts

### Implementation for User Story 3

- [x] T032 [P] [US3] 新增 visualLayers getter 在 front-end/src/user-interface/adapter/stores/gameState.ts（整合於 GameStateStore）
- [x] T033 [US3] 建立 DeckZone.vue 組件在 front-end/src/views/GamePage/components/DeckZone.vue
- [x] T034 [US3] 實作牌堆視覺堆疊效果（3-4 層偏移）在 front-end/src/views/GamePage/components/DeckZone.vue
- [x] T035 [US3] 實作剩餘牌數顯示在 front-end/src/views/GamePage/components/DeckZone.vue
- [x] T036 [US3] 整合 DeckZone 到 GamePage.vue（場牌區右側）在 front-end/src/views/GamePage/GamePage.vue

**Checkpoint**: User Story 3 fully functional - 牌堆組件顯示，剩餘牌數即時更新

---

## Phase 6: User Story 4 - 動畫系統重構 (Priority: P4)

**Goal**: 重構 AnimationService，實作 AnimationPort 介面，支援位置追蹤和實際視覺動畫

**Independent Test**: 透過單元測試驗證位置追蹤和動畫參數計算

### Tests for User Story 4 ⚠️

- [x] T037 [P] [US4] 單元測試 ZoneRegistry register/unregister 在 front-end/tests/adapter/animation/ZoneRegistry.spec.ts
- [x] T038 [P] [US4] 單元測試 ZoneRegistry getPosition/getCardPosition 在 front-end/tests/adapter/animation/ZoneRegistry.spec.ts
- [x] T039 [P] [US4] 單元測試 AnimationService interrupt 機制在 front-end/tests/adapter/animation/AnimationService.spec.ts
- [x] T040 [P] [US4] 單元測試 AnimationPortAdapter isAnimating 狀態在 front-end/tests/adapter/animation/AnimationPortAdapter.spec.ts

### Implementation for User Story 4

- [x] T041 [US4] 實作 ZoneRegistry 類別在 front-end/src/user-interface/adapter/animation/ZoneRegistry.ts
- [x] T042 [US4] 實作 ZoneRegistry.register 使用 ResizeObserver 在 front-end/src/user-interface/adapter/animation/ZoneRegistry.ts
- [x] T043 [US4] 實作 ZoneRegistry.getPosition 和 getCardPosition 在 front-end/src/user-interface/adapter/animation/ZoneRegistry.ts
- [x] T044 [US4] 實作 ZoneRegistry.dispose 清理所有 observers 在 front-end/src/user-interface/adapter/animation/ZoneRegistry.ts
- [x] T045 [US4] 重構 AnimationService 使用 ZoneRegistry 在 front-end/src/user-interface/adapter/animation/AnimationService.ts
- [x] T046 [US4] 實作 useZoneRegistration composable（自動 register/unregister）在 front-end/src/user-interface/adapter/composables/useZoneRegistration.ts
- [x] T047 [US4] 實作 AnimationPortAdapter.interrupt 方法在 front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts
- [x] T048 [US4] 實作 AnimationPortAdapter.isAnimating 方法在 front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts
- [x] T049 [US4] 更新各區域組件使用 useZoneRegistration composable 註冊區域位置（FieldZone、HandZone、DepositoryZone、DeckZone）

**Checkpoint**: User Story 4 fully functional - 區域位置可追蹤，AnimationPort 基礎實作完成

---

## Phase 7: User Story 5 - 配對成功卡片移動動畫 (Priority: P5)

**Goal**: 配對成功時，卡片從場牌/手牌區飛向獲得區的動畫

**Independent Test**: 執行配對操作並觀察卡片移動動畫

### Tests for User Story 5 ⚠️

- [x] T050 [P] [US5] 單元測試 playCardToFieldAnimation 在 front-end/tests/adapter/animation/AnimationPortAdapter.spec.ts
- [x] T050b [P] [US5] 單元測試 playMatchAnimation Promise resolve 在 front-end/tests/adapter/animation/AnimationPortAdapter.spec.ts
- [x] T051 [P] [US5] 單元測試 playToDepositoryAnimation 在 front-end/tests/adapter/animation/AnimationPortAdapter.spec.ts

### Implementation for User Story 5

- [x] T052 [US5] 實作 AnimationPortAdapter.playCardToFieldAnimation（手牌→場牌位置）在 front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts
- [x] T053 [US5] 實作 AnimationPortAdapter.playMatchAnimation（合併特效：縮放+發光，無移動）在 front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts
- [x] T054 [US5] 實作 AnimationPortAdapter.playToDepositoryAnimation（合併後→獲得區）在 front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts
- [x] T055 [US5] 整合配對動畫到 HandleCardsMatchedUseCase 或相關 Use Case
- [x] T056 [US5] 確保動畫進行中阻止玩家操作（isAnimating 狀態）

**Checkpoint**: User Story 5 fully functional - 配對動畫流暢，完成後狀態正確更新

---

## Phase 8: User Story 6 - 發牌動畫 (Priority: P6)

**Goal**: 回合開始時，從牌堆發牌至場牌和手牌的動畫

**Independent Test**: 開始新回合並觀察發牌過程

### Tests for User Story 6 ⚠️

- [x] T057 [P] [US6] 單元測試 playDealAnimation 時序（16 張牌 < 2 秒）在 front-end/tests/adapter/animation/AnimationPortAdapter.spec.ts
- [x] T058 [P] [US6] 單元測試 playDealAnimation 中斷機制在 front-end/tests/adapter/animation/AnimationPortAdapter.spec.ts

### Implementation for User Story 6

- [x] T059 [US6] 實作 AnimationPortAdapter.playDealAnimation（牌堆→場牌→手牌）在 front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts
- [x] T060 [US6] 實作 playFlipFromDeckAnimation（翻牌階段單張翻牌）在 front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts
- [x] T061 [US6] 實作發牌 staggered 時序控制（每張 100ms 延遲）在 front-end/src/user-interface/adapter/animation/AnimationPortAdapter.ts
- [x] T062 [US6] 整合發牌動畫到 HandleRoundDealtUseCase
- [x] T063 [US6] 確保發牌動畫支援中斷（重連時直接顯示最終狀態）

**Checkpoint**: User Story 6 fully functional - 發牌動畫依序播放，總時長 < 2 秒

---

## Phase 9: User Story 7 - 拖曳手牌配對功能 (Priority: P7)

**Goal**: 玩家可拖曳手牌到場牌進行配對，提供更直覺的操作方式

**Independent Test**: 拖曳手牌至場牌並觀察配對結果

### Tests for User Story 7 ⚠️

- [ ] T064 [P] [US7] 組件測試 CardComponent 拖曳啟動在 front-end/tests/views/CardComponent.spec.ts
- [ ] T065 [P] [US7] 組件測試 FieldZone drop target 高亮在 front-end/tests/views/FieldZone.spec.ts

### Implementation for User Story 7

- [ ] T066 [P] [US7] 定義 DragState、DropTarget、DragEventPayload 類型在 front-end/src/user-interface/adapter/animation/types.ts
- [ ] T067 [US7] 擴展 CardComponent.vue 支援 draggable 屬性在 front-end/src/views/GamePage/components/CardComponent.vue
- [ ] T068 [US7] 實作拖曳中視覺效果（opacity 0.8, scale 1.1）在 front-end/src/views/GamePage/components/CardComponent.vue
- [ ] T069 [US7] 擴展 FieldZone.vue 作為 drop target 在 front-end/src/views/GamePage/components/FieldZone.vue
- [ ] T070 [US7] 實作可配對場牌高亮效果在 front-end/src/views/GamePage/components/FieldZone.vue
- [ ] T071 [US7] 實作拖曳放置邏輯（有效→配對，無效→返回原位）
- [ ] T072 [US7] 整合拖曳配對到 PlayHandCardUseCase
- [ ] T073 [US7] 確保點擊配對功能仍正常運作

**Checkpoint**: User Story 7 fully functional - 可拖曳手牌配對，高亮可配對目標，點擊配對仍可用

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T074 [P] 驗證所有動畫 60fps 效能（Chrome DevTools Performance）
- [ ] T075 [P] 驗證動畫中斷後 100ms 內恢復狀態
- [ ] T076 [P] 移除 TriggerUIEffectPort deprecated 程式碼（若所有 Use Case 已遷移）
- [ ] T077 執行 quickstart.md 驗證清單

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - **US1 (P1)**: No dependencies on other stories - **MVP**
  - **US2 (P2)**: No dependencies on other stories
  - **US3 (P3)**: No dependencies on other stories
  - **US4 (P4)**: Depends on US2 (needs AnimationPort interface)
  - **US5 (P5)**: Depends on US4 (needs ZoneRegistry + AnimationService refactor)
  - **US6 (P6)**: Depends on US3 (needs DeckZone) + US4 (needs AnimationService)
  - **US7 (P7)**: Depends on US4 (needs animation infrastructure)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies Graph

```
[Phase 2: Foundational]
         │
         ▼
    ┌────┴────┐
    ▼         ▼
  [US1]    [US2]─────┬─────[US3]
    │         │      │       │
    │         ▼      │       │
    │      [US4]◄────┘       │
    │         │              │
    │    ┌────┼────┐         │
    │    ▼    ▼    ▼         │
    │  [US5][US7] [US6]◄─────┘
    │
    ▼
 [MVP Ready]
```

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Types/interfaces before implementation
- Core logic before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundational)**:
```bash
# All type definitions can run in parallel:
Task: T003 - Define ZoneName type
Task: T004 - Define Position, ZonePosition types
Task: T005 - Define AnimationType extended types
Task: T006 - Define CardMoveParams, CardMergeParams, CardsToDepositoryParams
```

**Phase 3 (US1)**:
```bash
# Tests can run in parallel:
Task: T008 - Unit test groupByCardType
Task: T009 - Component test DepositoryZone
```

**Phase 4 (US2)**:
```bash
# Port definitions can run in parallel:
Task: T020 - Define AnimationPort interface
Task: T021 - Define NotificationPort interface
Task: T022 - Define GameStatePort interface
```

**Phase 6 (US4)**:
```bash
# ZoneRegistry tests can run in parallel:
Task: T037 - Test ZoneRegistry register/unregister
Task: T038 - Test ZoneRegistry getPosition/getCardPosition
Task: T039 - Test AnimationService interrupt
Task: T040 - Test AnimationPortAdapter isAnimating
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (type definitions)
3. Complete Phase 3: User Story 1 (獲得區分組)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (獲得區分組) → Test → Deploy (MVP!)
3. Add US2 (Output Ports 重構) → Test → Enables animation infrastructure
4. Add US3 (牌堆視圖) → Test → Visual enhancement
5. Add US4 (動畫系統重構) → Test → Animation foundation ready
6. Add US5 (配對動畫) → Test → Better UX
7. Add US6 (發牌動畫) → Test → Immersive experience
8. Add US7 (拖曳配對) → Test → Advanced interaction

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (獲得區分組) → US5 (配對動畫)
   - Developer B: US2 (Ports 重構) → US4 (動畫系統) → US7 (拖曳)
   - Developer C: US3 (牌堆視圖) → US6 (發牌動畫)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Performance goals: 60fps animations, < 2s deal animation, < 500ms match animation
