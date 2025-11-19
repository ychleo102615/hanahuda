# Feature Specification: User Interface BC - Adapter Layer

**Feature Branch**: `004-ui-adapter-layer`
**Created**: 2025-01-19
**Status**: Draft
**Input**: User description: "根據 doc/readme.md、doc/frontend/architecture.md、doc/frontend/user-interface/adapter.md、doc/frontend/user-interface/application.md、doc/shared/ 與 doc/quality/ 開發 user-interface BC adapter layer"

## 與現有實作的整合

### HomePage.vue 整合

**已實作功能** (Spec: 001-homepage-implementation):
- HomePage.vue 已完整實作，包含 NavigationBar、HeroSection、RulesSection、Footer 組件
- 「開始遊戲」按鈕已存在於 Hero Section，點擊後跳轉到 `/game` 路徑
- 路由配置已設定（`/` → HomePage、`/game` → GamePage）

**本次需整合的部分**:
1. **遊戲頁面路由守衛**: 在 `/game` 路由的 `beforeEnter` 守衛中，根據使用者選擇或環境變數決定啟動模式：
   - **線上模式**（Backend Game）: 發送 `joinGame` API 請求，建立 SSE 連線
   - **離線模式**（Local Game）: 使用 Local Game BC 提供的遊戲引擎
   - **Mock 模式**（開發測試用）: 使用 Mock API 與 Mock SSE 事件

2. **遊戲模式選擇器**（可選，用於開發階段）:
   - 在首頁或 `/game` 路徑加入模式選擇器（開發階段可見，生產環境隱藏）
   - 允許開發者切換「Backend」、「Local」、「Mock」模式
   - 模式選擇儲存在 localStorage，下次訪問時自動套用

3. **開始遊戲流程**:
   - 用戶點擊「開始遊戲」→ 跳轉到 `/game`
   - 路由守衛檢查遊戲模式設定
   - 根據模式調用對應的 DI Container 配置（線上/離線/Mock）
   - 初始化 Pinia Stores、SSE 客戶端、Use Cases
   - 顯示 GamePage.vue 並開始遊戲

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 玩家啟動遊戲並加入對局 (Priority: P1)

玩家點擊「開始遊戲」按鈕後，系統建立與後端的連線，接收遊戲初始化事件，並在螢幕上顯示遊戲介面。玩家可以看到自己的手牌、場牌與對手資訊。

**Why this priority**: 這是整個遊戲體驗的入口。沒有這個功能，玩家無法進入遊戲。所有其他功能都依賴於成功建立遊戲會話。

**Independent Test**: 可獨立測試,只需實作 API 客戶端（加入遊戲）、SSE 客戶端（接收 GameStarted 與 RoundDealt 事件）、基礎 Pinia Stores 與遊戲頁面組件。測試者可驗證「點擊開始遊戲 → 看到發牌動畫 → 顯示手牌與場牌」。

**Acceptance Scenarios**:

1. **Given** 用戶在首頁，**When** 用戶點擊「開始遊戲」按鈕，**Then** 系統發送 API 請求加入遊戲並返回 game_id 與 session_token
2. **Given** 已取得 game_id 與 session_token，**When** 系統建立 SSE 連線，**Then** 接收到 GameStarted 事件並顯示遊戲初始資訊
3. **Given** 遊戲已開始，**When** 接收到 RoundDealt 事件，**Then** 觸發發牌動畫，並在畫面上顯示 8 張手牌與 8 張場牌
4. **Given** 發牌完成，**When** UI 更新完畢，**Then** 玩家可看到自己的手牌、場牌、對手手牌數量與牌堆剩餘數量
5. **Given** 遊戲介面已就緒，**When** 玩家看到「您的回合」提示，**Then** 可點擊手牌進行操作

---

### User Story 2 - 玩家打出手牌並處理配對邏輯 (Priority: P1)

玩家在自己的回合點擊一張手牌，系統高亮場上可配對的牌（同月份）。若有多張可配對，顯示選擇介面讓玩家選擇目標；若只有一張或無配對，直接發送打牌命令。命令發送後，玩家等待後端事件確認，UI 顯示卡片飛行動畫並更新牌面狀態。

**Why this priority**: 這是遊戲的核心互動流程。玩家 80% 的操作時間都在打牌與配對，是體驗核心。

**Independent Test**: 可獨立測試，需實作玩家手牌區組件、場牌區組件、選擇配對介面、打牌命令 API、SSE 事件處理（TurnCompleted、SelectionRequired、TurnProgressAfterSelection）、卡片移動動畫。測試者可驗證「點擊手牌 → 看到高亮 → 選擇配對 → 看到動畫 → 牌面更新」。

**Acceptance Scenarios**:

1. **Given** 玩家手牌包含松月卡片（0111），場上有松月卡片（0112、0113），**When** 玩家點擊手牌 0111，**Then** 場上 0112 與 0113 高亮顯示為可配對目標
2. **Given** 場上有多張可配對牌，**When** 系統顯示選擇介面，**Then** 玩家可點擊其中一張作為配對目標
3. **Given** 玩家選擇配對目標 0112，**When** 玩家確認選擇，**Then** 系統發送 playHandCard 命令到後端
4. **Given** 命令發送成功，**When** 後端返回 TurnCompleted 或 SelectionRequired 事件，**Then** 系統觸發卡片移動動畫，手牌 0111 與場牌 0112 飛向玩家獲得區
5. **Given** 動畫完成，**When** UI 更新狀態，**Then** 手牌減少一張，場牌減少一張，玩家獲得區增加兩張
6. **Given** 配對完成後需翻牌，**When** 翻牌也有多張可配對，**Then** 系統顯示第二次選擇介面（SelectionRequired 事件）
7. **Given** 玩家選擇翻牌配對目標，**When** 發送 selectTarget 命令，**Then** 接收 TurnProgressAfterSelection 事件並更新 UI

---

### User Story 3 - 玩家做出 Koi-Koi 決策 (Priority: P1)

當玩家獲得牌後形成役種時，系統顯示決策 Modal，展示當前役種名稱、得分、以及繼續遊戲的潛在分數。玩家可選擇「繼續遊戲」或「結束本局」。選擇後，系統發送決策命令並接收確認事件。

**Why this priority**: Koi-Koi 決策是遊戲名稱的由來，是核心玩法之一。沒有這個功能，遊戲體驗不完整。

**Independent Test**: 可獨立測試，需實作決策 Modal 組件、makeDecision API、DecisionRequired 與 DecisionMade 事件處理、役種顯示邏輯。測試者可驗證「形成役種 → 看到決策 Modal → 選擇繼續/結束 → 接收確認」。

**Acceptance Scenarios**:

1. **Given** 玩家獲得牌後形成「五光」役種，**When** 後端發送 DecisionRequired 事件，**Then** 系統顯示決策 Modal，標題為「役種形成！」
2. **Given** 決策 Modal 顯示中，**When** 展示當前役種資訊，**Then** 顯示役種名稱「五光」、基礎分數「15 分」、Koi-Koi 倍率「×1」、當前總分「15 分」
3. **Given** Modal 顯示潛在分數，**When** 系統預測繼續遊戲可能達成的分數，**Then** 顯示「潛在分數：可能達到 25+ 分」
4. **Given** 玩家點擊「繼續遊戲」按鈕，**When** 系統發送 makeDecision('KOI_KOI') 命令，**Then** Modal 關閉，等待 DecisionMade 事件
5. **Given** 後端確認 Koi-Koi 決策，**When** 接收 DecisionMade 事件，**Then** 更新玩家 Koi-Koi 倍率為 ×2，顯示「繼續遊戲！」訊息，遊戲繼續
6. **Given** 玩家點擊「結束本局」按鈕，**When** 系統發送 makeDecision('END_ROUND') 命令，**Then** 等待 RoundScored 事件，顯示結算畫面

---

### User Story 4 - 系統接收 SSE 事件並即時更新 UI (Priority: P1)

系統建立 SSE 連線後，持續監聽後端推送的遊戲事件（共 13 種）。每個事件對應特定的 UI 更新邏輯：更新牌面狀態、觸發動畫、顯示提示訊息、變更流程階段等。所有更新需在接收事件後 1 秒內完成，確保流暢的遊戲體驗。

**Why this priority**: SSE 事件驅動是整個前端架構的核心。沒有事件處理，UI 無法與後端同步，遊戲無法進行。

**Independent Test**: 可獨立測試，需實作 SSE 客戶端、事件路由邏輯、13 個事件處理 Use Cases、Pinia Stores 狀態更新。可使用 Mock SSE 伺服器發送測試事件，驗證「事件發送 → Use Case 觸發 → UI 更新」。

**Acceptance Scenarios**:

1. **Given** SSE 連線已建立，**When** 後端推送 TurnCompleted 事件，**Then** 系統觸發 HandleTurnCompletedUseCase，更新牌面狀態並觸發動畫
2. **Given** 接收到 YakuFormed（役種形成）事件，**When** 事件包含役種資訊，**Then** 系統顯示役種特效（發光動畫）並更新玩家役種列表
3. **Given** 接收到 RoundScored（局結束）事件，**When** 事件包含勝者與得分，**Then** 系統顯示結算畫面，分數滾動動畫從舊分數變為新分數
4. **Given** 接收到 TurnError（操作錯誤）事件，**When** 事件包含錯誤代碼 INVALID_CARD，**Then** 系統顯示錯誤提示「您選擇的卡片不在手牌中」
5. **Given** 接收到 GameFinished（遊戲結束）事件，**When** 事件包含最終勝者，**Then** 系統顯示遊戲結束畫面，提供「重新開始」與「返回首頁」按鈕
6. **Given** 事件處理觸發 UI 更新，**When** 更新完成，**Then** 整個流程在 1 秒內完成，玩家感受流暢

---

### User Story 5 - 系統處理網路中斷與自動重連 (Priority: P2)

當 SSE 連線意外中斷時（例如網路不穩定），系統自動偵測斷線並嘗試重連。重連使用指數退避策略（1s、2s、4s、8s、16s），最大等待 30 秒。若連續失敗 5 次，切換到 Fallback 短輪詢模式（每 2 秒請求快照）。重連成功後，系統自動恢復遊戲狀態，玩家可繼續遊戲。

**Why this priority**: 網路穩定性是線上遊戲的重要體驗指標。雖然不是核心玩法，但對用戶體驗影響重大，列為 P2。

**Independent Test**: 可獨立測試，需實作 SSE 重連邏輯、指數退避算法、Fallback 短輪詢、快照恢復 Use Case、連線狀態 UI。可模擬斷線場景（關閉 SSE 伺服器），驗證「偵測斷線 → 顯示重連中 → 嘗試重連 → 恢復狀態」。

**Acceptance Scenarios**:

1. **Given** SSE 連線正常運作中，**When** 網路突然中斷（EventSource onerror 觸發），**Then** 系統偵測到斷線，顯示「連線中斷，正在嘗試重連...」提示
2. **Given** 斷線偵測完成，**When** 系統開始第一次重連嘗試，**Then** 等待 1 秒後嘗試重建 EventSource 連線
3. **Given** 第一次重連失敗，**When** 系統開始第二次重連，**Then** 等待 2 秒後再次嘗試（指數退避）
4. **Given** 重連持續失敗，**When** 第三、四、五次嘗試，**Then** 分別等待 4s、8s、16s，最大等待不超過 30s
5. **Given** 重連連續失敗 5 次，**When** 指數退避達到上限，**Then** 系統切換到 Fallback 短輪詢模式，每 2 秒請求 `/api/v1/games/{gameId}/snapshot`
6. **Given** 使用短輪詢模式，**When** 接收到快照數據，**Then** 比較與本地狀態差異，僅更新變化部分，顯示「連線品質較差」提示
7. **Given** 網路恢復正常，**When** SSE 連線重建成功，**Then** 自動切回 SSE 模式，發送 joinGame 請求獲取最新狀態，觸發 HandleReconnectionUseCase
8. **Given** 重連成功並接收快照，**When** 快照包含完整遊戲狀態，**Then** 系統恢復所有牌面、分數、流程階段、役種資訊，顯示「連線已恢復」訊息（3 秒後自動消失）

---

### User Story 6 - 系統顯示動畫提升視覺回饋 (Priority: P3)

玩家操作時，系統觸發對應的動畫效果：發牌時卡片從牌堆飛向各區域、打牌時卡片平滑移動、配對成功時高亮閃爍、形成役種時發光特效、分數變化時數字滾動。所有動畫保持 60 FPS 流暢度，提升遊戲沉浸感。

**Why this priority**: 動畫提升體驗，但不是遊戲必需功能。若時間緊迫，可先實作簡單的無動畫版本，後續優化。列為 P3。

**Independent Test**: 可獨立測試，需實作 AnimationService、AnimationStore、5 種動畫類型（DEAL_CARDS、CARD_MOVE、MATCH_HIGHLIGHT、YAKU_FORMED、SCORE_UPDATE）。可在無後端情況下觸發動畫，驗證「命令觸發 → 動畫執行 → 回調完成」。

**Acceptance Scenarios**:

1. **Given** 遊戲開始發牌，**When** 觸發 DEAL_CARDS 動畫，**Then** 所有卡片從牌堆位置飛向目標區域（手牌區、場牌區），動畫時長 1.5 秒
2. **Given** 玩家打出手牌，**When** 觸發 CARD_MOVE 動畫，**Then** 手牌平滑飛向場牌區，使用 cubic-bezier 緩動曲線，動畫時長 0.5 秒
3. **Given** 配對成功，**When** 觸發 MATCH_HIGHLIGHT 動畫，**Then** 兩張配對牌同時閃爍 3 次（每次 0.2 秒），隨後飛向獲得區
4. **Given** 形成役種，**When** 觸發 YAKU_FORMED 動畫，**Then** 相關牌發光（box-shadow 擴散效果），持續 1 秒，同時顯示役種名稱浮動文字
5. **Given** 分數變化，**When** 觸發 SCORE_UPDATE 動畫，**Then** 分數從舊值滾動到新值（CountUp 效果），時長 0.8 秒
6. **Given** 動畫執行中，**When** 監控幀率，**Then** 使用 Chrome DevTools Performance 工具測量，確保 60 FPS 無掉幀
7. **Given** 多個動畫同時觸發，**When** AnimationService 管理隊列，**Then** 按照 FIFO 順序執行，前一個完成後才執行下一個

---

### Edge Cases

#### 網路與連線相關

- **斷線時玩家正在打牌**：若玩家點擊手牌後但命令未發送成功（網路中斷），系統應顯示「命令發送失敗，請重試」，允許玩家重新操作。
- **重連後遊戲狀態不一致**：若快照恢復後發現本地狀態與後端不匹配（例如手牌數量不同），系統應完全以快照為準，覆蓋本地狀態。
- **SSE 連線建立失敗**：若初次建立 SSE 連線就失敗，系統應立即切換到 Fallback 短輪詢模式，不等待指數退避。
- **重連中玩家關閉頁面**：若玩家在重連中關閉瀏覽器分頁，session_token 保存在 SessionStorage，下次開啟新分頁無法恢復（符合預期行為）。

#### 遊戲邏輯相關

- **玩家快速連續點擊**：若玩家在動畫未完成時快速點擊多張手牌，系統應忽略後續點擊，直到當前操作完成（FlowStage 恢復 AWAITING_HAND_PLAY）。
- **配對選擇超時**：若玩家在 AWAITING_SELECTION 狀態下長時間未選擇配對目標（超過 60 秒），後端可能發送 TurnError 事件強制結束回合，前端應正確處理。
- **役種形成但決策超時**：若玩家在 AWAITING_DECISION 狀態下長時間未決策（超過 60 秒），後端可能自動選擇 END_ROUND，前端接收 RoundScored 事件，應關閉 Modal 並顯示結算。
- **對手操作延遲**：若對手思考時間過長（超過 10 秒），前端應顯示「對手思考中...」提示，避免玩家誤以為卡住。

#### UI 與動畫相關

- **低效能裝置**：若用戶裝置無法維持 60 FPS（例如舊款手機），系統應偵測幀率下降，自動降低動畫複雜度（例如停用粒子效果），確保基本流暢度。
- **瀏覽器分頁切換**：若玩家切換到其他分頁，SSE 連線保持但動畫可能暫停，切回分頁時應檢查是否有遺漏事件，自動同步狀態。
- **螢幕尺寸極端情況**：若用戶使用極小螢幕（如 iPhone SE，寬度 320px），部分組件可能重疊，系統應使用 Media Query 調整佈局（例如隱藏部分裝飾性元素）。

#### 錯誤處理相關

- **API 返回非預期錯誤**：若後端返回 500 Internal Server Error，系統應顯示友善錯誤訊息「伺服器暫時無法使用，請稍後再試」，而非直接顯示 HTTP 狀態碼。
- **SSE 事件格式錯誤**：若後端推送的事件 JSON 格式不正確（例如缺少必要欄位），系統應記錄錯誤日誌但不崩潰，顯示「收到異常事件，請重新整理頁面」。
- **動畫執行中發生錯誤**：若動畫執行過程中拋出異常（例如目標元素不存在），AnimationService 應捕獲錯誤並跳過該動畫，繼續執行隊列中的下一個。

#### 資料一致性相關

- **快照恢復時卡片 ID 不存在**：若快照包含前端不認識的卡片 ID（理論上不應發生），系統應記錄錯誤並以空白卡片佔位，通知後端資料異常。
- **FlowStage 不匹配**：若快照的 current_flow_stage 為前端未實作的狀態（例如後端新增狀態但前端未更新），系統應降級到最接近的已知狀態，並顯示警告。

---

## Requirements *(mandatory)*

### Functional Requirements

#### 核心連線與通訊

- **FR-001**: 系統必須提供 API 客戶端，支援向後端發送遊戲命令（joinGame、playHandCard、selectTarget、makeDecision）
- **FR-002**: API 客戶端必須實作自動重試機制，API 命令失敗時最多重試 3 次，使用指數退避策略（1s、2s、4s）
- **FR-003**: API 客戶端必須設定預設超時時間為 5 秒，超時後拋出異常供上層處理
- **FR-004**: 系統必須提供 SSE 客戶端，建立 EventSource 連線並接收後端推送的 13 種遊戲事件
- **FR-005**: SSE 客戶端必須將接收到的事件路由到對應的 Use Case Input Port（例如 GameStarted 事件觸發 HandleGameStartedUseCase）
- **FR-006**: SSE 客戶端必須實作自動重連機制，連線中斷時使用指數退避策略（1s → 2s → 4s → 8s → 16s，最大 30s）
- **FR-007**: SSE 客戶端必須在連續重連失敗 5 次後，自動切換到 Fallback 短輪詢模式（每 2 秒請求快照）
- **FR-008**: 系統必須在 SSE 重連成功後，自動發送 joinGame 請求獲取快照，恢復遊戲狀態
- **FR-009**: 系統必須在網路錯誤時區分錯誤類型（4xx 客戶端錯誤、5xx 伺服器錯誤、Network 網路錯誤），並顯示對應的友善錯誤訊息

#### 狀態管理（Pinia Stores）

- **FR-010**: 系統必須提供 GameStateStore，管理遊戲核心狀態（gameId、flowStage、fieldCards、handCards、depositories、scores、yaku、deckRemaining、ruleset）
- **FR-011**: GameStateStore 必須實作 UpdateUIStatePort 介面，提供 7 個狀態更新方法（setFlowStage、updateFieldCards、updateHandCards、updateDepositoryCards、updateScores、updateDeckRemaining、updateKoiKoiMultiplier）
- **FR-012**: 系統必須提供 UIStateStore，管理 UI 互動狀態（selectionMode、selectionPossibleTargets、decisionModal、errorMessage、infoMessage、connectionStatus、reconnecting）
- **FR-013**: UIStateStore 必須實作 TriggerUIEffectPort 介面的非動畫部分，提供方法（showSelectionUI、showDecisionModal、showErrorMessage、setConnectionStatus 等）
- **FR-014**: 系統可選提供 AnimationStore，管理動畫隊列（animationQueue、isAnimating），實作 FIFO 隊列執行邏輯

#### Vue 組件

- **FR-015**: 系統必須提供遊戲頁面組件（GamePage.vue），使用 Flexbox 垂直排列五個區塊（TopInfoBar、OpponentDepositoryZone、FieldZone、PlayerDepositoryZone、PlayerHandZone）
- **FR-016**: 遊戲頁面必須固定 Viewport 尺寸（100vh × 100vw），禁用垂直滾動，各區塊高度比例固定（頂部 10-12%、對手獲得區 15%、場牌區 30%、玩家獲得區 15%、手牌區 25%）
- **FR-017**: 系統必須提供 CardComponent.vue，接受 Props（cardId、isSelectable、isSelected、isHighlighted），發送 Events（@click、@hover）
- **FR-018**: 系統必須提供 PlayerHandZone.vue，顯示玩家 8 張手牌（橫向排列），支援點擊打牌，hover 時顯示配對提示
- **FR-019**: 系統必須提供 FieldZone.vue，使用 2 行 4 列網格顯示 8 張場牌，高亮可配對牌
- **FR-020**: 系統必須提供 SelectionOverlay.vue，顯示配對選擇介面（浮層或 Modal），列出可選目標，高亮對應場牌
- **FR-021**: 系統必須提供 DecisionModal.vue，顯示 Koi-Koi 決策介面，展示當前役種、得分、Koi-Koi 倍率、潛在分數，提供「繼續遊戲」與「結束本局」按鈕
- **FR-022**: 系統必須提供 ErrorToast.vue，顯示錯誤訊息（自動消失或手動關閉）
- **FR-023**: 系統必須提供 ReconnectionBanner.vue，在斷線時顯示「連線中斷，正在嘗試重連...」，重連成功後顯示「連線已恢復」（3 秒後自動消失）

#### 動畫系統

- **FR-024**: 系統必須提供 AnimationService，實作 TriggerUIEffectPort.triggerAnimation 方法
- **FR-025**: AnimationService 必須支援 5 種動畫類型（DEAL_CARDS、CARD_MOVE、MATCH_HIGHLIGHT、YAKU_FORMED、SCORE_UPDATE）
- **FR-026**: AnimationService 必須管理動畫隊列，按照 FIFO 順序執行，前一個完成後才執行下一個
- **FR-027**: AnimationService 必須提供回調機制，動畫完成後通知上層（例如更新 isAnimating 狀態）
- **FR-028**: 動畫實作必須使用 Vue 的 Transition 組件或 CSS animations，確保效能（目標 60 FPS）
- **FR-029**: 系統可選使用第三方動畫庫（如 GSAP），用於複雜動畫（如粒子效果），但需確保打包體積不超過 50KB（gzipped）

#### 依賴注入（DI Container）

- **FR-030**: 系統必須在 main.ts 初始化 DI Container，註冊所有依賴（Domain Services、Use Cases、Ports 實作、Stores）
- **FR-031**: DI Container 必須註冊 Output Ports 實作（SendCommandPort → GameApiClient、UpdateUIStatePort → GameStateStore、TriggerUIEffectPort → UIStateStore + AnimationService）
- **FR-032**: DI Container 必須註冊所有 Use Cases（玩家操作 Use Cases、SSE 事件處理 Use Cases），自動注入依賴
- **FR-033**: DI Container 必須註冊 SSE 客戶端（GameEventClient），並綁定事件處理器（例如 GameStarted 事件 → HandleGameStartedUseCase）
- **FR-034**: 系統必須在 DI Container 初始化時，根據遊戲模式設定載入對應的 Adapter 實作（Backend / Local / Mock）
- **FR-035**: 系統必須提供遊戲模式切換機制，支援三種模式：
  - **Backend 模式**（線上）: 使用 GameApiClient + GameEventClient，與後端 REST API 與 SSE 通訊
  - **Local 模式**（離線）: 使用 LocalGameAdapter + LocalGameEventEmitter，完全在前端執行遊戲邏輯
  - **Mock 模式**（開發測試）: 使用 MockApiClient + MockEventEmitter，模擬後端回應與事件，無需後端伺服器

#### 遊戲模式配置

- **FR-036**: 系統必須提供遊戲模式配置機制，可透過以下方式設定：
  - **環境變數**: `VITE_GAME_MODE=backend|local|mock`（預設：backend）
  - **localStorage**: `gameMode=backend|local|mock`（開發階段可手動切換）
  - **URL 參數**: `/game?mode=mock`（方便快速測試）
- **FR-037**: 系統必須在 DI Container 初始化時，根據模式載入對應的 Adapter 實作
- **FR-038**: Mock 模式必須提供 Mock API Client，模擬所有 REST API 端點（joinGame、playHandCard、selectTarget、makeDecision）
- **FR-039**: Mock 模式必須提供 Mock Event Emitter，可程式化觸發 13 種 SSE 事件，用於 UI 測試
- **FR-040**: 系統可選提供開發者模式選擇器 UI（僅在 `import.meta.env.DEV === true` 時顯示），允許即時切換模式

#### 路由配置

- **FR-041**: 系統必須提供 Vue Router 配置，支援兩個路由（/ 首頁、/game/:gameId? 遊戲頁面）
- **FR-042**: 遊戲頁面路由必須實作 beforeEnter 守衛，執行以下邏輯：
  1. 檢查當前遊戲模式（Backend / Local / Mock）
  2. Backend 模式：檢查 sessionToken，若無則發送 joinGame 請求
  3. Local 模式：直接初始化 Local Game BC
  4. Mock 模式：初始化 Mock Adapter 並觸發模擬事件序列
- **FR-043**: 若用戶直接訪問 /game 路徑且處於 Backend 模式但無 sessionToken，系統必須自動發送 joinGame 請求（不重導向首頁）

#### 錯誤處理

- **FR-044**: 系統必須提供統一的錯誤處理服務（ErrorHandler），將後端錯誤代碼轉換為友善訊息
- **FR-045**: 錯誤訊息必須支援多語言（預設英文，未來可擴展繁中/簡中/日文）
- **FR-046**: 系統必須區分錯誤嚴重性（Critical、Warning、Info），Critical 錯誤顯示 Modal 阻斷操作，Warning 顯示 Toast 提示

#### 快照恢復

- **FR-047**: 系統必須實作 HandleReconnectionUseCase，處理快照恢復邏輯
- **FR-048**: 快照恢復必須覆蓋所有遊戲狀態（gameId、playerScores、ruleset、fieldCards、handCards、depositories、currentFlowStage、activePlayerId、koiKoiMultipliers）
- **FR-049**: 快照恢復完成後，系統必須根據 currentFlowStage 渲染對應 UI（例如 AWAITING_SELECTION 顯示選擇介面）

### Key Entities *(include if feature involves data)*

#### GameState（遊戲狀態實體）

管理遊戲核心狀態的數據實體，保存在 Pinia GameStateStore 中。

**關鍵屬性**:
- `gameId`: 當前遊戲會話唯一識別碼（UUID）
- `flowStage`: 當前流程階段（FlowStage 枚舉：AWAITING_HAND_PLAY、AWAITING_SELECTION、AWAITING_DECISION、ROUND_END、GAME_END）
- `activePlayerId`: 當前回合玩家 ID
- `fieldCards`: 場上卡片 ID 列表（最多 8 張）
- `myHandCards`: 玩家手牌 ID 列表（最多 8 張）
- `opponentHandCount`: 對手手牌數量（不顯示具體卡片）
- `myDepository`: 玩家已獲得牌列表
- `opponentDepository`: 對手已獲得牌列表
- `deckRemaining`: 牌堆剩餘數量
- `myScore`: 玩家累計分數
- `opponentScore`: 對手累計分數
- `myYaku`: 玩家當前役種列表（YakuScore 對象陣列）
- `opponentYaku`: 對手當前役種列表
- `koiKoiMultipliers`: Koi-Koi 倍率 Map（playerId → multiplier）
- `ruleset`: 規則集配置（Ruleset 對象，包含役種定義與分數）

**關聯關係**:
- 由 Use Cases 通過 UpdateUIStatePort 更新
- 被 Vue 組件讀取以渲染 UI
- 在快照恢復時完整覆蓋

---

#### UIState（UI 互動狀態實體）

管理 UI 互動相關的臨時狀態，保存在 Pinia UIStateStore 中。

**關鍵屬性**:
- `selectionMode`: 是否處於配對選擇模式（boolean）
- `selectionSourceCard`: 選擇的源卡片 ID（手牌或翻牌）
- `selectionPossibleTargets`: 可選的配對目標 ID 列表
- `decisionModalVisible`: Koi-Koi 決策 Modal 是否顯示
- `decisionModalData`: 決策 Modal 數據（當前役種、得分、潛在分數）
- `errorMessage`: 當前錯誤訊息（null 表示無錯誤）
- `infoMessage`: 當前資訊訊息（null 表示無訊息）
- `connectionStatus`: 連線狀態（'connected'、'connecting'、'disconnected'）
- `reconnecting`: 是否正在重連中（boolean）
- `animationQueue`: 動畫隊列（Animation 對象陣列）
- `isAnimating`: 是否正在執行動畫（boolean）

**關聯關係**:
- 由 Use Cases 通過 TriggerUIEffectPort 更新
- 被 Vue 組件讀取以顯示 UI 效果
- 不參與快照恢復（屬於臨時狀態）

---

#### Animation（動畫實體）

描述單個動畫任務的數據結構。

**關鍵屬性**:
- `type`: 動畫類型（AnimationType 枚舉：DEAL_CARDS、CARD_MOVE、MATCH_HIGHLIGHT、YAKU_FORMED、SCORE_UPDATE）
- `params`: 動畫參數（AnimationParams 對象，根據 type 不同而變化）
  - DEAL_CARDS: `{ targetZones: Zone[], delay: number, duration: number }`
  - CARD_MOVE: `{ cardId: string, from: Position, to: Position, duration: number }`
  - MATCH_HIGHLIGHT: `{ cardIds: string[], flashCount: number }`
  - YAKU_FORMED: `{ yakuName: string, cardIds: string[], duration: number }`
  - SCORE_UPDATE: `{ fromScore: number, toScore: number, duration: number }`
- `id`: 動畫唯一識別碼（UUID，用於隊列管理）
- `status`: 動畫狀態（'pending'、'running'、'completed'、'failed'）
- `callback`: 完成回調函數（可選）

**關聯關係**:
- 由 AnimationService 管理與執行
- 保存在 AnimationStore 的 animationQueue 中
- 執行完成後從隊列移除

---

#### EventHandler（事件處理器實體）

SSE 事件與 Use Case 的映射關係。

**關鍵屬性**:
- `eventType`: SSE 事件類型（字串，例如 'GameStarted'、'TurnCompleted'）
- `useCase`: 對應的 Use Case Input Port（可執行對象）
- `priority`: 處理優先級（可選，預設所有事件同等優先級）

**關聯關係**:
- 由 DI Container 在初始化時註冊到 GameEventClient
- GameEventClient 接收事件後查找對應的 useCase 並調用其 execute() 方法

---

#### SessionToken（會話令牌實體）

用於身份驗證與重連的會話令牌。

**關鍵屬性**:
- `token`: 令牌字串（由後端生成，UUID 格式）
- `gameId`: 關聯的遊戲 ID
- `playerId`: 關聯的玩家 ID
- `expiresAt`: 令牌過期時間（可選，目前未實作）

**關聯關係**:
- 保存在 SessionStorage（分頁隔離）
- 在 joinGame 成功後保存
- 在重連時從 SessionStorage 讀取並發送到後端

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### 效能指標

- **SC-001**: 用戶點擊「開始遊戲」後，在 2 秒內看到遊戲介面（首次有效繪製 FCP < 1.5s，最大內容繪製 LCP < 2.5s）
- **SC-002**: 用戶點擊手牌後，在 500ms 內看到場上高亮可配對牌（API 回應時間 P95 < 500ms）
- **SC-003**: 後端推送 SSE 事件後，用戶在 1 秒內看到 UI 更新（SSE 事件延遲 < 100ms + Use Case 處理時間 < 200ms + UI 渲染時間 < 700ms）
- **SC-004**: 動畫執行時保持流暢，幀率不低於 50 FPS（目標 60 FPS，允許偶爾掉到 50 FPS）
- **SC-005**: 網路中斷後，系統在 30 秒內完成自動重連並恢復遊戲狀態

#### 可靠性指標

- **SC-006**: API 命令失敗時，95% 的情況下通過重試機制成功發送（重試最多 3 次）
- **SC-007**: SSE 連線中斷後，90% 的情況下在 10 秒內成功重連（指數退避策略）
- **SC-008**: 重連後狀態恢復準確率 100%（快照數據與後端完全一致）
- **SC-009**: 錯誤訊息顯示準確率 100%（所有錯誤類型都有對應的友善訊息）

#### 使用者體驗指標

- **SC-010**: 用戶在遊戲過程中，90% 的操作能在第一次嘗試時成功完成（無需重試）
- **SC-011**: 用戶遇到網路中斷時，70% 能理解系統正在重連（通過顯示「正在重連」提示）
- **SC-012**: 用戶完成一局遊戲（從開始到結算）的平均時間為 5-10 分鐘（符合花牌遊戲的節奏）
- **SC-013**: Mock 模式下，開發者可在 10 秒內觸發任意遊戲事件序列（用於快速 UI 測試）

#### 測試覆蓋率指標

- **SC-014**: Adapter Layer 整體測試覆蓋率 > 70%（單元測試 + 整合測試）
- **SC-015**: Pinia Stores 測試覆蓋率 > 80%（所有 Actions 與 Getters）
- **SC-016**: API 客戶端測試覆蓋率 > 85%（所有端點與錯誤情況）
- **SC-017**: SSE 客戶端測試覆蓋率 > 75%（連線、事件、重連邏輯）
- **SC-018**: Vue 組件測試覆蓋率 > 60%（關鍵互動路徑）

#### 可維護性指標

- **SC-019**: 所有模組遵循 Clean Architecture 依賴規則，通過架構檢查工具驗證（例如 dependency-cruiser）
- **SC-020**: 所有 API 錯誤與 SSE 事件處理都有對應的單元測試，新增事件類型時測試可在 1 小時內完成
- **SC-021**: 新增一個 Vue 組件的平均時間 < 2 小時（包含編寫、測試、整合）
- **SC-022**: 程式碼審查時，Adapter Layer 的變更能在 30 分鐘內被審查者理解（通過清晰的命名與註解）
