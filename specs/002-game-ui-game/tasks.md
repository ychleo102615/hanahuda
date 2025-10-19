# Tasks: Game-UI 與 Game-Engine BC 徹底分離

**Input**: 設計文檔來自 `/specs/002-game-ui-game/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ports.md, quickstart.md

**組織方式**: 任務按使用者故事分組,使每個故事可以獨立實施和測試。

## 格式: `[ID] [P?] [Story] 描述`
- **[P]**: 可並行執行 (不同檔案,無依賴)
- **[Story]**: 此任務所屬的使用者故事 (例如: US1, US2, US3)
- 包含確切的檔案路徑

## 路徑慣例
- **單一專案**: 專案根目錄的 `src/`, `tests/`
- 本專案為單頁應用 (SPA),路徑如下所示

---

## Phase 1: 設置 (共享基礎設施)

**目的**: 確認專案結構和基礎配置

- [x] T001 確認當前在 `002-game-ui-game` 分支並執行基準測試
- [x] T002 驗證當前測試通過率 (預期 >= 94%, 82/87 測試)
- [x] T003 [P] 執行 TypeScript 編譯檢查確認已知的 7 個跨 BC 依賴違規

---

## Phase 2: 基礎層 (阻塞前置條件)

**目的**: 核心基礎設施,在任何使用者故事實施前必須完成

**⚠️ 重要**: 所有使用者故事的工作都不能在此階段完成前開始

- [X] T004 [P] 建立 IGameStateRepository 介面在 src/game-engine/application/ports/IGameStateRepository.ts
- [X] T005 [P] 建立 Input DTOs 目錄和檔案在 src/game-engine/application/dto/GameInputDTO.ts
- [X] T006 [P] 建立 Internal DTOs 在 src/game-engine/application/dto/GameResultDTO.ts
- [X] T007 更新 LocalGameRepository 實作 IGameStateRepository 介面在 src/game-engine/infrastructure/adapters/LocalGameRepository.ts

**檢查點**: 基礎層就緒 - 使用者故事實施現在可以開始並行進行

---

## Phase 3: User Story 1 - game-engine BC 完全獨立化 (Priority: P1) 🎯 MVP

**目標**: 讓 game-engine BC 完全獨立運作,不依賴任何外部 BC 的 application 層,實現真正的領域隔離

**獨立測試**: 透過 TypeScript 編譯檢查驗證 - 檢查 `src/game-engine/` 底下所有檔案不再有 `import ... from '@/application/'` 的情況 (除了整合事件相關的 shared 部分)

### User Story 1 的實施

- [X] T008 [P] [US1] 更新 SetUpGameUseCase 移除對 @/application/ 的依賴在 src/game-engine/application/usecases/SetUpGameUseCase.ts
- [X] T009 [P] [US1] 更新 SetUpRoundUseCase 移除對 @/application/ 的依賴在 src/game-engine/application/usecases/SetUpRoundUseCase.ts
- [X] T010 [P] [US1] 更新 PlayCardUseCase 移除對 @/application/ 的依賴在 src/game-engine/application/usecases/PlayCardUseCase.ts
- [X] T011 [P] [US1] 更新 AbandonGameUseCase 移除對 @/application/ 的依賴在 src/game-engine/application/usecases/AbandonGameUseCase.ts
- [X] T012 [P] [US1] 更新 CalculateScoreUseCase 移除對 @/application/dto/ 的依賴在 src/game-engine/application/usecases/CalculateScoreUseCase.ts
- [X] T013 [P] [US1] 更新 OpponentAI 移除對 @/application/dto/ 的依賴在 src/game-engine/application/services/OpponentAI.ts
- [X] T014 [US1] 重構 GameFlowCoordinator 移除 GamePresenter 參數和所有 presenter 呼叫在 src/game-engine/application/usecases/GameFlowCoordinator.ts
- [X] T015 [US1] 確認所有整合事件 (7 種) 在 GameFlowCoordinator 中正確發布
- [X] T016 [US1] 實作 SelectMatchUseCase 處理多重配對選擇並發布 MatchSelectedEvent 在 src/game-engine/application/usecases/SelectMatchUseCase.ts
- [X] T017 [US1] 驗證 game-engine BC 邊界: 執行 `grep -r "from '@/application/'" src/game-engine/` 確認無結果
- [X] T018 [US1] 執行 TypeScript 編譯檢查確認無跨 BC 依賴錯誤
- [X] T019 [US1] 執行測試確認通過率仍 >= 94%

**檢查點**: 此時 User Story 1 應該完全功能正常且可獨立測試

---

## Phase 4: User Story 2 - game-ui BC 完整實現並接管 UI 層 (Priority: P2)

**目標**: 所有 UI 相關的程式碼都遷移到 game-ui BC 底下,並透過新的 DIContainer 配置來運作,實現 UI 關注點的完整隔離

**獨立測試**: 檢查 `src/ui/` 目錄是否已清空 (或僅剩極少數待移除檔案),以及 `src/game-ui/presentation/components/` 是否包含所有 UI components。同時檢查 GameView.vue 是否使用新的 DIContainer 配置

### User Story 2 的實施

- [X] T020 [P] [US2] 遷移 CardComponent.vue 從 src/ui/components/ 到 src/game-ui/presentation/components/CardComponent.vue 並更新 props 使用 CardDefinition
- [X] T021 [P] [US2] 遷移 GameBoard.vue 從 src/ui/components/ 到 src/game-ui/presentation/components/GameBoard.vue 並更新使用 GameViewModel
- [X] T022 [P] [US2] 遷移 PlayerHand.vue 從 src/ui/components/ 到 src/game-ui/presentation/components/PlayerHand.vue 並更新使用 PlayerViewModel
- [X] T023 [P] [US2] 遷移其他 UI components (如 YakuDisplay, ScoreBoard 等) 到 src/game-ui/presentation/components/
- [X] T024 [P] [US2] 遷移 cardAssetMapping.ts 到 src/game-ui/presentation/utils/cardAssetMapping.ts
- [X] T025 [US2] 擴展 DIContainer 新增 game-ui BC 服務鍵和註冊方法在 src/infrastructure/di/DIContainer.ts
- [X] T026 [US2] 實作 DIContainer.setupGameUIServices() 方法註冊所有 game-ui BC 元件
- [X] T027 [US2] 實作 DIContainer.createWithGameUI() 靜態工廠方法
- [X] T028 [US2] 更新 main.ts 在 app.mount 後初始化 DIContainer 並設置事件訂閱在 src/main.ts
- [X] T029 [US2] 更新 GameView.vue 使用新的 game-ui BC Controller 和 Store 在 src/game-ui/presentation/views/GameView.vue
- [X] T030 [US2] 在 main.ts 配置全局事件訂閱,連接 EventBus 與 UpdateGameViewUseCase
- [X] T031 [US2] 驗證 UI components 都已遷移: `ls src/ui/components/` 應為空或僅剩待移除檔案
- [X] T032 [US2] 驗證 GameView.vue 正確使用新的 DIContainer: TypeScript 編譯通過, Build 成功

**檢查點**: ✅ 所有 UI 已遷移到 game-ui BC,GameView.vue 使用新架構,Build 通過

---

## Phase 5: User Story 3 - 測試驗證與問題修復 (Priority: P3)

**目標**: 確保重構後所有測試仍然通過,且遊戲功能正常運作,保證程式碼品質和使用者體驗不受影響

**獨立測試**: 執行 `npm run test` 並確認通過率維持在 94% 以上,手動測試遊戲流程 (開始遊戲、出牌、回合結束、遊戲結束) 全部正常

### User Story 3 的實施

- [X] T033 [US3] 執行所有單元測試確認通過率 >= 94.3%: `npm run test:unit` - ✅ 100% 通過 (87/87)
- [X] T034 [US3] 執行 TypeScript 編譯確認無錯誤: `npm run type-check` - ✅ 編譯通過
- [X] T035 [US3] 執行 BC 邊界檢查確認無違規: `npm run lint:boundaries` - ✅ 邊界檢查通過
- [X] T036 [P] [US3] 更新受影響的測試檔案使用新的 DIContainer 配置在 tests/ 目錄 - ✅ 已完成
- [X] T037 [P] [US3] 更新受影響的測試檔案使用新的 Port 介面 (IGameStateRepository) 在 tests/ 目錄 - ✅ 修復 OpponentAI.test.ts import
- [ ] T038 [US3] 手動測試完整遊戲流程: 開始遊戲 → 玩家出牌 → AI 出牌 → 配對選擇 → 達成役種 → 來來宣言 → 回合結束 → 遊戲結束
- [ ] T039 [US3] 測試特殊場景: 多重配對選擇、配對逾時、放棄遊戲
- [ ] T040 [US3] 驗證整合事件端到端流程: 確認所有 7 種事件都正確發布和處理
- [X] T041 [US3] 修復發現的任何測試失敗或功能問題 - ✅ 修復 OpponentAI 測試 (5個)
- [X] T042 [US3] 再次執行完整測試套件確認所有問題已解決 - ✅ 所有測試通過

**檢查點**: 所有測試通過,遊戲完整功能正常運作

---

## Phase 6: User Story 4 - 刪除舊程式碼並清理專案 (Priority: P4)

**目標**: 移除所有舊的、未使用的程式碼目錄,保持專案結構清晰,避免未來的混淆和維護負擔

**獨立測試**: 檢查 `src/domain/`, `src/application/`, `src/infrastructure/repositories/`, `src/ui/` 是否已刪除,且 TypeScript 編譯仍然通過

### User Story 4 的實施

- [ ] T043 [US4] 確認所有必要檔案已從 src/domain/ 遷移到 src/game-engine/domain/
- [ ] T044 [US4] 刪除 src/domain/ 目錄
- [ ] T045 [US4] 確認所有必要的 DTOs 已遷移到 src/game-engine/application/dto/
- [ ] T046 [US4] 刪除 src/application/dto/ 目錄
- [ ] T047 [US4] 刪除 src/application/ports/presenters/ 目錄 (GamePresenter 已不再使用)
- [ ] T048 [US4] 刪除舊的 src/application/ports/repositories/GameRepository.ts (已由 IGameStateRepository 取代)
- [ ] T049 [US4] 刪除 src/application/usecases/ 目錄 (所有 UseCase 已遷移到各 BC)
- [ ] T050 [US4] 刪除 src/application/services/ 目錄 (已遷移到 game-engine BC)
- [ ] T051 [US4] 刪除 src/application/ 目錄 (如果現在是空的)
- [ ] T052 [US4] 確認所有 UI components 已遷移到 src/game-ui/presentation/components/
- [ ] T053 [US4] 刪除 src/ui/components/ 目錄
- [ ] T054 [US4] 刪除 src/ui/controllers/ 目錄 (已由 game-ui BC Controller 取代)
- [ ] T055 [US4] 刪除 src/ui/presenters/ 目錄 (已由 game-ui BC Presenter 取代)
- [ ] T056 [US4] 刪除 src/ui/stores/ 目錄 (已由 game-ui BC Store 取代)
- [ ] T057 [US4] 刪除 src/ui/views/ 目錄 (已遷移到 game-ui BC)
- [ ] T058 [US4] 刪除 src/ui/ 目錄 (如果現在是空的)
- [ ] T059 [US4] 刪除 src/infrastructure/repositories/LocalGameRepository.ts 舊實作 (已有新版本在 game-engine BC)
- [ ] T060 [US4] 保留 src/infrastructure/di/ 和 src/infrastructure/services/ (共享服務)
- [ ] T061 [US4] 執行 TypeScript 編譯確認刪除後無錯誤: `npm run type-check`
- [ ] T062 [US4] 執行測試確認刪除後通過率仍 >= 94%: `npm run test`
- [ ] T063 [US4] 執行 BC 邊界檢查確認無違規: `npm run lint:boundaries`

**檢查點**: 舊程式碼已清理,專案結構清晰,所有測試仍通過

---

## Phase 7: 完善與跨領域關注點

**目的**: 影響多個使用者故事的改進

- [ ] T064 [P] 更新專案文檔反映新的 BC 架構在 README.md 和 CLAUDE.md
- [ ] T065 [P] 驗證 quickstart.md 中的所有步驟仍然有效
- [ ] T066 程式碼清理: 移除未使用的 import 和註解
- [ ] T067 [P] 效能驗證: 執行事件延遲測試確認 < 100ms
- [ ] T068 [P] 效能驗證: 執行事件大小測試確認 < 1KB (除 GameInitializedEvent)
- [ ] T069 記憶體測試: 使用 Chrome DevTools 確認無記憶體洩漏
- [ ] T070 建立最終驗證檢查清單並逐項確認
- [ ] T071 執行完整的回歸測試 (所有測試套件)

---

## 依賴關係與執行順序

### Phase 依賴關係

- **設置 (Phase 1)**: 無依賴 - 可立即開始
- **基礎層 (Phase 2)**: 依賴設置完成 - 阻塞所有使用者故事
- **User Stories (Phase 3-6)**: 全部依賴基礎層完成
  - 使用者故事可並行進行 (如果有人力)
  - 或按優先級順序執行 (P1 → P2 → P3 → P4)
- **完善 (Phase 7)**: 依賴所有期望的使用者故事完成

### 使用者故事依賴關係

- **User Story 1 (P1)**: 可在基礎層 (Phase 2) 完成後開始 - 不依賴其他故事
- **User Story 2 (P2)**: 可在基礎層 (Phase 2) 完成後開始 - 建議在 US1 完成後再開始 (因為需要使用新的 BC 元件)
- **User Story 3 (P3)**: 依賴 US1 和 US2 完成 - 用於測試驗證
- **User Story 4 (P4)**: 依賴 US1, US2, US3 完成 - 確保所有功能正常後才清理

### 每個使用者故事內部

- 基礎層 Port 介面必須在 UseCase 更新前建立
- UseCase 更新可並行進行 (標記 [P])
- UseCase 更新必須在 GameFlowCoordinator 重構前完成
- 測試驗證必須在刪除舊程式碼前完成

### 並行機會

- Phase 1 的所有任務可並行
- Phase 2 標記 [P] 的任務可並行
- User Story 1 中標記 [P] 的 UseCase 更新可並行 (T008-T013)
- User Story 2 中標記 [P] 的元件遷移可並行 (T020-T024)
- User Story 3 中的測試更新可並行 (T036-T037)
- 如果團隊容量允許,US1 和 US2 可由不同開發者並行工作 (在基礎層完成後)

---

## 並行範例: User Story 1

```bash
# 同時啟動所有 UseCase 更新任務:
Task: "更新 SetUpGameUseCase 移除對 @/application/ 的依賴"
Task: "更新 SetUpRoundUseCase 移除對 @/application/ 的依賴"
Task: "更新 PlayCardUseCase 移除對 @/application/ 的依賴"
Task: "更新 AbandonGameUseCase 移除對 @/application/ 的依賴"
Task: "更新 CalculateScoreUseCase 移除對 @/application/dto/ 的依賴"
Task: "更新 OpponentAI 移除對 @/application/dto/ 的依賴"
```

## 並行範例: User Story 2

```bash
# 同時啟動所有元件遷移任務:
Task: "遷移 CardComponent.vue 到 src/game-ui/presentation/components/"
Task: "遷移 GameBoard.vue 到 src/game-ui/presentation/components/"
Task: "遷移 PlayerHand.vue 到 src/game-ui/presentation/components/"
Task: "遷移其他 UI components 到 src/game-ui/presentation/components/"
Task: "遷移 cardAssetMapping.ts 到 src/game-ui/presentation/utils/"
```

---

## 實施策略

### MVP 優先 (僅 User Story 1)

1. 完成 Phase 1: 設置
2. 完成 Phase 2: 基礎層 (重要 - 阻塞所有故事)
3. 完成 Phase 3: User Story 1
4. **停止並驗證**: 獨立測試 User Story 1
5. 如果準備好可部署/展示

### 漸進式交付

1. 完成設置 + 基礎層 → 基礎就緒
2. 新增 User Story 1 → 獨立測試 → 部署/展示 (MVP!)
3. 新增 User Story 2 → 獨立測試 → 部署/展示
4. 新增 User Story 3 → 獨立測試 → 部署/展示
5. 新增 User Story 4 → 獨立測試 → 部署/展示
6. 每個故事都在不破壞先前故事的情況下增加價值

### 並行團隊策略

若有多位開發者:

1. 團隊一起完成設置 + 基礎層
2. 基礎層完成後:
   - 開發者 A: User Story 1
   - 開發者 B: User Story 2 (在 US1 完成後開始,或同時進行但需協調)
   - 開發者 C: 準備測試環境和測試計畫 (US3)
3. 故事獨立完成並整合

---

## 備註

- [P] 任務 = 不同檔案,無依賴
- [Story] 標籤將任務映射到特定使用者故事以便追溯
- 每個使用者故事應該可獨立完成和測試
- 在任何檢查點停止以獨立驗證故事
- 每個任務或邏輯群組後提交
- 避免: 模糊任務、相同檔案衝突、破壞獨立性的跨故事依賴

---

## 總結

- **總任務數**: 71 個任務
- **User Story 1 任務數**: 12 個任務 (T008-T019)
- **User Story 2 任務數**: 13 個任務 (T020-T032)
- **User Story 3 任務數**: 10 個任務 (T033-T042)
- **User Story 4 任務數**: 21 個任務 (T043-T063)
- **並行機會**:
  - Phase 2 基礎層: 4 個任務可並行
  - User Story 1: 6 個 UseCase 更新可並行
  - User Story 2: 5 個元件遷移可並行
  - User Story 3: 2 個測試更新可並行
- **獨立測試標準**: 每個故事都有明確的驗證標準
- **建議 MVP 範圍**: User Story 1 (game-engine BC 獨立化)

**格式驗證**: ✅ 所有任務都遵循檢查清單格式 (checkbox, ID, 標籤, 檔案路徑)
