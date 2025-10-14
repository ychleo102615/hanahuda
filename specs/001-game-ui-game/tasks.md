# Tasks: Game UI-Engine 分離架構 (Feature 001-game-ui-game)

產生時間：2025-10-14  
來源規格：plan.md, spec.md, data-model.md, research.md, quickstart.md, contracts/* (v2.0 最佳化事件)

重要說明：Tests（測試）在規格中已被隱含要求（成功準則 + 合約 Schema + 覆蓋率目標）。需包含單元 / 整合 / 合約測試。每個 User Story 內遵循 TDD 順序（測試任務先於實作）。E2E 僅在核心流程穩定（P1 之後的故事）後加入。

## Legend（圖例）
- Phase 編號：Phase 1 = Setup（初始化），Phase 2 = Foundational（基礎阻塞），Phase 3+ = 依優先順序的 User Stories，Final = Polish & Cross-Cutting（收尾與橫向）
- Task ID：T### 連號
- [P] = 可平行（不同檔案 / 無共享關鍵狀態順序）
- [Story USx] = 對應的使用者故事
- 每個故事測試優先順序：Unit > Integration > Contract > E2E（若適用）
- Dependencies：使用 Task ID；故事完成需其全部任務完成

## Phase 1: Setup Tasks（專案初始化 / 基線）
目標：建立 BC 分離與事件驅動架構所需的腳手架，尚不做功能重構。  
獨立測試準則：Lint 通過、type-check 通過、EventBus 基本單元測試可執行、目錄結構已建立。

T001 建立 BC 目錄骨架（尚不移動程式碼）於 `src/game-engine`, `src/game-ui`, `src/shared/{events,constants,services}` [P]  
T002 在 `tsconfig.json` 新增 TypeScript 路徑別名（`@game-engine/*`, `@game-ui/*`, `@shared/*`）並在 `vite.config.ts` 加入對應 alias [P]  
T003 定義基底 IntegrationEvent 介面 `src/shared/events/base/IntegrationEvent.ts`（eventId,eventType,timestamp,sequenceNumber）+ JSDoc 兼容說明  
T004 實作輕量 `EventBus` + `EventLogger` 骨架於 `src/shared/events/base/EventBus.ts`（publish / subscribe / 序號遞增 / logging hooks）  
T005 在 `eslint.config.ts` 增加 ESLint 邊界規則 (`import/no-restricted-paths`) 禁止跨 BC import  
T006 新增邊界檢查腳本 `scripts/check-bc-boundaries.js` + npm script `lint:boundaries`  
T007 建立 EventBus & logger 初始單元測試 (`tests/unit/shared/events/EventBus.test.ts`) 實作前 (紅) [P]  
T008 完整實作 EventBus（序號、handler 隔離、unsubscribe）並更新測試 (綠)  
T009 建立初始合約測試基礎（Ajv 設定）`tests/contract/_setup/ajv.ts` [P]  
T010 新增 JSON Schema 載入測試驗證 `integration-events-schema.json` 可讀取 [P]  
T011 執行 type check 並調整 tsconfig include；修正遺漏引用  

## Phase 2: Foundational Tasks（所有故事的阻塞前置）
目標：移動現有 domain/application 程式碼至 BC 邊界內；準備共享事件合約（故事特定事件於各故事階段實作）。僅有位置/匯入調整，不改行為。  
獨立測試準則：所有已移動檔案可編譯；遊戲仍可手動啟動；無跨 import 規則違反。

T012 移動 domain entities 至 `src/game-engine/domain/entities/*` 並更新 imports（Card, GameState, Player, Yaku）[P]  
T013 移動 DeckService 至 `src/game-engine/domain/services/DeckService.ts` 並更新 imports [P]  
T014 移動 application use cases（SetUpGameUseCase, SetUpRoundUseCase, PlayCardUseCase, CalculateScoreUseCase, GameFlowCoordinator, GetMatchingCardsUseCase, ResetGameUseCase）至 `src/game-engine/application/usecases/` 並逐步修正相對匯入  
T015 移動 OpponentAI 至 `src/game-engine/application/services/OpponentAI.ts`  
T016 在 game-engine 新增 `application/ports/EventPublisherPort.ts`（publish<T>）與 DI 注入點（DIContainer 更新）[P]  
T017 預先建立 `src/game-ui/presentation/{controllers,presenters,stores}` 目錄（暫不移動檔案）[P]  
T018 對已移動檔案執行匯入別名重寫 (`@game-engine/...`) [P]  
T019 新增架構邊界單元測試 `tests/unit/architecture/BoundaryIsolation.test.ts`（紅：若有跨 import）[P]  
T020 執行移轉並修正邊界測試為綠  
T021 更新 DIContainer 註冊 EventBus 並提供 EventPublisher 給 engine use cases  
T022 手動 smoke test：啟動 dev server 確認遊戲仍可初始化（紀錄於 test-results）  
T023 更新 README 或內部文件（可選）引用新結構  

## Phase 3: User Story 1 (US1) 玩家開始新遊戲並正常遊玩 (Priority P1)
故事目標：端對端支援開始遊戲，完成至少一回合：出牌、捕獲、役種判斷、Koi-Koi 提示（邏輯 stub）、回合計分。  
獨立測試準則：可執行腳本式整合測試啟動遊戲，模擬出牌流程產生至少一個役種，並達到 RoundEndedEvent；計分正確且事件序號連續。

### US1 測試（實作前 TDD）
T024 [US1] 為已移動 engine domain 不變條件撰寫單元測試（GameState 轉換、Yaku 光牌規則）`tests/unit/game-engine/domain/*.test.ts`（補強）[P]  
T025 [US1] GameViewModel 初始骨架單元測試（US2 才實作完整，暫用存在性占位）[P]  
T026 [US1] 整合測試骨架 `tests/integration/game-engine/GameInitialization.test.ts` 驗證 SetUpGameUseCase 會發布 stub GameInitializedEvent（先 fail）[P]  
T027 [US1] 合約測試占位：GameInitializedEvent 結構對 schema（先 fail）[P]  

### US1 實作
T028 [US1] 實作 GameInitializedEvent 介面至 `src/shared/events/game/GameInitializedEvent.ts`（US1 需用子集）  
T029 [US1] 在 engine 實作 EventPublisher adapter 於 SetUpGameUseCase 發布 GameInitializedEvent  
T030 [US1] 透過 EventBus 為已發布事件加上序號與 logging [P]  
T031 [US1] 實作最小 `GameViewModel` (僅結構) `src/game-ui/domain/models/GameViewModel.ts`  
T032 [US1] 實作 `UpdateGameViewUseCase` 套用 GameInitializedEvent 並維護 lastEventSequence  
T033 [US1] 實作簡易 `VueGamePresenter` 將 GameViewModel 推入 Pinia store（調整既有 store）[P]  
T034 [US1] 在 main/boot 訂閱事件：GameInitializedEvent -> UpdateGameViewUseCase  
T035 [US1] 整合測試：遊戲初始化發布事件 & UI view model 更新 (綠)  
T036 [US1] 實作 CardPlayedEvent（v2 最佳化）介面 & 局部 schema stub（playerId, playedCardId, handMatch 基本）[P]  
T037 [US1] 重構 PlayCardUseCase 發布 CardPlayedEvent（僅 handMatch，尚無 deckMatch）與 turnTransition 骨架  
T038 [US1] 擴充 GameViewModel.applyEvent：增量更新（手牌移除、場面基本變化）[P]  
T039 [US1] 整合測試：出一張牌產生合法 CardPlayedEvent 且序號連續  
T040 [US1] 在 CardPlayedEvent 中發布 yaku 偵測結果（暫嵌入 deckMatch placeholder）  
T041 [US1] 合約測試：驗證 CardPlayedEvent 符合 schema  
T042 [US1] 新增 RoundEndedEvent 介面 + 回合末發布（簡化計分）並更新 view model 回合狀態  
T043 [US1] 整合測試：完成一回合產生 RoundEndedEvent 並重置下一回合  
T044 [US1] 情境測試：koi-koi 提示占位（phase 轉換 koikoi）- 邏輯 stub 回到 playing  
T045 [US1] 手動探索測試紀錄（開始 -> 出牌 -> 捕獲 -> 回合結束）  
T046 [US1] 更新 schema / 介面確保 UI 動畫所需 (capturedCardIds) 欄位存在  
T047 [US1] 覆蓋率檢查：domain ≥90%，application ≥80%（產生報告並調整）  
T048 [US1] 故事檢查點：確認獨立測試準則達成（記錄 `test-results/us1-checkpoint.md`）  

## Phase 4: User Story 2 (US2) 增量事件同步 (Priority P1)
故事目標：除初始化外 UI 僅接收增量狀態；實作 deckMatch、turnTransition 為 null 的等待狀態、koi-koi 決策等待、以及事件序號缺口補強。  
獨立測試準則：整合測試模擬序號缺口觸發完整同步；出牌事件 payload 符合 SC-002 (<1KB 非初始化)。

### US2 測試（實作前）
T049 [US2] EventSubscriber 序號缺口偵測單元測試 stub（紅）[P]  
T050 [US2] 合約測試：完整 CardPlayedEvent (handMatch + deckMatch + turnTransition 可為 null) [P]  
T051 [US2] 整合測試：模擬缺口（插入亂序事件）期望觸發完整同步請求 stub [P]  

### US2 實作
T052 [US2] 完成 CardPlayedEvent deckMatch 結構並於 PlayCardUseCase 整合翻牌 + 捕獲邏輯（單/無匹配）  
T053 [US2] 在 UpdateGameViewUseCase 實作序號缺口偵測（pause + 請求 full sync）與 RequestFullStateSync stub  
T054 [US2] 實作完整同步流程：engine 接到請求回傳 GameInitializedEvent 快照 [P]  
T055 [US2] 在 EventLogger 加入序號缺口與重新同步記錄 [P]  
T056 [US2] 加入大小記錄：對非初始化事件 log payload 估計大小 (<1KB)（開發模式）  
T057 [US2] GameViewModel deckMatch 增量更新（增刪場牌與捕獲）  
T058 [US2] turnTransition 邏輯：等待（多重匹配 / koi-koi 決策）時為 null，否則為物件  
T059 [US2] 更新 schema / 型別至 v2 最佳化完整定義（handMatch, deckMatch, TurnTransition）並調整合約測試  
T060 [US2] 整合測試：多次連續 CardPlayedEvents 序號連續 & UI 更新 <50ms（計時）[P]  
T061 [US2] 缺口模擬測試通過（跳號 -> 完整快照 -> 恢復）[P]  
T062 [US2] 故事檢查點 `test-results/us2-checkpoint.md`  

## Phase 5: User Story 3 (US3) 玩家可放棄遊戲 (Priority P2)
獨立測試準則：任一 phase 放棄會觸發 GameAbandonedEvent -> GameEndedEvent；UI 顯示放棄結束畫面。

### US3 測試（實作前）
T063 [US3] GameAbandonedEvent schema 合約測試 stub [P]  
T064 [US3] 整合測試骨架：模擬進行中遊戲 → 放棄 → 驗證事件與最終狀態 [P]  

### US3 實作
T065 [US3] 實作 GameAbandonedEvent 介面並擴充 schema  
T066 [US3] 實作 AbandonGameUseCase & DI 註冊  
T067 [US3] 在 GameController 新增放棄方法（UI 確認對話框 stub）[P]  
T068 [US3] 放棄後發布 GameEndedEvent（reason player_abandoned）包含 finalResult  
T069 [US3] GameViewModel.applyEvent 支援 GameAbandonedEvent + GameEndedEvent（phase = game_end）[P]  
T070 [US3] 合約 + 整合測試通過  
T071 [US3] 故事檢查點 `test-results/us3-checkpoint.md`  

## Phase 6: User Story 4 (US4) 完善花札規則 (Priority P2)
涵蓋：11 月雨光特殊規則、多重匹配流程、牌堆多重匹配限時選擇、場面三張同月自動收、koi-koi 加倍最終計分。  
獨立測試準則：決定論（deterministic）規則測試生成正確役種集合（含雨四光、雨三光不成立）、正確自動選擇 / 超時回退、加倍計分符合規格。

### US4 測試（實作前）
T072 [US4] 單元：雨光情境（3 光含雨無役 / 4 光含雨 / 4 光不含雨 / 5 光）[P]  
T073 [US4] 單元：CardMatchingService autoSelect 優先順序與平手穩定性 [P]  
T074 [US4] 單元：場上三張同月 → 自動全部捕獲（模擬 PlayCardUseCase）[P]  
T075 [US4] 整合：牌堆多重匹配 → 等待狀態 (turnTransition null) → 選擇 / 超時 [P]  
T076 [US4] 整合：koi-koi 加倍（宣告後獲勝 / 宣告後失敗）[P]  
T077 [US4] 合約：MatchSelectedEvent 全形（autoSelected true/false）[P]  

### US4 實作
T078 [US4] 實作 CardMatchingService 介面 `src/shared/services/CardMatchingService.ts` & engine EngineCardMatchingService  
T079 [US4] 注入 CardMatchingService 於 PlayCardUseCase（手牌與牌堆匹配）[P]  
T080 [US4] 實作場上三張同月自動捕獲  
T081 [US4] 實作多重匹配等待狀態：CardPlayedEvent deckMatch.matchType multiple_matches + selectableFieldCardIds + selectionTimeout & turnTransition null  
T082 [US4] 實作選擇指令 -> 發布 MatchSelectedEvent（含 achievedYaku & turnTransition）[P]  
T083 [US4] 實作超時自動選擇 autoSelected true  
T084 [US4] 實作 Koi-Koi 宣告路徑：KoikoiDeclaredEvent（true -> turnTransition；false -> 接 RoundEndedEvent 序列）[P]  
T085 [US4] 完成 CalculateScoreUseCase koi-koi 加倍邏輯（勝 / 負 / 平）並更新 RoundEndedEvent 組裝  
T086 [US4] GameViewModel.applyEvent 支援 MatchSelectedEvent & KoikoiDeclaredEvent（phase koikoi <-> playing）[P]  
T087 [US4] 擴充合約 schema：MatchSelectedEvent & KoikoiDeclaredEvent  
T088 [US4] 完成多重匹配 / 選擇 / 超時 / 計分整合測試  
T089 [US4] 效能微基準：事件處理常態 <10ms（log 範例）[P]  
T090 [US4] 故事檢查點 `test-results/us4-checkpoint.md`  

## Phase 7: User Story 5 (US5) 維持單機模式 (Priority P3)
目標：確保記憶體內運作、AI 對手自動回合、無網路依賴、為未來遠端引擎預留 feature flag。  
獨立測試準則：完整離線完成遊戲；關閉模擬網路旗標不發出任何遠端呼叫；AI 行為發布標準事件。

### US5 測試（實作前）
T091 [US5] 整合測試 stub：AI 行為 1 回合模擬（固定種子）[P]  
T092 [US5] 單元：OpponentAI 基於狀態選擇合法手牌 [P]  

### US5 實作
T093 [US5] 實作 AI 回合排程：turnTransition 至 AI 時自動呼叫 PlayCardUseCase [P]  
T094 [US5] 新增環境旗標 `VITE_ENGINE_MODE=standalone` 控制 EventBus 實作（目前僅 InMemory）[P]  
T095 [US5] 注入偽隨機種子提供器以利可重現測試  
T096 [US5] 確認隔離：engine 無直接 UI import（重跑 boundary test）[P]  
T097 [US5] 整合測試：完整離線回合通過並記錄延遲  
T098 [US5] 故事檢查點 `test-results/us5-checkpoint.md`  

## Final Phase: Polish & Cross-Cutting
目標：強化、文件、覆蓋率、效能、清除舊目錄。  
獨立測試準則：所有成功準則 SC-001..SC-011 驗證、覆蓋率達標、無遺留未使用舊碼。

T099 新增完整合約 Schema 驗證循環所有已發布事件 `tests/contract/AllEventsContract.test.ts` [P]  
T100 新增效能工具：量測 publish->UI apply 平均延遲 (<10ms) & UI 更新 (<50ms) 並記錄 [P]  
T101 將邊界 lint 與測試加入 CI 設定（若存在 CI 設定檔）[P]  
T102 移除重構前舊目錄（`src/domain`, `src/application`）並更新 imports  
T103 更新 quickstart.md：最終事件列表 & 移除已淘汰事件  
T104 README 新增架構章節：BC 分離 & v2 事件摘要  
T105 新增 coverage 報告腳本並執行；調整測試以達成功準則覆蓋率  
T106 改善錯誤處理與 logging（序號缺口警告、錯誤格式化）[P]  
T107 新增手動 QA 清單 `specs/001-game-ui-game/checklists/final-verification.md`  
T108 驗證 schema → 加入未來 proto 對應可行性說明（proto stub doc）[P]  
T109 最終手動探索 E2E（Playwright 情境錄製）  
T110 將 test-results 各檢查點摘要彙整附加至 `tasks.md` 附錄  
T111 產出最終成功準則驗證報告 `test-results/final-success-criteria.md`  

## Dependencies & Story Order（依賴與故事順序）
故事執行順序（需完成前一故事）：US1 → US2 → US3 → US4 → US5

高層依賴圖：  
- Phase1 → Phase2 →（US1 ↘ US2 ↘ US3 ↘ US4 ↘ US5 按序）  
- Polish 依賴所有故事完成

關鍵任務依賴：  
- T001→T002→T005 才有邊界 lint 意義  
- T007 (紅) → T008 (綠)  
- T019 (紅) → T020 (綠)  
- US1 基礎事件 (T028-T034) 先於 CardPlayedEvent (T036+)  
- 序號缺口處理 (T052-T054) 依賴基礎 CardPlayedEvent (T037)  
- 多重匹配 (T081+) 依賴 deckMatch 完成 (T052)  
- 放棄流程 (T065+) 依賴初始事件與 RoundEnded 路徑 (T042)  

## Parallel Execution Examples（平行執行範例）
US1 早期（移動後）：  
- 可平行：T028, T029, T030（不同檔：介面、publisher adapter、bus logging）  
US2：T052（usecase 邏輯）可與 T055（logging）與 T057（view model）平行，前提 schema 更新 (T059) 已排程  
US4 規則增強：T078（service）、T080（三張自動）、T085（計分）、T086（view model）在 T079 注入後可平行  

## Implementation Strategy (MVP First)（實作策略：先最小可行）
MVP 範圍 = 完成 US1 + 基礎設施（Phase 1-2 + Phase3 US1）。交付可遊玩的本地事件驅動版基礎，為後續增量事件與進階規則奠基。

漸進交付計畫：  
1. MVP (US1) 可玩回合事件驅動  
2. 增量同步 + 重新同步 (US2)  
3. 放棄遊戲 (US3)  
4. 完整規則 / 多重匹配 / koi-koi 加倍 (US4)  
5. 離線 AI & feature flags (US5)  
6. Polish（效能、文件、覆蓋率、proto 準備）  

## Task Counts（任務計數）
- 總任務：111
- 各階段：  
  - Setup: 11  
  - Foundational: 12 (T012-T023)  
  - US1: 24 (T024-T048)  
  - US2: 14 (T049-T062)  
  - US3: 9 (T063-T071)  
  - US4: 19 (T072-T090)  
  - US5: 8 (T091-T098)  
  - Polish: 11 (T099-T109) + 報告 2 (T110-T111)  
- 標記可平行：約 39  

## Independent Test Criteria Summary Per Story（各故事獨立驗證標準）
- US1：可開始遊戲 → 出牌 → 捕獲 → 偵測役種 → 產生 RoundEndedEvent 且序號連續  
- US2：非初始化皆為增量事件（<1KB），缺口觸發完整快照並恢復  
- US3：任意階段放棄 → GameAbandonedEvent + GameEndedEvent，UI 正確轉換  
- US4：規則邊界（雨光、雨三光無效、多重匹配超時、自動選擇、koi-koi 加倍）測試全過  
- US5：離線完整回合含 AI，無網路呼叫，延遲符合目標  

## MVP Recommendation（MVP 建議）
交付至 T048（US1 結束）作為 MVP 里程碑：提供事件驅動架構、初步分離、基本遊戲循環。  

## Appendix (Reserved)（附錄保留）
完成後將附上各檢查點報告（US1-US5, final）：參考 T048, T062, T071, T090, T098, T111。


