# 整合事件時序圖 (v2.0 優化版)

本文檔展示 game-engine 與 game-ui 兩個 Bounded Context 之間的整合事件流程（優化後版本）。

**v2.0 主要改進**：
- 減少事件數量：一次出牌從 3-4 個事件減少到 1-2 個事件
- 嵌套數據結構：`MatchResult`, `TurnTransition`, `YakuResult`
- 原子性更好：相關信息在同一事件中，避免 UI 接收到部分狀態

---

## 完整遊戲流程（簡化）

```mermaid
sequenceDiagram
    participant UI as game-ui BC
    participant Bus as EventBus
    participant Engine as game-engine BC

    Note over UI,Engine: 遊戲初始化
    Engine->>Bus: GameInitializedEvent {<br/>  gameState: {...},<br/>  turnTransition: {currentPlayerId}<br/>}
    Bus->>UI: GameInitializedEvent
    UI->>UI: 建立 GameViewModel

    Note over UI,Engine: 玩家出牌（正常流程）
    UI->>Engine: PlayCardCommand (playerId, cardId)
    Engine->>Engine: 驗證合法性、更新狀態
    Engine->>Bus: CardPlayedEvent {<br/>  handMatch: {...},<br/>  deckMatch: {..., achievedYaku},<br/>  turnTransition: {currentPlayerId}<br/>}
    Bus->>UI: CardPlayedEvent
    UI->>UI: 一次性更新：<br/>1. 顯示配對動畫<br/>2. 顯示役種動畫<br/>3. 切換當前玩家

    Note over UI,Engine: Koi-Koi 宣告
    UI->>Engine: DeclareKoikoiCommand (playerId, declared)
    Engine->>Bus: KoikoiDeclaredEvent {<br/>  declared: true,<br/>  turnTransition: {currentPlayerId}<br/>}
    Bus->>UI: KoikoiDeclaredEvent
    UI->>UI: 顯示宣告結果並切換回合

    Note over UI,Engine: 回合結束
    Engine->>Bus: RoundEndedEvent
    Bus->>UI: RoundEndedEvent
    UI->>UI: 顯示回合結果

    Note over UI,Engine: 遊戲結束
    Engine->>Bus: GameEndedEvent
    Bus->>UI: GameEndedEvent
    UI->>UI: 顯示最終結果
```

---

## 場景 1: 玩家出牌（無配對）

```mermaid
sequenceDiagram
    participant Player as 玩家
    participant UI as game-ui
    participant Engine as game-engine
    participant State as GameState

    Player->>UI: 點擊手牌
    UI->>Engine: PlayCardCommand(playerId, cardId)
    Engine->>State: 驗證玩家可出牌
    State-->>Engine: ✓ 合法
    Engine->>State: removeFromHand(cardId)
    Engine->>State: getFieldMatches(card)
    State-->>Engine: [] (無配對)
    Engine->>State: addToField(card)
    Engine->>State: drawCard()
    State-->>Engine: deckCard
    Engine->>State: getFieldMatches(deckCard)
    State-->>Engine: [] (無配對)
    Engine->>State: addToField(deckCard)

    Engine->>UI: CardPlayedEvent {<br/>  playedCardId: "1-bright-0",<br/>  handMatch: {<br/>    matchType: "no_match",<br/>    capturedCardIds: []<br/>  },<br/>  deckMatch: {<br/>    matchType: "no_match",<br/>    capturedCardIds: []<br/>  },<br/>  turnTransition: {<br/>    currentPlayerId: "player-2"<br/>  }<br/>}
    UI->>UI: 更新 ViewModel<br/>手牌 → 場上<br/>翻牌 → 場上<br/>切換玩家
    UI->>Player: 顯示動畫
```

---

## 場景 2: 玩家出牌（有配對 + 達成役種）

**v1.0 舊方案**：需要 3 個事件
```
CardPlayedEvent → YakuAchievedEvent → PlayerTurnChangedEvent
```

**v2.0 新方案**：只需要 1 個事件
```mermaid
sequenceDiagram
    participant Player as 玩家
    participant UI as game-ui
    participant Engine as game-engine

    Player->>UI: 點擊手牌
    UI->>Engine: PlayCardCommand(playerId, cardId)
    Engine->>Engine: 檢查配對 + 役種
    Note right of Engine: 手牌配對 1 張場牌<br/>牌堆配對 1 張場牌<br/>達成三光役種

    Engine->>UI: CardPlayedEvent {<br/>  playedCardId: "1-bright-0",<br/>  handMatch: {<br/>    sourceCardId: "1-bright-0",<br/>    matchType: "single_match",<br/>    matchedFieldCardId: "1-plain-0",<br/>    capturedCardIds: ["1-bright-0", "1-plain-0"]<br/>  },<br/>  deckMatch: {<br/>    sourceCardId: "3-bright-0",<br/>    matchType: "single_match",<br/>    matchedFieldCardId: "3-plain-0",<br/>    capturedCardIds: ["3-bright-0", "3-plain-0"],<br/>    achievedYaku: [{<br/>      yaku: "SANKO",<br/>      points: 5,<br/>      cardIds: ["1-bright-0", "3-bright-0", "8-bright-0"]<br/>    }]<br/>  },<br/>  turnTransition: {<br/>    previousPlayerId: "player-1",<br/>    currentPlayerId: "player-2",<br/>    reason: "card_played"<br/>  }<br/>}

    UI->>UI: 一次性處理：<br/>1. 更新 ViewModel（4 張牌進入捕獲區）<br/>2. 播放捕獲動畫<br/>3. 播放役種達成動畫（三光）<br/>4. 切換到 player-2
    UI->>Player: 顯示完整動畫序列
```

**優勢**：
- ✅ 減少事件數量：3 個 → 1 個
- ✅ 原子性：所有相關信息在同一事件
- ✅ 簡化 UI 邏輯：不需要跨事件維護狀態
- ✅ 更容易實現動畫編排

---

## 場景 3: 牌堆翻牌多重配對（需要玩家選擇）

**v1.0 舊方案**：需要 3-4 個事件
```
CardPlayedEvent → DeckCardRevealedEvent → MatchSelectionRequiredEvent
→ [MatchSelectionTimeoutEvent] → CardPlayedEvent (final)
```

**v2.0 新方案**：只需要 2 個事件
```mermaid
sequenceDiagram
    participant Player as 玩家
    participant UI as game-ui
    participant Engine as game-engine

    Player->>UI: 點擊手牌
    UI->>Engine: PlayCardCommand(playerId, cardId)
    Engine->>Engine: 處理手牌配對
    Engine->>Engine: 翻牌
    Note right of Engine: 發現場上有 2 張同月份牌<br/>需要玩家選擇

    Engine->>UI: CardPlayedEvent {<br/>  playedCardId: "2-animal-0",<br/>  handMatch: {<br/>    matchType: "single_match",<br/>    capturedCardIds: ["2-animal-0", "2-plain-0"]<br/>  },<br/>  deckMatch: {<br/>    sourceCardId: "3-ribbon-0",<br/>    matchType: "multiple_matches",<br/>    selectableFieldCardIds: ["3-plain-0", "3-plain-1"],<br/>    selectedFieldCardId: null,<br/>    selectionTimeout: 10000<br/>  },<br/>  turnTransition: null  // 等待選擇，尚未切換<br/>}

    UI->>UI: 暫存狀態<br/>高亮可選牌<br/>啟動倒數計時器
    UI->>Player: 顯示選擇介面

    alt 玩家在時限內選擇
        Player->>UI: 點擊 "3-plain-0"
        UI->>Engine: SelectMatchCommand(deckCardId, selectedFieldCardId)
        Engine->>UI: MatchSelectedEvent {<br/>  sourceCardId: "3-ribbon-0",<br/>  selectedFieldCardId: "3-plain-0",<br/>  autoSelected: false,<br/>  capturedCardIds: ["3-ribbon-0", "3-plain-0"],<br/>  achievedYaku: null,<br/>  turnTransition: {<br/>    currentPlayerId: "player-2"<br/>  }<br/>}
        UI->>UI: 完成配對並切換回合
    else 超時未選擇
        Note over Engine: 倒數計時器到期<br/>自動選擇（按優先順序）
        Engine->>UI: MatchSelectedEvent {<br/>  sourceCardId: "3-ribbon-0",<br/>  selectedFieldCardId: "3-plain-0",<br/>  autoSelected: true,<br/>  capturedCardIds: ["3-ribbon-0", "3-plain-0"],<br/>  achievedYaku: null,<br/>  turnTransition: {<br/>    currentPlayerId: "player-2"<br/>  }<br/>}
        UI->>UI: 顯示「自動選擇」提示<br/>完成配對並切換回合
    end
```

**優勢**：
- ✅ 減少事件數量：3-4 個 → 2 個
- ✅ 明確狀態：`turnTransition: null` 表示等待選擇
- ✅ 合併超時處理：`autoSelected` 欄位區分手動/自動選擇

---

## 場景 4: Koi-Koi 宣告流程

**v1.0 舊方案**：需要 2 個事件
```
YakuAchievedEvent → KoikoiDeclaredEvent → PlayerTurnChangedEvent
```

**v2.0 新方案**：只需要 1-2 個事件
```mermaid
sequenceDiagram
    participant Player as 玩家
    participant UI as game-ui
    participant Engine as game-engine

    Note over Engine: 玩家捕獲牌後檢測役種
    Engine->>Engine: Yaku.checkYaku(capturedCards)
    Engine->>Engine: 發現役種：三光 (5分)

    Engine->>UI: CardPlayedEvent {<br/>  ...,<br/>  deckMatch: {<br/>    achievedYaku: [{<br/>      yaku: "SANKO",<br/>      points: 5,<br/>      cardIds: ["1-bright-0", "3-bright-0", "8-bright-0"]<br/>    }]<br/>  },<br/>  turnTransition: null  // 等待 Koi-Koi 選擇<br/>}

    UI->>UI: 顯示役種動畫<br/>高亮構成役種的牌
    UI->>Player: 顯示 Koi-Koi 選擇對話框<br/>「三光 5 分，要繼續嗎？」

    alt 玩家選擇 Koi-Koi（繼續）
        Player->>UI: 點擊「Koi-Koi」按鈕
        UI->>Engine: DeclareKoikoiCommand(playerId, true)
        Engine->>Engine: setKoikoiPlayer(playerId)
        Engine->>UI: KoikoiDeclaredEvent {<br/>  playerId: "player-1",<br/>  declared: true,<br/>  turnTransition: {<br/>    previousPlayerId: "player-1",<br/>    currentPlayerId: "player-2",<br/>    reason: "koikoi_declared"<br/>  }<br/>}
        UI->>UI: 顯示「Koi-Koi！」動畫<br/>切換到對手回合
    else 玩家選擇勝負（結束）
        Player->>UI: 點擊「勝負」按鈕
        UI->>Engine: DeclareKoikoiCommand(playerId, false)
        Engine->>Engine: 結束回合，計算分數
        Engine->>UI: KoikoiDeclaredEvent {<br/>  playerId: "player-1",<br/>  declared: false,<br/>  turnTransition: null  // 回合結束，不切換<br/>}
        Engine->>UI: RoundEndedEvent {<br/>  winnerId: "player-1",<br/>  roundResult: {...}<br/>}
        UI->>UI: 顯示回合結果
    end
```

**優勢**：
- ✅ 減少事件數量：3 個 → 1-2 個
- ✅ 役種信息嵌套在 `CardPlayedEvent` 中
- ✅ `turnTransition: null` 明確表示等待 Koi-Koi 決策

---

## 場景 5: 玩家放棄遊戲

```mermaid
sequenceDiagram
    participant Player as 玩家
    participant UI as game-ui
    participant Engine as game-engine

    Note over Player,Engine: 遊戲進行中（任何階段）
    Player->>UI: 點擊「放棄遊戲」按鈕
    UI->>UI: 顯示確認對話框<br/>「確定要放棄嗎？對手將自動獲勝」
    Player->>UI: 點擊「確定」
    UI->>Engine: AbandonGameCommand(playerId)
    Engine->>Engine: 結束遊戲<br/>對手獲勝
    Engine->>UI: GameAbandonedEvent {<br/>  abandonedPlayerId: "player-1",<br/>  winnerId: "player-2",<br/>  currentRound: 3,<br/>  phase: "playing"<br/>}
    UI->>UI: 顯示遊戲結束畫面<br/>「玩家 1 放棄，玩家 2 獲勝」
    Engine->>UI: GameEndedEvent {<br/>  winnerId: "player-2",<br/>  reason: "player_abandoned",<br/>  finalResult: {...}<br/>}
    UI->>UI: 顯示最終結果
```

---

## 場景 6: 事件遺失與重新同步

```mermaid
sequenceDiagram
    participant UI as game-ui
    participant Engine as game-engine

    Note over UI,Engine: 正常遊戲進行中
    Engine->>UI: CardPlayedEvent (seq: 10)
    UI->>UI: 處理成功<br/>lastProcessedSeq = 10

    Engine->>UI: MatchSelectedEvent (seq: 11)
    UI->>UI: 處理成功<br/>lastProcessedSeq = 11

    Note over UI,Engine: ⚠️ 事件 12 遺失（網路問題）

    Engine->>UI: KoikoiDeclaredEvent (seq: 13)
    UI->>UI: ❌ 檢測到序號不連續<br/>expected 12, got 13
    UI->>UI: 暫停處理新事件<br/>paused = true

    UI->>Engine: RequestFullStateSyncCommand
    Engine->>Engine: 準備完整狀態快照
    Engine->>UI: GameInitializedEvent (seq: 14) {<br/>  gameState: {完整當前狀態},<br/>  turnTransition: {...}<br/>}
    UI->>UI: 完整替換 ViewModel<br/>lastProcessedSeq = 14
    UI->>UI: 恢復事件處理<br/>paused = false

    Note over UI,Engine: 同步完成，繼續正常遊戲
    Engine->>UI: CardPlayedEvent (seq: 15)
    UI->>UI: 處理成功
```

---

## 事件資料量估算（v2.0）

| 事件類型 | 估算大小 | v1.0 大小 | 備註 |
|---------|---------|----------|------|
| `GameInitializedEvent` | ~5KB | ~5KB | 完整快照，包含 48 張牌定義 + turnTransition |
| `CardPlayedEvent` (簡單) | ~250B | ~200B | 增加 turnTransition (+50B) |
| `CardPlayedEvent` (含役種) | ~400B | 200B+300B=500B | 合併 YakuAchievedEvent，減少 100B |
| `MatchSelectedEvent` | ~200B | 100B+200B=300B | 合併 MatchSelectionTimeoutEvent，減少 100B |
| `KoikoiDeclaredEvent` | ~150B | 100B+100B=200B | 合併 PlayerTurnChangedEvent，減少 50B |
| `RoundEndedEvent` | ~500B | ~500B | 不變 |
| `GameEndedEvent` | ~400B | ~400B | 不變 |
| `GameAbandonedEvent` | ~150B | ~150B | 不變 |

**v2.0 優勢**：
- ✅ 雖然單個事件略大（+50-100B），但總傳輸量減少（少發送 2-3 個事件）
- ✅ 例如：出牌+役種+切換回合
  - v1.0: 200B + 300B + 100B = 600B（3 個事件）
  - v2.0: 400B（1 個事件）
  - **節省 33% 傳輸量**

**符合 SC-002**: 非初始化事件大小 <1KB ✅

---

## 事件順序保證

### 單一回合的典型事件序列（v2.0）

```
1. GameInitializedEvent           (初始化 + 初始回合資訊)
2. CardPlayedEvent                 (玩家 1 出牌，包含回合切換)
3. CardPlayedEvent                 (玩家 2 出牌，包含回合切換)
4. CardPlayedEvent                 (玩家 1 出牌，含役種，turnTransition: null)
5. KoikoiDeclaredEvent             (玩家 1 選擇 Koi-Koi，包含回合切換)
6. CardPlayedEvent                 (玩家 2 出牌，包含回合切換)
...
N. RoundEndedEvent                 (回合結束)
```

**與 v1.0 對比**：
- v1.0: 每次出牌需要 2-4 個事件
- v2.0: 每次出牌只需要 1-2 個事件
- **事件總數減少 40-50%**

### 保證機制

1. **序號遞增**: 每個事件的 `sequenceNumber` 嚴格遞增
2. **檢測遺失**: game-ui 檢查序號連續性
3. **自動同步**: 一旦檢測到序號跳號，立即請求完整快照
4. **冪等處理**: 重複接收相同序號的事件會被忽略

---

## 錯誤處理

### 事件處理失敗

```mermaid
sequenceDiagram
    participant Engine as game-engine
    participant Bus as EventBus
    participant UI as game-ui

    Engine->>Bus: CardPlayedEvent
    Bus->>UI: CardPlayedEvent
    UI->>UI: ❌ 處理失敗（例外）
    UI->>UI: 記錄錯誤日誌
    UI->>UI: 顯示錯誤提示<br/>「狀態同步失敗，請重新整理」
    Note over UI: 使用者重新整理頁面
    UI->>Engine: RequestFullStateSyncCommand
    Engine->>UI: GameInitializedEvent
    UI->>UI: 重建 ViewModel
```

### 指令執行失敗

```mermaid
sequenceDiagram
    participant UI as game-ui
    participant Engine as game-engine

    UI->>Engine: PlayCardCommand(playerId, cardId)
    Engine->>Engine: ❌ 驗證失敗<br/>（非當前玩家）
    Engine-->>UI: CommandFailedResponse {<br/>  success: false,<br/>  error: "errors.notYourTurn"<br/>}
    UI->>UI: 顯示錯誤提示<br/>「尚未輪到您出牌」
    Note over UI: 不發送任何事件
```

---

## v2.0 優化總結

### 核心改進

1. **減少事件數量**
   - 一次出牌：3-4 個事件 → 1-2 個事件
   - 整場遊戲：減少 40-50% 事件總數

2. **嵌套數據結構**
   - `MatchResult` - 配對結果（包含役種）
   - `TurnTransition` - 回合切換資訊
   - `YakuResult` - 役種結果

3. **更好的原子性**
   - 所有相關信息在同一事件中
   - 避免 UI 接收到部分狀態
   - 減少跨事件狀態維護

4. **更符合業務語義**
   - "打出牌" 是一個完整動作
   - 不需要拆分成多個技術性事件

5. **簡化 UI 處理邏輯**
   ```typescript
   // ✅ v2.0: 一次性處理完整
   onCardPlayed(event) {
     this.updateMatches(event.handMatch, event.deckMatch)
     if (event.deckMatch.achievedYaku) {
       this.showYakuAnimation(event.deckMatch.achievedYaku)
     }
     if (event.turnTransition) {
       this.switchPlayer(event.turnTransition.currentPlayerId)
     }
   }
   ```

6. **更容易實現動畫編排**
   - UI 一次性獲得所有動畫數據
   - 按順序播放：配對 → 役種 → 回合切換

---

## 參考資料

- [data-model.md](../data-model.md) - 詳細的資料模型定義
- [integration-events-schema.json](./integration-events-schema.json) - JSON Schema 契約
- [OPTIMIZATION_PROPOSAL.md](./OPTIMIZATION_PROPOSAL.md) - 完整優化提案
- [Mermaid 官方文件](https://mermaid.js.org/)
