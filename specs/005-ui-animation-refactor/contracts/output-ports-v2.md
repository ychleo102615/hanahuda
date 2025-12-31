# Output Ports Contract v2

**Feature**: 005-ui-animation-refactor
**Date**: 2025-11-21
**Purpose**: 重構 Output Ports，將原有的 UIStatePort + TriggerUIEffectPort 拆分為三個職責更清晰的 Port

## 概述

本契約定義重構後的 Output Ports 介面規範。主要變更是將動畫和通知從原有的混合 Port 中分離，形成三個獨立的 Port。

**變更摘要**：
- `UIStatePort` → `GameStatePort`（純狀態）
- `TriggerUIEffectPort` → `AnimationPort` + `NotificationPort`

**總數**: 4 個介面（含 SendCommandPort 不變）

---

## 1. SendCommandPort（不變）

詳見原有契約 `specs/003-ui-application-layer/contracts/output-ports.md`

---

## 2. GameStatePort

### 職責

管理純遊戲數據狀態，不觸發任何視覺效果。所有方法都是同步的狀態更新。

### 介面定義

```typescript
export interface GameStatePort {
  // 初始化
  initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void
  restoreGameState(snapshot: GameSnapshotRestore): void

  // 狀態更新
  setFlowStage(stage: FlowState): void
  setActivePlayer(playerId: string): void
  updateFieldCards(cards: string[]): void
  updateHandCards(cards: string[]): void
  updateOpponentHandCount(count: number): void
  updateDepositoryCards(playerCards: string[], opponentCards: string[]): void
  updateScores(playerScore: number, opponentScore: number): void
  updateDeckRemaining(count: number): void
  updateYaku(playerYaku: YakuScore[], opponentYaku: YakuScore[]): void

  // 查詢
  getLocalPlayerId(): string
  getFieldCards(): string[]
  getDepositoryCards(playerId: string): string[]
}
```

### 實作要求

- ✅ 所有方法同步執行（無 Promise）
- ✅ 深拷貝所有陣列和物件
- ✅ 不觸發任何動畫或視覺效果
- ✅ 由 Pinia Store 實作

---

## 3. AnimationPort

### 職責

管理所有動畫效果，支援異步等待。**純語意化 API**，Use Case 只表達「意圖」，不關心位置計算。

> ⚠️ **Clean Architecture 注意**：AnimationPort 是 Application Layer 的 Output Port，不應包含任何 DOM API（如 HTMLElement）。
> Zone 註冊由 Adapter 層內部處理，不暴露到 Port 介面。

### 介面定義

```typescript
export interface AnimationPort {
  // 高階動畫 API（Use Case 調用，純語意化）
  playDealAnimation(params: DealAnimationParams): Promise<void>        // 回合開始批量發牌 (16張)
  playCardToFieldAnimation(cardId: string, isOpponent: boolean): Promise<void>  // 手牌打到場上
  playMatchAnimation(handCardId: string, fieldCardId: string): Promise<void>  // 配對合併效果
  playToDepositoryAnimation(cardIds: string[], targetType: CardType, isOpponent: boolean): Promise<void>  // 移至獲得區
  playFlipFromDeckAnimation(cardId: string): Promise<void>             // 翻牌階段單張翻牌

  // 控制
  interrupt(): void
  isAnimating(): boolean

  // 注意：Zone 註冊不在此 Port 中
  // 由 Adapter 層內部的 ZoneRegistry 處理，Use Case 不需要知道
}

// 參數類型
interface DealAnimationParams {
  fieldCards: string[]
  playerHandCards: string[]
  opponentHandCount: number
}
```

### 方法規範

#### 3.1 playDealAnimation

**簽名**:
```typescript
playDealAnimation(params: DealAnimationParams): Promise<void>
```

**行為規範**:
1. 從牌堆依序發牌到場牌區（8 張）
2. 從牌堆依序發牌到玩家手牌區（8 張）
3. 對手手牌直接出現（不播放動畫）
4. 總時長控制在 2 秒內
5. Promise 在所有動畫完成後 resolve

**時序**:
```
0ms:     牌堆 → 場牌[0]
100ms:   牌堆 → 場牌[1]
...
700ms:   牌堆 → 場牌[7]
800ms:   牌堆 → 手牌[0]
...
1500ms:  牌堆 → 手牌[7]
1800ms:  Promise resolve
```

---

#### 3.2 playCardToFieldAnimation

**簽名**:
```typescript
playCardToFieldAnimation(cardId: string, isOpponent: boolean): Promise<void>
```

**參數**:
- `cardId: string` - 要移動的卡片 ID
- `isOpponent: boolean` - false 表示玩家出牌，true 表示對手出牌

**行為規範**:
1. 卡片從手牌區移動至場牌區
2. 若 `isOpponent` 為 false，起點為玩家手牌區
3. 若 `isOpponent` 為 true，起點為對手手牌區
4. 總時長約 200ms

**使用場景**: 玩家或對手打出手牌到場上（無配對時）

---

#### 3.3 playMatchAnimation

**簽名**:
```typescript
playMatchAnimation(handCardId: string, fieldCardId: string): Promise<void>
```

**行為規範**:
1. 在場牌位置顯示合併特效（縮放 + 發光）
2. **不包含卡片移動**，移動由 `playCardToFieldAnimation` 處理
3. 總時長約 150ms

**動畫流程**:
```
Stage 1 (150ms): 合併效果（縮放 + 發光）
```

**使用場景**: 手牌已移動至場牌位置後，播放配對成功特效

**完整配對動畫流程**:
```typescript
// 1. 手牌移動到場牌位置
await animation.playCardToFieldAnimation(handCardId, false)
// 2. 播放合併特效
await animation.playMatchAnimation(handCardId, fieldCardId)
// 3. 移至獲得區
await animation.playToDepositoryAnimation([handCardId, fieldCardId], cardType, false)
```

---

#### 3.4 playToDepositoryAnimation

**簽名**:
```typescript
playToDepositoryAnimation(cardIds: string[], targetType: CardType, isOpponent: boolean): Promise<void>
```

**參數**:
- `cardIds: string[]` - 配對的牌 ID 列表（通常 2 張）
- `targetType: CardType` - 牌的類型，決定進入哪個分組
- `isOpponent: boolean` - false 表示玩家獲得區，true 表示對手獲得區

**行為規範**:
1. 卡片從當前位置移動至獲得區對應分組
2. 支援 1-2 張卡片同時移動
3. 總時長約 300ms

**使用場景**: 配對成功後，兩張牌移至玩家或對手獲得區

---

#### 3.5 playFlipFromDeckAnimation

**簽名**:
```typescript
playFlipFromDeckAnimation(cardId: string): Promise<void>
```

**參數**:
- `cardId: string` - 從牌堆翻出的卡片 ID

**行為規範**:
1. 單張卡片從牌堆位置移動至場牌區
2. 卡片翻面效果（從牌背到牌面）
3. 總時長約 300ms

**使用場景**: 翻牌階段，玩家打完手牌後從牌堆翻一張牌

**與 playDealAnimation 區別**:
- `playDealAnimation`: 回合開始批量發牌（16 張），有間隔延遲
- `playFlipFromDeckAnimation`: 翻牌階段單張翻牌，無延遲

---

#### 3.6 interrupt

**簽名**:
```typescript
interrupt(): void
```

**行為規範**:
1. 立即停止所有進行中的動畫
2. 清空動畫佇列
3. 所有 pending Promise reject `InterruptedError`
4. 用於狀態同步（如重連）

---

#### 3.7 Zone Registry（Adapter Layer Internal）

> ⚠️ **注意**：Zone 註冊**不屬於 AnimationPort 介面**，是 Adapter 層的內部實現。
> 此處僅作文檔說明，實際由 Vue 組件直接調用 Adapter 層的 ZoneRegistry。

**Adapter 層實現**:
```typescript
// Adapter Layer Only - 不是 Port 介面
interface ZoneRegistry {
  register(zoneName: ZoneName, element: HTMLElement): void
  unregister(zoneName: ZoneName): void
  getPosition(zoneName: ZoneName): ZonePosition | null
}
```

**使用方式**（Adapter 層組件）:
- 組件 onMounted 時調用 `zoneRegistry.register()`
- 組件 onUnmounted 時調用 `zoneRegistry.unregister()`
- AnimationService 內部使用 ZoneRegistry 查詢位置

**ZoneName 定義**（Adapter 層類型）:
```typescript
type ZoneName =
  | 'deck'
  | 'field'
  | 'player-hand'
  | 'opponent-hand'
  | 'player-depository'
  | 'opponent-depository'
  | `player-depository-${CardType}`
  | `opponent-depository-${CardType}`
```

### 實作要求

- ✅ 所有動畫方法返回 Promise
- ✅ 使用 async/await 模式管理動畫時序（無需 AnimationQueue）
- ✅ 內部管理 ZoneRegistry 和 AnimationLayerStore
- ✅ 使用 @vueuse/motion 實現動畫
- ✅ 動畫期間 isAnimating() 返回 true
- ✅ 支援中斷機制

---

## 4. NotificationPort

### 職責

管理所有通知、Modal、提示等 UI 反饋，不涉及遊戲狀態或動畫。

### 介面定義

```typescript
export interface NotificationPort {
  // 選擇 UI
  showSelectionUI(possibleTargets: string[]): void
  hideSelectionUI(): void

  // Modal
  showDecisionModal(currentYaku: YakuScore[], currentScore: number): void
  showGameFinishedUI(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void
  showRoundDrawnUI(currentTotalScores: PlayerScore[]): void

  // Toast/Snackbar
  showErrorMessage(message: string): void
  showSuccessMessage(message: string): void
  showReconnectionMessage(): void

  // 狀態查詢
  isModalVisible(): boolean
}
```

### 方法規範

#### 4.1 showSelectionUI

**簽名**:
```typescript
showSelectionUI(possibleTargets: string[]): void
```

**行為規範**:
1. 設置選擇模式狀態
2. 高亮 possibleTargets 中的卡片
3. 禁用其他卡片點擊
4. 顯示提示：「請選擇要配對的卡片」

---

#### 4.2 hideSelectionUI

**簽名**:
```typescript
hideSelectionUI(): void
```

**行為規範**:
1. 清除選擇模式狀態
2. 移除所有高亮
3. 恢復卡片點擊

---

#### 4.3 showDecisionModal

**簽名**:
```typescript
showDecisionModal(currentYaku: YakuScore[], currentScore: number): void
```

**行為規範**:
1. 顯示 Koi-Koi 決策 Modal
2. 顯示當前役種和分數
3. 提供「繼續」和「結束」按鈕
4. Modal 阻止背景操作

---

### 實作要求

- ✅ 所有方法同步執行
- ✅ 由 UIStateStore 實作（管理 modal/toast 狀態）
- ✅ 支援多個 toast 堆疊
- ✅ Modal 自動處理 ESC 鍵關閉

---

## 5. Use Case 整合範例

### HandleRoundDealtUseCase

```typescript
class HandleRoundDealtUseCase {
  constructor(
    private gameState: GameStatePort,
    private animation: AnimationPort
  ) {}

  async execute(event: RoundDealt): Promise<void> {
    // 1. 播放發牌動畫
    await this.animation.playDealAnimation({
      fieldCards: event.field_cards,
      playerHandCards: event.player_hand,
      opponentHandCount: event.opponent_hand_count
    })

    // 2. 更新狀態（動畫完成後）
    this.gameState.updateFieldCards(event.field_cards)
    this.gameState.updateHandCards(event.player_hand)
    this.gameState.updateOpponentHandCount(event.opponent_hand_count)
    this.gameState.updateDeckRemaining(event.deck_remaining)
    this.gameState.setFlowStage('AWAITING_HAND_PLAY')
  }
}
```

### HandleTurnProgressAfterSelectionUseCase（配對動畫範例）

```typescript
// 現有 Use Case 重構後的動畫整合範例
class HandleTurnProgressAfterSelectionUseCase {
  constructor(
    private gameState: GameStatePort,
    private animation: AnimationPort,
    private notification: NotificationPort
  ) {}

  async execute(event: TurnProgressAfterSelection): Promise<void> {
    // 1. 隱藏選擇 UI
    this.notification.hideSelectionUI()

    // 2. 播放配對動畫（若有配對）
    if (event.matched_cards) {
      await this.animation.playMatchAnimation(
        event.matched_cards.hand_card,
        event.matched_cards.field_card
      )

      // 3. 播放移動至獲得區動畫
      const cardType = getCardType(event.matched_cards.hand_card)
      await this.animation.playToDepositoryAnimation(
        [event.matched_cards.hand_card, event.matched_cards.field_card],
        cardType
      )
    }

    // 4. 更新狀態
    this.gameState.updateFieldCards(event.new_field_cards)
    this.gameState.updateDepositoryCards(
      event.player_depository,
      event.opponent_depository
    )
  }
}
```

### HandleReconnectionUseCase（中斷動畫範例）

```typescript
// 現有 Use Case 重構後的動畫整合範例
class HandleReconnectionUseCase {
  constructor(
    private gameState: GameStatePort,
    private animation: AnimationPort,
    private notification: NotificationPort
  ) {}

  execute(snapshot: GameSnapshotRestore): void {
    // 1. 中斷所有動畫
    this.animation.interrupt()

    // 2. 直接恢復狀態（無動畫）
    this.gameState.restoreGameState(snapshot)

    // 3. 顯示重連訊息
    this.notification.showReconnectionMessage()
  }
}
```

---

## 6. 遷移計畫

### Phase 1：新增 Port 定義
- 在 Application Layer 新增 AnimationPort 和 NotificationPort 介面
- 保留原有 TriggerUIEffectPort（標記 @deprecated）

### Phase 2：實作 Adapter
- 實作 AnimationPortAdapter（包裝現有 AnimationService + ZoneRegistry）
- 實作 NotificationPortAdapter（從 UIStateStore 抽取）
- 更新 DI Container

### Phase 3：遷移 Use Cases
- 逐一更新 Use Case 的 Port 注入
- 調整事件處理流程（先動畫後狀態）

### Phase 4：清理
- 移除 TriggerUIEffectPort
- 更新所有測試

---

## 7. 測試要求

### AnimationPort 測試
- [ ] playDealAnimation 正確時序
- [ ] playMatchAnimation 完成 Promise resolve
- [ ] interrupt 清空佇列並 reject pending Promises

### ZoneRegistry 測試（Adapter 層）
- [ ] register/unregister 正確追蹤區域
- [ ] getPosition 返回正確座標

### NotificationPort 測試
- [ ] showSelectionUI 設置正確狀態
- [ ] showDecisionModal 阻止背景操作
- [ ] showErrorMessage 自動消失

### Use Case 整合測試
- [ ] 動畫完成後才更新狀態
- [ ] 重連時正確中斷動畫

---

## 版本歷史

- **2.0.0** (2025-11-21): 重構 Output Ports，拆分為 GameStatePort + AnimationPort + NotificationPort
