# Tasks: Game UI-Engine 分離架構

**Input**: 設計文件來自 `/specs/001-game-ui-game/`
**Prerequisites**: plan.md (已完成), spec.md (已完成), data-model.md (已完成), contracts/ (已完成), research.md (已完成), quickstart.md (已完成)

**Organisation**: 任務按照使用者故事分組，使每個故事能夠獨立實作和測試。

## 格式: `[ID] [P?] [Story] 描述`
- **[P]**: 可以平行執行（不同檔案，無依賴關係）
- **[Story]**: 此任務屬於的使用者故事（例如 US1, US2, US3）
- 描述中包含確切的檔案路徑

## 路徑慣例
- **單一專案**: 儲存庫根目錄下的 `src/`, `tests/`
- 根據 plan.md 結構，採用 Bounded Context 分離架構

---

## Phase 1: 設置（共享基礎設施）

**目的**: 專案初始化和基本結構建立

- [x] T001 建立 Bounded Context 目錄結構 src/game-engine/, src/game-ui/, src/shared/
- [x] T002 [P] 配置 TypeScript 路徑映射支援 @game-engine/*, @game-ui/*, @shared/* 別名
- [x] T003 [P] 配置 ESLint 邊界檢查規則防止跨 BC 依賴在 eslint.config.ts
- [x] T004 [P] 新增 npm 腳本 lint:boundaries 在 package.json
- [x] T005 建立邊界檢查腳本 .specify/scripts/check-bc-boundaries.js

---

## Phase 2: 基礎（阻塞性前置條件）

**目的**: 所有使用者故事實作前必須完成的核心基礎設施

**⚠️ 關鍵**: 在此階段完成前，無法開始任何使用者故事的工作

- [x] T006 定義整合事件基礎介面 src/shared/events/base/IntegrationEvent.ts
- [x] T007 [P] 定義嵌套數據結構 src/shared/events/base/YakuResult.ts
- [x] T008 [P] 定義嵌套數據結構 src/shared/events/base/MatchResult.ts
- [x] T009 [P] 定義嵌套數據結構 src/shared/events/base/TurnTransition.ts
- [x] T010 [P] 定義 GameInitializedEvent 介面 src/shared/events/game/GameInitializedEvent.ts
- [x] T011 [P] 定義 CardPlayedEvent 介面 src/shared/events/game/CardPlayedEvent.ts
- [x] T012 [P] 定義 MatchSelectedEvent 介面 src/shared/events/game/MatchSelectedEvent.ts
- [x] T013 [P] 定義 KoikoiDeclaredEvent 介面 src/shared/events/game/KoikoiDeclaredEvent.ts
- [x] T014 [P] 定義 RoundEndedEvent 介面 src/shared/events/game/RoundEndedEvent.ts
- [x] T015 [P] 定義 GameEndedEvent 介面 src/shared/events/game/GameEndedEvent.ts
- [x] T016 [P] 定義 GameAbandonedEvent 介面 src/shared/events/game/GameAbandonedEvent.ts
- [x] T017 定義事件發布者介面 src/shared/events/ports/IEventPublisher.ts
- [x] T018 [P] 定義事件訂閱者介面 src/shared/events/ports/IEventSubscriber.ts
- [x] T019 [P] 定義事件匯流排介面 src/shared/events/ports/IEventBus.ts
- [x] T020 實作事件日誌記錄器 src/shared/events/base/EventLogger.ts
- [x] T021 實作記憶體內事件匯流排 src/shared/events/base/EventBus.ts
- [x] T022 [P] 定義花牌配對服務介面 src/shared/services/ICardMatchingService.ts
- [x] T023 [P] 建立共享常數定義 src/shared/constants/GameConstants.ts

**檢查點**: 基礎設施就緒 - 現在可以開始平行實作使用者故事

---

## Phase 3: 使用者故事 1 - 玩家開始新遊戲並正常遊玩 (Priority: P1) 🎯 MVP

**目標**: 建立核心遊戲流程，玩家可以開始新遊戲、出牌、與場上牌配對、捕獲卡牌，並在湊成役種時選擇是否 Koi-Koi

**獨立測試**: 啟動新遊戲、完成至少一輪出牌、查看捕獲的卡牌來驗證 game-engine 和 game-ui 之間的整合事件通訊

### Game Engine BC 實作

- [x] T024 [P] [US1] 移動 Card 實體到 src/game-engine/domain/entities/Card.ts
- [x] T025 [P] [US1] 移動 Player 實體到 src/game-engine/domain/entities/Player.ts
- [x] T026 [P] [US1] 移動 GameState 實體到 src/game-engine/domain/entities/GameState.ts
- [x] T027 [P] [US1] 移動 Yaku 實體到 src/game-engine/domain/entities/Yaku.ts
- [x] T028 [P] [US1] 移動 DeckService 到 src/game-engine/domain/services/DeckService.ts
- [x] T029 [US1] 實作 EngineCardMatchingService 在 src/game-engine/domain/services/EngineCardMatchingService.ts
- [x] T030 [P] [US1] 定義事件發布者 Port src/game-engine/application/ports/IEventPublisher.ts
- [x] T031 [US1] 移動並重構 SetUpGameUseCase 到 src/game-engine/application/usecases/SetUpGameUseCase.ts
- [x] T032 [US1] 移動並重構 SetUpRoundUseCase 到 src/game-engine/application/usecases/SetUpRoundUseCase.ts
- [x] T033 [US1] 移動並重構 PlayCardUseCase 到 src/game-engine/application/usecases/PlayCardUseCase.ts
- [x] T034 [US1] 移動並重構 CalculateScoreUseCase 到 src/game-engine/application/usecases/CalculateScoreUseCase.ts
- [x] T035 [US1] 移動並重構 GameFlowCoordinator 到 src/game-engine/application/usecases/GameFlowCoordinator.ts
- [x] T036 [P] [US1] 移動 OpponentAI 服務到 src/game-engine/application/services/OpponentAI.ts
- [x] T037 [US1] 實作事件匯流排適配器 src/game-engine/infrastructure/adapters/EventBusAdapter.ts

### Game UI BC 實作

- [x] T038 [P] [US1] 建立 GameViewModel 實體 src/game-ui/domain/models/GameViewModel.ts
- [x] T039 [P] [US1] 建立 PlayerViewModel 值物件 src/game-ui/domain/models/PlayerViewModel.ts
- [x] T040 [US1] 實作 UICardMatchingService 在 src/game-ui/domain/services/UICardMatchingService.ts
- [x] T041 [P] [US1] 定義事件訂閱者 Port src/game-ui/application/ports/IEventSubscriber.ts
- [x] T042 [P] [US1] 定義 UI 呈現器 Port src/game-ui/application/ports/IUIPresenter.ts
- [x] T043 [US1] 實作 UpdateGameViewUseCase 在 src/game-ui/application/usecases/UpdateGameViewUseCase.ts
- [x] T044 [US1] 實作 HandleUserInputUseCase 在 src/game-ui/application/usecases/HandleUserInputUseCase.ts
- [x] T045 [US1] 實作事件匯流排適配器 src/game-ui/infrastructure/adapters/EventBusAdapter.ts
- [x] T046 [US1] 移動並重構 GameController 到 src/game-ui/presentation/controllers/GameController.ts
- [x] T047 [US1] 移動並重構 VueGamePresenter 到 src/game-ui/presentation/presenters/VueGamePresenter.ts
- [x] T048 [US1] 移動並重構 gameStore 到 src/game-ui/presentation/stores/gameStore.ts

### 整合與配置

- [x] T049 [US1] 更新 DIContainer 整合兩個 BC 在 src/infrastructure/di/DIContainer.ts
- [x] T050 [US1] 更新 main.ts 配置事件訂閱和 BC 整合
- [x] T051 [US1] 更新所有 import 路徑使用新的 BC 結構
- [x] T052 [US1] 確保 TypeScript 編譯通過，無跨 BC 依賴錯誤

**檢查點**: ✅ 使用者故事 1 已完成 - TypeScript 編譯通過，所有 import 路徑已更新，EventBus 已整合

---

## Phase 4: 使用者故事 2 - 遊戲引擎與 UI 透過增量事件同步狀態 (Priority: P1)

**目標**: 確保 game-engine 和 game-ui 透過整合事件進行解耦通訊，事件只傳送必要的變化量而非完整的遊戲快照

**獨立測試**: 監聽整合事件內容，檢查一次出牌操作只傳送牌的移動而非完整的 48 張牌狀態

### 事件驅動重構

- [x] T053 [P] [US2] 重構 SetUpGameUseCase 發布 GameInitializedEvent
- [x] T054 [P] [US2] 重構 PlayCardUseCase 發布 CardPlayedEvent 和 MatchSelectedEvent
- [x] T055 [P] [US2] 重構 GameFlowCoordinator 發布 KoikoiDeclaredEvent
- [x] T056 [P] [US2] 重構 CalculateScoreUseCase 發布 RoundEndedEvent 和 GameEndedEvent
- [x] T057 [US2] 實作事件序號機制檢測遺失在 EventBus
- [x] T058 [US2] 實作 GameViewModel 的增量事件處理邏輯
- [x] T059 [US2] 實作事件遺失檢測與完整狀態同步機制
- [x] T060 [P] [US2] 加入事件日誌記錄到所有 UseCase
- [x] T061 [US2] 實作 UI 事件訂閱器在 UpdateGameViewUseCase

### 狀態同步優化

- [ ] T062 [P] [US2] 優化 CardPlayedEvent 包含 MatchResult 嵌套結構
- [ ] T063 [P] [US2] 優化 KoikoiDeclaredEvent 包含 TurnTransition 嵌套結構
- [ ] T064 [US2] 驗證所有非初始化事件大小 < 1KB
- [ ] T065 [US2] 實作事件通訊延遲監控 < 10ms

**檢查點**: 此時使用者故事 1 和 2 都應該獨立運作

---

## Phase 5: 使用者故事 3 - 玩家可以隨時放棄當前遊戲 (Priority: P2)

**目標**: 玩家可以在遊戲進行中的任何時刻選擇放棄遊戲，系統會立即結束遊戲並記錄為對手獲勝

**獨立測試**: 在遊戲的不同階段點擊放棄按鈕，驗證遊戲是否正確結束並觸發 GameAbandonedEvent

### 放棄遊戲功能實作

- [ ] T066 [P] [US3] 實作 AbandonGameUseCase 在 src/game-engine/application/usecases/AbandonGameUseCase.ts
- [ ] T067 [US3] 在 GameController 新增 abandonGame 方法
- [ ] T068 [US3] 在 VueGamePresenter 新增確認對話框顯示
- [ ] T069 [P] [US3] 在 gameStore 新增放棄遊戲狀態管理
- [ ] T070 [US3] 在 GameView 新增放棄遊戲按鈕 UI 元件
- [ ] T071 [US3] 實作 GameAbandonedEvent 事件處理邏輯
- [ ] T072 [US3] 在所有遊戲階段都可觸發放棄功能

**檢查點**: 放棄遊戲功能應在所有階段正常運作

---

## Phase 6: 使用者故事 4 - 完善花牌來來遊戲規則 (Priority: P2)

**目標**: 正確實施所有花牌來來規則，包括配對規則、役種判定、特殊情況處理

**獨立測試**: 構造特定的捕獲組合測試役種判定邏輯，驗證分數計算是否符合標準花牌規則

### 遊戲規則修正

- [ ] T073 [P] [US4] 修正 Koi-Koi 計分加倍邏輯在 CalculateScoreUseCase
- [ ] T074 [P] [US4] 補充場上 3 張配對自動捕獲邏輯在 PlayCardUseCase
- [ ] T075 [US4] 實作牌堆翻牌優先順序自動選擇在 EngineCardMatchingService
- [ ] T076 [US4] 實作多重配對處理邏輯，要求玩家選擇配對
- [ ] T077 [P] [US4] 驗證 11 月雨光特殊規則在 Yaku 類別
- [ ] T078 [P] [US4] 驗證所有 10 種標準役種判定邏輯
- [ ] T079 [US4] 實作平局判定處理（雙方無役種）
- [ ] T080 [US4] 加入遊戲結束條件檢查邏輯

**檢查點**: 所有花牌規則應正確實施並通過測試案例

---

## Phase 7: 使用者故事 5 - 維持單機遊玩模式 (Priority: P3)

**目標**: 確保架構重構後仍可在單機環境下對抗 AI 對手進行遊玩

**獨立測試**: 在沒有網路連接情況下啟動遊戲並完整遊玩一局

### 單機模式優化

- [ ] T081 [P] [US5] 驗證 AI 決策邏輯在 OpponentAI 服務
- [ ] T082 [P] [US5] 確保本地事件匯流排效能 < 10ms 延遲
- [ ] T083 [US5] 實作本地遊戲狀態持久化（可選）在 LocalGameRepository
- [ ] T084 [US5] 優化記憶體使用和垃圾回收
- [ ] T085 [US5] 確保無網路依賴的完整遊戲體驗

**檢查點**: 單機模式應完全功能正常

---

## Phase 8: 進階功能（可選）

**目標**: 實作牌堆翻牌限時選擇等進階功能

### 限時選擇機制

- [ ] T086 [P] 實作牌堆翻牌限時選擇 UI 在 GameView
- [ ] T087 [P] 實作選擇超時自動處理邏輯
- [ ] T088 實作 MatchSelectionRequiredEvent 處理流程
- [ ] T089 實作 MatchSelectionTimeoutEvent 處理流程

---

## Phase 9: 完善與跨領域關注點

**目的**: 影響多個使用者故事的改進

- [ ] T090 [P] 加入契約測試使用 JSON Schema 驗證在 tests/contract/
- [ ] T091 [P] 加入 BC 邊界測試在 tests/unit/architecture/
- [ ] T092 [P] 加入整合事件結構測試在 tests/integration/events/
- [ ] T093 [P] 驗證整合事件結構 Protocol Buffers 相容性
- [ ] T094 [P] 程式碼清理和重構
- [ ] T095 [P] 效能優化跨所有故事
- [ ] T096 [P] 文件更新在 docs/ 和 README.md
- [ ] T097 執行 quickstart.md 驗證

---

## 依賴關係與執行順序

### 階段依賴關係

- **設置 (Phase 1)**: 無依賴 - 可立即開始
- **基礎 (Phase 2)**: 依賴設置完成 - 阻塞所有使用者故事
- **使用者故事 (Phase 3+)**: 全部依賴基礎階段完成
  - 使用者故事可以平行進行（如果有足夠人力）
  - 或按優先順序循序進行 (P1 → P2 → P3)
- **完善 (最終階段)**: 依賴所有所需使用者故事完成

### 使用者故事依賴關係

- **使用者故事 1 (P1)**: 基礎階段完成後可開始 - 不依賴其他故事
- **使用者故事 2 (P1)**: 基礎階段完成後可開始 - 與 US1 整合但應該獨立測試
- **使用者故事 3 (P2)**: 基礎階段完成後可開始 - 可與 US1/US2 整合但應該獨立測試
- **使用者故事 4 (P2)**: 基礎階段完成後可開始 - 可與 US1/US2 整合但應該獨立測試
- **使用者故事 5 (P3)**: 基礎階段完成後可開始 - 可與所有故事整合但應該獨立測試

### 每個使用者故事內部

- Domain 實體在 Application 服務之前
- Application 服務在 Infrastructure 適配器之前
- Infrastructure 適配器在 Presentation 控制器之前
- 核心實作在整合之前
- 故事完成後才移到下一個優先級

### 平行機會

- 所有標記 [P] 的設置任務可以平行執行
- 所有標記 [P] 的基礎任務可以平行執行（在 Phase 2 內）
- 基礎階段完成後，所有使用者故事可以平行開始（如果團隊容量允許）
- 使用者故事內標記 [P] 的任務可以平行執行
- 不同使用者故事可以由不同團隊成員平行處理

---

## 平行範例：使用者故事 1

```bash
# 一起啟動使用者故事 1 的所有 Domain 實體：
Task: "移動 Card 實體到 src/game-engine/domain/entities/Card.ts"
Task: "移動 Player 實體到 src/game-engine/domain/entities/Player.ts"
Task: "移動 GameState 實體到 src/game-engine/domain/entities/GameState.ts"
Task: "移動 Yaku 實體到 src/game-engine/domain/entities/Yaku.ts"
```

---

## 實作策略

### MVP 優先（僅使用者故事 1）

1. 完成 Phase 1: 設置
2. 完成 Phase 2: 基礎（關鍵 - 阻塞所有故事）
3. 完成 Phase 3: 使用者故事 1
4. **停止並驗證**: 獨立測試使用者故事 1
5. 如果準備好就部署/展示

### 漸進式交付

1. 完成設置 + 基礎 → 基礎就緒
2. 新增使用者故事 1 → 獨立測試 → 部署/展示（MVP！）
3. 新增使用者故事 2 → 獨立測試 → 部署/展示
4. 新增使用者故事 3 → 獨立測試 → 部署/展示
5. 每個故事在不破壞先前故事的情況下增加價值

### 平行團隊策略

有多個開發者時：

1. 團隊一起完成設置 + 基礎
2. 基礎完成後：
   - 開發者 A：使用者故事 1
   - 開發者 B：使用者故事 2
   - 開發者 C：使用者故事 3
3. 故事獨立完成和整合

---

## 總結

- **總任務數**: 97 個任務
- **使用者故事 1 任務數**: 29 個（T024-T052）
- **使用者故事 2 任務數**: 13 個（T053-T065）
- **使用者故事 3 任務數**: 7 個（T066-T072）
- **使用者故事 4 任務數**: 8 個（T073-T080）
- **使用者故事 5 任務數**: 5 個（T081-T085）
- **識別的平行機會**: 42 個標記 [P] 的任務
- **每個故事的獨立測試條件**: 已明確定義
- **建議 MVP 範圍**: 使用者故事 1（核心遊戲流程）
- **格式驗證**: ✅ 所有任務都遵循清單格式（checkbox, ID, labels, file paths）

**預計完成時間**: 4-5 週（依階段規劃和團隊大小）