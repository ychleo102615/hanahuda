# 整合事件時序圖

本文檔展示 game-engine 與 game-ui 兩個 Bounded Context 之間的整合事件流程。

---

## 完整遊戲流程

```mermaid
sequenceDiagram
    participant UI as game-ui BC
    participant Bus as EventBus
    participant Engine as game-engine BC

    Note over UI,Engine: 遊戲初始化
    Engine->>Bus: GameInitializedEvent (完整快照)
    Bus->>UI: GameInitializedEvent
    UI->>UI: 建立 GameViewModel

    Note over UI,Engine: 玩家出牌（正常流程）
    UI->>Engine: PlayCardCommand (playerId, cardId)
    Engine->>Engine: 驗證合法性、更新狀態
    Engine->>Bus: CardPlayedEvent (增量)
    Bus->>UI: CardPlayedEvent
    UI->>UI: 更新 ViewModel

    Engine->>Bus: PlayerTurnChangedEvent
    Bus->>UI: PlayerTurnChangedEvent
    UI->>UI: 切換當前玩家

    Note over UI,Engine: 玩家湊成役種
    Engine->>Engine: 檢測役種
    Engine->>Bus: YakuAchievedEvent
    Bus->>UI: YakuAchievedEvent
    UI->>UI: 顯示役種動畫

    Note over UI,Engine: Koi-Koi 宣告
    UI->>Engine: DeclareKoikoiCommand (playerId, declared)
    Engine->>Bus: KoikoiDeclaredEvent
    Bus->>UI: KoikoiDeclaredEvent
    UI->>UI: 顯示宣告結果

    Note over UI,Engine: 回合結束
    Engine->>Engine: 計算分數
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

    Engine->>UI: CardPlayedEvent {<br/>  handCapturedCardIds: [],<br/>  deckCapturedCardIds: []<br/>}
    UI->>UI: 更新 ViewModel<br/>手牌 → 場上<br/>翻牌 → 場上
    UI->>Player: 顯示動畫
```

---

## 場景 2: 玩家出牌（有配對）

```mermaid
sequenceDiagram
    participant Player as 玩家
    participant UI as game-ui
    participant Engine as game-engine

    Player->>UI: 點擊手牌
    UI->>Engine: PlayCardCommand(playerId, cardId)
    Engine->>Engine: 檢查配對
    Note right of Engine: 場上有 1 張同月份牌
    Engine->>Engine: 自動配對並捕獲
    Engine->>UI: CardPlayedEvent {<br/>  playedCardId: "1-bright-0",<br/>  handMatchedFieldCardId: "1-plain-0",<br/>  handCapturedCardIds: ["1-bright-0", "1-plain-0"],<br/>  deckCardId: "2-animal-0",<br/>  deckMatchedFieldCardId: "2-plain-0",<br/>  deckCapturedCardIds: ["2-animal-0", "2-plain-0"]<br/>}
    UI->>UI: 更新 ViewModel<br/>4 張牌進入捕獲區
    UI->>Player: 顯示捕獲動畫
```

---

## 場景 3: 牌堆翻牌多重配對（需要玩家選擇）

```mermaid
sequenceDiagram
    participant Player as 玩家
    participant UI as game-ui
    participant Engine as game-engine

    Player->>UI: 點擊手牌
    UI->>Engine: PlayCardCommand(playerId, cardId)
    Engine->>Engine: 處理手牌配對
    Engine->>Engine: 翻牌
    Note right of Engine: 發現場上有 2 張同月份牌

    Engine->>UI: DeckCardRevealedEvent {<br/>  deckCardId: "3-ribbon-0",<br/>  matchableFieldCardIds: ["3-plain-0", "3-plain-1"]<br/>}
    UI->>UI: 暫存狀態

    Engine->>UI: MatchSelectionRequiredEvent {<br/>  sourceCardId: "3-ribbon-0",<br/>  sourceType: "deck",<br/>  selectableFieldCardIds: ["3-plain-0", "3-plain-1"],<br/>  timeoutMs: 10000<br/>}
    UI->>UI: 高亮可選牌<br/>啟動倒數計時器
    UI->>Player: 顯示選擇介面

    alt 玩家在時限內選擇
        Player->>UI: 點擊 "3-plain-0"
        UI->>Engine: SelectMatchCommand(deckCardId, selectedFieldCardId)
        Engine->>UI: CardPlayedEvent {<br/>  deckMatchedFieldCardId: "3-plain-0",<br/>  deckCapturedCardIds: ["3-ribbon-0", "3-plain-0"]<br/>}
        UI->>UI: 完成配對
    else 超時未選擇
        Note over UI: 倒數計時器到期
        Engine->>Engine: 自動選擇（按優先順序）<br/>光 > 種 > 短 > カス
        Engine->>UI: MatchSelectionTimeoutEvent {<br/>  autoSelectedFieldCardId: "3-plain-0",<br/>  reason: "timeout_auto_select"<br/>}
        UI->>UI: 顯示提示「自動選擇」
        Engine->>UI: CardPlayedEvent {<br/>  deckMatchedFieldCardId: "3-plain-0",<br/>  deckCapturedCardIds: ["3-ribbon-0", "3-plain-0"]<br/>}
        UI->>UI: 完成配對
    end
```

---

## 場景 4: Koi-Koi 宣告流程

```mermaid
sequenceDiagram
    participant Player as 玩家
    participant UI as game-ui
    participant Engine as game-engine

    Note over Engine: 玩家捕獲牌後檢測役種
    Engine->>Engine: Yaku.checkYaku(capturedCards)
    Engine->>Engine: 發現役種：三光 (5分)
    Engine->>UI: YakuAchievedEvent {<br/>  playerId: "player-1",<br/>  yakuResults: [{<br/>    yaku: "SANKO",<br/>    points: 5,<br/>    cardIds: ["1-bright-0", "3-bright-0", "8-bright-0"]<br/>  }],<br/>  totalScore: 5<br/>}
    UI->>UI: 顯示役種動畫<br/>高亮構成役種的牌

    alt 手牌未用盡
        Note over Engine: phase = 'koikoi'
        UI->>Player: 顯示 Koi-Koi 選擇對話框<br/>「三光 5 分，要繼續嗎？」

        alt 玩家選擇 Koi-Koi（繼續）
            Player->>UI: 點擊「Koi-Koi」按鈕
            UI->>Engine: DeclareKoikoiCommand(playerId, true)
            Engine->>Engine: setKoikoiPlayer(playerId)
            Engine->>UI: KoikoiDeclaredEvent {<br/>  playerId: "player-1",<br/>  declared: true<br/>}
            UI->>UI: 顯示「Koi-Koi！」動畫
            Engine->>UI: PlayerTurnChangedEvent
            UI->>UI: 切換到對手回合
        else 玩家選擇勝負（結束）
            Player->>UI: 點擊「勝負」按鈕
            UI->>Engine: DeclareKoikoiCommand(playerId, false)
            Engine->>Engine: 結束回合，計算分數
            Engine->>UI: KoikoiDeclaredEvent {<br/>  playerId: "player-1",<br/>  declared: false<br/>}
            Engine->>UI: RoundEndedEvent {<br/>  winnerId: "player-1",<br/>  roundResult: {...}<br/>}
            UI->>UI: 顯示回合結果
        end
    else 手牌已用盡
        Note over Engine: 自動結束回合
        Engine->>UI: RoundEndedEvent
        UI->>UI: 顯示回合結果
    end
```

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

    Engine->>UI: YakuAchievedEvent (seq: 11)
    UI->>UI: 處理成功<br/>lastProcessedSeq = 11

    Note over UI,Engine: ⚠️ 事件 12 遺失（網路問題）

    Engine->>UI: PlayerTurnChangedEvent (seq: 13)
    UI->>UI: ❌ 檢測到序號不連續<br/>expected 12, got 13
    UI->>UI: 暫停處理新事件<br/>paused = true

    UI->>Engine: RequestFullStateSyncCommand
    Engine->>Engine: 準備完整狀態快照
    Engine->>UI: GameInitializedEvent (seq: 14) {<br/>  gameState: {完整當前狀態}<br/>}
    UI->>UI: 完整替換 ViewModel<br/>lastProcessedSeq = 14
    UI->>UI: 恢復事件處理<br/>paused = false

    Note over UI,Engine: 同步完成，繼續正常遊戲
    Engine->>UI: CardPlayedEvent (seq: 15)
    UI->>UI: 處理成功
```

---

## 事件資料量估算

| 事件類型 | 估算大小 | 備註 |
|---------|---------|------|
| `GameInitializedEvent` | ~5KB | 完整快照，包含 48 張牌定義 |
| `CardPlayedEvent` | ~200B | 增量事件，僅 ID |
| `YakuAchievedEvent` | ~300B | 包含役種列表 |
| `KoikoiDeclaredEvent` | ~100B | 最小事件 |
| `RoundEndedEvent` | ~500B | 回合結果摘要 |
| `GameEndedEvent` | ~400B | 最終結果 |
| `GameAbandonedEvent` | ~150B | 放棄資訊 |

**符合 SC-002**: 非初始化事件大小 <1KB ✅

---

## 事件順序保證

### 單一回合的典型事件序列

```
1. GameInitializedEvent           (初始化)
2. CardPlayedEvent                 (玩家 1 出牌)
3. PlayerTurnChangedEvent          (切換到玩家 2)
4. CardPlayedEvent                 (玩家 2 出牌)
5. PlayerTurnChangedEvent          (切換到玩家 1)
6. CardPlayedEvent                 (玩家 1 出牌)
7. YakuAchievedEvent               (玩家 1 湊成役種)
8. KoikoiDeclaredEvent             (玩家 1 選擇 Koi-Koi)
9. PlayerTurnChangedEvent          (切換到玩家 2)
10. CardPlayedEvent                (玩家 2 出牌)
...
N. RoundEndedEvent                 (回合結束)
```

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

## 時序圖使用說明

### Mermaid 語法

本文檔使用 Mermaid 語法繪製時序圖，可在以下環境中渲染：
- GitHub Markdown
- GitLab Markdown
- VS Code (安裝 Mermaid 擴充套件)
- 線上工具: https://mermaid.live/

### 圖例說明

- `-->`: 回應訊息（虛線箭頭）
- `->>`: 主動訊息（實線箭頭）
- `Note over`: 註解
- `alt / else / end`: 條件分支
- `loop / end`: 迴圈

---

## 參考資料

- [data-model.md](../data-model.md) - 詳細的資料模型定義
- [integration-events-schema.json](./integration-events-schema.json) - JSON Schema 契約
- [Mermaid 官方文件](https://mermaid.js.org/)
