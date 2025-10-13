# Feature Specification: Game UI-Engine 分離架構

**Feature Branch**: `001-game-ui-game`
**Created**: 2025-10-14
**Status**: Draft
**Input**: 目前的遊戲專案還處於單機遊玩階段,我需要以拆分為 game-ui, game-engine 兩個 BC 為前提,為日後拆分成前後端領域做準備。單機遊玩的模式將會保留。此次改動也要重構遊戲流程進行,改成使用整合事件可以處理的架構。遊戲規則、階段流程要仔細琢磨,本來若有紕漏的部分也一併處理。新增玩家可以隨時離開並放棄遊戲的功能,這也會定義在整合事件之中。兩個 BC 透過整合事件溝通,整合事件、其資料結構可以先定義在 shared 資料夾中,最終目的可能是要使用非 typescript 語言定義,例如 protocol buffer 定義資料結構。整合事件溝通要以最小傳輸量為考量,只有在新開始、重新整理等事件時才會傳送完整的遊戲狀態,其他例如玩家手牌、場面公牌等資料則可以用資料變化量,而非快照來溝通。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 玩家開始新遊戲並正常遊玩 (Priority: P1)

作為玩家,我希望能開始新遊戲,系統會自動發牌並開始第一回合,我可以出牌、與場上的牌配對、捕獲卡牌,並在湊成役種時選擇是否 Koi-Koi,最終完成一局遊戲。

**Why this priority**: 這是遊戲的核心流程,沒有這個功能遊戲無法進行。這是 MVP 的基礎功能。

**Independent Test**: 可以通過啟動新遊戲、完成至少一輪出牌、查看捕獲的卡牌來獨立測試,驗證遊戲邏輯引擎和 UI 之間的整合事件通訊是否正確。

**Acceptance Scenarios**:

1. **Given** 玩家在遊戲主畫面, **When** 點擊開始新遊戲, **Then** 系統應發放手牌給雙方玩家、將 8 張牌放置於場上、開始第一回合並通知 UI 更新
2. **Given** 輪到玩家出牌, **When** 玩家選擇一張手牌並選擇匹配的場牌(如果有多張配對選項), **Then** 系統應捕獲配對的牌、從牌堆翻開一張牌並嘗試配對、更新遊戲狀態、通知 UI 顯示捕獲結果
3. **Given** 玩家捕獲的牌湊成了役種且手牌未用盡, **When** 系統檢測到役種, **Then** 應暫停遊戲並詢問玩家是否 Koi-Koi、顯示當前的役種和分數
4. **Given** 玩家選擇 Koi-Koi, **When** 確認選擇, **Then** 遊戲繼續進行、記錄 Koi-Koi 宣告、切換到對手回合
5. **Given** 回合結束(所有手牌打完或玩家拒絕 Koi-Koi), **When** 系統計算分數, **Then** 應顯示回合結果、獲勝者、役種組合、本回合得分、並提供開始下一回合的選項
6. **Given** 完成所有預設回合數, **When** 最後一回合結束, **Then** 系統應顯示最終結果、總分最高的獲勝者

---

### User Story 2 - 遊戲引擎與 UI 透過增量事件同步狀態 (Priority: P1)

作為系統,game-engine 和 game-ui 需要透過整合事件進行解耦通訊,事件應該只傳送必要的變化量而非完整的遊戲快照,以支援日後的前後端分離。

**Why this priority**: 這是架構重構的核心目標,決定了系統的可擴展性和日後分離前後端的可行性。

**Independent Test**: 可以通過監聽整合事件的內容來驗證:檢查一次出牌操作只傳送牌的移動(從手牌到場上/捕獲區)而非完整的 48 張牌狀態、檢查重新開始遊戲時才傳送完整狀態快照。

**Acceptance Scenarios**:

1. **Given** 遊戲開始或玩家重新整理頁面, **When** game-engine 初始化遊戲狀態, **Then** 應發送 `GameInitialized` 事件包含完整的初始遊戲快照
2. **Given** 玩家出牌, **When** game-engine 處理出牌邏輯, **Then** 應發送 `CardPlayed` 事件只包含:玩家 ID、出的牌 ID、匹配的場牌 ID、捕獲的牌 ID 列表(增量資訊)
3. **Given** 回合進入下一位玩家, **When** game-engine 切換當前玩家, **Then** 應發送 `PlayerTurnChanged` 事件只包含:新的當前玩家 ID
4. **Given** 玩家捕獲的牌形成役種, **When** game-engine 檢測到役種, **Then** 應發送 `YakuAchieved` 事件包含:玩家 ID、役種類型列表、當前分數
5. **Given** 回合結束, **When** game-engine 計算結果, **Then** 應發送 `RoundEnded` 事件包含:獲勝者 ID、本回合得分、役種列表
6. **Given** game-ui 收到任何事件, **When** 事件被處理, **Then** UI 應根據增量資訊更新本地的遊戲狀態視圖模型

---

### User Story 3 - 玩家可以隨時放棄當前遊戲 (Priority: P2)

作為玩家,我希望能在遊戲進行中的任何時刻選擇放棄遊戲,系統會立即結束遊戲並記錄為對手獲勝。

**Why this priority**: 這是使用者體驗的重要功能,讓玩家可以自由控制遊戲進程,但不影響基本遊戲流程。

**Independent Test**: 可以通過在遊戲的不同階段(出牌中、Koi-Koi 選擇、回合間)點擊放棄按鈕來測試,驗證遊戲是否正確結束並觸發 `GameAbandoned` 事件。

**Acceptance Scenarios**:

1. **Given** 遊戲正在進行中, **When** 玩家點擊放棄遊戲按鈕, **Then** 系統應顯示確認對話框詢問是否確定放棄
2. **Given** 確認對話框顯示, **When** 玩家確認放棄, **Then** game-engine 應發送 `GameAbandoned` 事件包含:放棄的玩家 ID、對手自動獲勝、當前回合數
3. **Given** `GameAbandoned` 事件發送, **When** game-ui 收到事件, **Then** 應顯示遊戲結束畫面說明某方放棄、對手獲勝
4. **Given** 玩家放棄遊戲, **When** 遊戲結束, **Then** 應提供返回主選單或開始新遊戲的選項

---

### User Story 4 - 完善花牌來來遊戲規則 (Priority: P2)

作為玩家,我希望遊戲能正確實施所有花牌來來的規則,包括配對規則、役種判定、特殊情況處理(如 11 月雨光的特殊計分),確保遊戲的公平性和準確性。

**Why this priority**: 確保遊戲邏輯的正確性和完整性,避免規則紕漏造成不公平或困惑,是遊戲品質的保證。

**Independent Test**: 可以通過構造特定的捕獲組合(例如:恰好 3 張光且不含 11 月光、4 張光含 11 月光)來測試役種判定邏輯,驗證分數計算是否符合標準花牌規則。

**Acceptance Scenarios**:

1. **Given** 玩家手牌與場上有多張同月份的牌, **When** 玩家出牌, **Then** 系統應要求玩家選擇要配對的場牌(不能自動選擇)
2. **Given** 玩家捕獲了 3 張光牌且不包含 11 月雨光, **When** 檢查役種, **Then** 應正確判定為「三光」(5 分)
3. **Given** 玩家捕獲了 4 張光牌且包含 11 月雨光, **When** 檢查役種, **Then** 應正確判定為「雨四光」(7 分)而非「四光」(8 分)
4. **Given** 玩家捕獲了 4 張光牌且不包含 11 月雨光, **When** 檢查役種, **Then** 應正確判定為「四光」(8 分)
5. **Given** 玩家宣告 Koi-Koi 後又湊成新役種獲勝, **When** 計算分數, **Then** 所有役種分數應加倍
6. **Given** 玩家宣告 Koi-Koi 但最終對手獲勝, **When** 計算分數, **Then** 對手的分數應加倍
7. **Given** 所有手牌和牌堆都用盡且雙方都沒有役種, **When** 回合結束, **Then** 應判定為平局,本回合無人得分

---

### User Story 5 - 維持單機遊玩模式 (Priority: P3)

作為玩家,即使遊戲架構重構為 game-engine 和 game-ui 分離,我仍然可以在單機環境下對抗 AI 對手進行遊玩,不需要網路連接。

**Why this priority**: 保持現有功能的可用性,讓現有玩家不受架構變更影響,但優先級較低因為不影響架構重構本身。

**Independent Test**: 可以在沒有網路連接的情況下啟動遊戲並完整遊玩一局,驗證本地 game-engine 和 AI 邏輯是否正常運作。

**Acceptance Scenarios**:

1. **Given** 玩家選擇單機模式, **When** 開始新遊戲, **Then** game-engine 應在本地執行,無需連接伺服器
2. **Given** 輪到 AI 對手行動, **When** game-engine 通知 AI UseCase, **Then** AI 應根據當前遊戲狀態選擇最佳的出牌策略並執行
3. **Given** AI 湊成役種, **When** game-engine 詢問 AI 是否 Koi-Koi, **Then** AI 應根據策略算法(例如:手牌數量、當前分數差距)自動決定
4. **Given** 遊戲過程中, **When** 所有的整合事件, **Then** 應在本地 game-engine 和 game-ui 之間通過記憶體內的事件匯流排傳遞(不經過網路)

---

### Edge Cases

- 當玩家手牌與場上有超過 2 張同月份配對選項時,系統應如何處理? → 玩家必須明確選擇一張場牌進行配對,若未選擇應提示錯誤
- 當牌堆翻出的牌與場上有多張配對時,系統應如何選擇? → game-ui 會要求玩家在限定時間內選擇一張場牌；若時間到期仍未選擇,game-engine 會自動選擇第一張場牌繼續遊戲
- 當網路中斷(日後前後端分離後)時,game-ui 應如何處理? → 顯示連線錯誤訊息並保存當前遊戲狀態的快照,待重連後嘗試恢復
- 當玩家在 Koi-Koi 選擇對話框時關閉視窗,系統應如何處理? → 視為未宣告 Koi-Koi,自動結束回合
- 當玩家在對手回合時嘗試出牌,系統應如何處理? → UI 應禁用所有手牌的點擊,並顯示提示訊息「請等待對手行動」
- 當整合事件因為某種原因遺失或順序錯誤(如網路問題),系統應如何處理? → 維護事件序號,檢測到遺失時向 game-engine 請求完整狀態快照進行同步
- 當 game-ui 的本地狀態與 game-engine 不同步時,系統應如何處理? → 提供「重新同步」功能,向 engine 請求當前完整遊戲狀態快照

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統必須將現有的單體架構重構為 game-engine 和 game-ui 兩個獨立的 Bounded Context,兩者透過整合事件通訊
- **FR-002**: game-engine BC 必須負責所有遊戲規則邏輯、狀態管理、回合流程控制,不包含任何 UI 相關代碼
- **FR-003**: game-ui BC 必須負責所有 UI 呈現、使用者輸入處理、動畫效果,不包含任何遊戲規則邏輯
- **FR-004**: 系統必須定義一套完整的整合事件在 shared 資料夾中,包含:GameInitialized、CardPlayed、PlayerTurnChanged、YakuAchieved、KoikoiDeclared、RoundEnded、GameEnded、GameAbandoned 等事件
- **FR-005**: 整合事件的資料結構必須設計為可移植到非 TypeScript 環境(如 Protocol Buffers),欄位定義應避免依賴 TypeScript 特定型別
- **FR-006**: 除了 GameInitialized 和重新同步情境,所有整合事件必須只包含增量變化資訊,不傳送完整的遊戲狀態快照
- **FR-007**: 系統必須支援玩家在遊戲過程中隨時放棄遊戲,觸發 GameAbandoned 事件,對手自動獲勝
- **FR-008**: 系統必須正確實施花牌來來的所有規則,包含:
  - 同月份牌的配對規則
  - 10 種標準役種的判定邏輯(五光、四光、雨四光、三光、猪鹿蝶、赤短、青短、種、短、カス)
  - 11 月雨光的特殊規則(3 張光含雨光不成立三光、4 張光含雨光為雨四光而非四光)
  - Koi-Koi 宣告的加倍計分規則
  - 平局判定(雙方無役種時不計分)
- **FR-009**: 系統必須在玩家出牌遇到多重配對時(手牌可配對多張場牌),要求玩家明確選擇一張場牌
- **FR-010**: 系統必須維持單機遊玩模式,game-engine 在本地執行,事件通過記憶體內的事件匯流排傳遞
- **FR-011**: 系統必須為日後的前後端分離做準備,game-engine 應設計為可獨立部署為後端服務
- **FR-012**: game-ui 必須能夠根據接收到的增量事件正確更新本地的遊戲狀態視圖模型
- **FR-013**: 系統必須提供事件序號機制,讓 game-ui 能檢測事件遺失並請求完整狀態快照同步
- **FR-014**: 整合事件必須包含足夠的上下文資訊,使 game-ui 可以進行動畫呈現(如:哪張牌從哪裡移動到哪裡)
- **FR-015**: 系統必須在 shared 資料夾中定義整合事件的 TypeScript 型別定義,作為兩個 BC 的契約
- **FR-016**: 當牌堆翻牌與場上有多張配對時,game-ui 必須提供限時選擇介面讓玩家選擇要配對的場牌
- **FR-017**: 當玩家在限定時間內未選擇配對的場牌,game-engine 必須自動選擇第一張場牌並繼續遊戲流程
- **FR-018**: game-ui 和 game-engine 必須各自實作花牌配對尋找的領域服務,以支援各自的職責(UI 顯示選項、Engine 自動選擇)

### Key Entities

- **GameEngine BC**:
  - **GameState**: 遊戲狀態實體,管理回合、階段、玩家、牌堆、場牌等核心遊戲資料
  - **Player**: 玩家實體,管理手牌、捕獲牌、分數等玩家相關資料
  - **Card**: 卡牌值物件,包含月份、類型、點數等不可變屬性
  - **Yaku**: 役種檢查服務,負責判定役種組合
  - **GameFlowUseCase**: 遊戲流程協調器,管理回合進行、階段切換
  - **PlayCardUseCase**: 出牌用例,處理出牌邏輯和配對規則
  - **IntegrationEventPublisher**: 整合事件發佈者,負責發送事件到外部

- **GameUI BC**:
  - **GameViewModel**: 遊戲視圖模型,維護 UI 需要的遊戲狀態快照
  - **IntegrationEventSubscriber**: 整合事件訂閱者,接收並處理來自 game-engine 的事件
  - **UIPresenter**: UI 呈現器,負責將視圖模型更新轉換為實際的 DOM 操作或 UI 框架更新
  - **UserInputController**: 使用者輸入控制器,將 UI 事件(點擊、選擇)轉換為對 game-engine 的指令

- **Shared**:
  - **IntegrationEvent**: 整合事件基礎型別,包含事件 ID、時間戳、序號
  - **GameInitializedEvent**: 遊戲初始化事件,包含完整初始狀態
  - **CardPlayedEvent**: 出牌事件,包含玩家 ID、牌 ID、配對牌 ID、捕獲牌 ID
  - **DeckCardRevealedEvent**: 牌堆翻牌事件,包含翻出的牌 ID、可配對的場牌 ID 列表(若有多張)
  - **MatchSelectionRequiredEvent**: 需要玩家選擇配對事件,包含可選場牌列表、選擇時限
  - **MatchSelectionTimeoutEvent**: 選擇配對逾時事件,包含自動選擇的場牌 ID
  - **YakuAchievedEvent**: 役種達成事件,包含玩家 ID、役種類型、分數
  - **RoundEndedEvent**: 回合結束事件,包含獲勝者、得分、役種列表
  - **GameAbandonedEvent**: 遊戲放棄事件,包含放棄者 ID、獲勝者 ID
  - **CardMatchingService**: 花牌配對尋找領域服務介面,定義配對規則(同月份)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 玩家可以順利完成一局完整的遊戲(3 回合),從開始到結束不超過 10 分鐘(單機模式)
- **SC-002**: 所有非初始化的遊戲操作(出牌、宣告 Koi-Koi、結束回合)產生的整合事件大小不超過 1KB
- **SC-003**: game-engine 和 game-ui 之間的整合事件通訊延遲在單機模式下不超過 10ms
- **SC-004**: 系統正確判定所有 10 種標準役種,準確率 100%(通過標準測試案例驗證)
- **SC-005**: 玩家可以在遊戲的任何階段(共 6 個階段:setup、dealing、playing、koikoi、round_end、game_end)成功放棄遊戲
- **SC-006**: game-engine 可以獨立打包為 NPM 套件或獨立服務,不依賴 Vue 或任何 UI 框架
- **SC-007**: game-ui 接收到增量事件後可在 50ms 內完成本地狀態更新和 UI 重繪
- **SC-008**: 事件遺失檢測機制可在 3 個事件內發現不同步,並自動觸發完整狀態同步
- **SC-009**: 整合事件的型別定義可以轉換為 Protocol Buffers schema 而不需要重大調整
- **SC-010**: 重構後的程式碼架構符合 Clean Architecture 原則,game-engine BC 和 game-ui BC 之間無直接依賴(僅依賴 shared 的事件定義)
- **SC-011**: 當牌堆翻牌遇到多重配對時,玩家可在 10 秒內完成選擇;若超時,遊戲自動繼續而不中斷

## Assumptions

- 假設目前專案使用的 Clean Architecture 分層結構將維持不變,只是將層級歸屬於不同的 BC
- 假設單機模式下的 AI 對手邏輯(OpponentAI)將歸屬於 game-engine BC
- 假設事件通訊在單機模式下使用記憶體內的 Event Bus(可能使用簡單的 Observer Pattern 或既有的狀態管理工具如 Pinia)
- 假設日後前後端分離時,game-engine 會部署為 WebSocket 或 HTTP Server,事件會透過網路傳輸
- 假設牌堆翻牌時遇到多重配對的選擇時限預設為 10 秒(可在遊戲設定中調整)
- 假設花牌配對尋找邏輯會在 game-ui 和 game-engine 各自實作,但遵循相同的領域規則(同月份即可配對)
- 假設 Protocol Buffers 轉換是日後的工作,本次重構先以 TypeScript 介面定義事件結構
- 假設現有的國際化(i18n)系統將繼續使用,UI 文字仍通過 locale keys 處理
- 假設測試策略維持不變:Domain 層單元測試、Application 層整合測試、UI 層元件測試,並新增 BC 之間的整合事件測試
- 假設現有的 Tailwind CSS 和 Vue 3 Composition API 技術棧維持不變
- 假設遊戲支援的最大回合數(MAX_ROUNDS)和初始發牌規則維持現有設定
