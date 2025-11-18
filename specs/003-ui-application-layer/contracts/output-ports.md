# Output Ports Contract

**Feature**: 003-ui-application-layer
**Date**: 2025-11-14
**Purpose**: 定義 Application Layer 依賴的 Output Ports 介面規範，由 Adapter Layer 實作

## 概述

Output Ports 由 Application Layer 定義，Adapter Layer 實作。Use Cases 通過這些 Ports 與外部世界互動（發送命令、更新 UI、觸發效果），實現依賴反轉。

**總數**: 3 個介面

---

## 1. SendCommandPort

### 職責

發送命令到後端 API，用於玩家操作（打牌、選擇配對、Koi-Koi 決策）。

### 介面定義

```typescript
export interface SendCommandPort {
  playHandCard(cardId: string, target?: string): Promise<void>
  selectTarget(source: string, target: string): Promise<void>
  makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void>
}
```

---

### 方法規範

#### 1.1 playHandCard

**簽名**:
```typescript
playHandCard(cardId: string, target?: string): Promise<void>
```

**參數**:
- `cardId: string` - 要打出的手牌 ID（必填，4 位數字字串，如 "0341"）
- `target?: string` - 配對目標 ID（可選，4 位數字字串）
  - 若省略，表示無配對或由伺服器自動選擇

**行為規範**:
1. 構建 `TurnPlayHandCard` 命令：
   ```typescript
   {
     command_type: 'TurnPlayHandCard',
     game_id: string,      // 從遊戲上下文獲取
     player_id: string,    // 從遊戲上下文獲取
     card_id: cardId,
     target_card_id: target  // 可選
   }
   ```
2. 發送 POST 請求到後端 API：`POST /api/games/{game_id}/commands/play-hand-card`
3. 若請求成功（HTTP 2xx），Promise resolve
4. 若請求失敗（HTTP 4xx/5xx、網路錯誤），Promise reject 並拋出錯誤

**錯誤處理**:
- 網路錯誤: `NetworkError`
- 伺服器錯誤: `ServerError` (包含 HTTP status code)
- 超時錯誤: `TimeoutError` (超過 5 秒)

**實作要求**:
- ✅ 必須使用 POST 方法
- ✅ 必須包含 `Content-Type: application/json`
- ✅ 必須處理超時（建議 5 秒）
- ✅ 錯誤必須包含可讀訊息

**範例實作**（Adapter Layer）:
```typescript
async playHandCard(cardId: string, target?: string): Promise<void> {
  const gameContext = useGameStore().context // Pinia Store

  const command: TurnPlayHandCard = {
    command_type: 'TurnPlayHandCard',
    game_id: gameContext.gameId,
    player_id: gameContext.playerId,
    card_id: cardId,
    target_card_id: target
  }

  const response = await fetch(
    `/api/games/${gameContext.gameId}/commands/play-hand-card`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(5000)
    }
  )

  if (!response.ok) {
    throw new ServerError(`Failed to play card: ${response.status}`)
  }
}
```

---

#### 1.2 selectTarget

**簽名**:
```typescript
selectTarget(source: string, target: string): Promise<void>
```

**參數**:
- `source: string` - 來源卡片 ID（必填）
- `target: string` - 選擇的目標卡片 ID（必填）

**行為規範**:
1. 構建 `TurnSelectTarget` 命令
2. 發送 POST 請求到 `/api/games/{game_id}/commands/select-target`
3. 處理成功/失敗

**錯誤處理**: 同 `playHandCard`

---

#### 1.3 makeDecision

**簽名**:
```typescript
makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void>
```

**參數**:
- `decision: 'KOI_KOI' | 'END_ROUND'` - Koi-Koi 決策（必填）

**行為規範**:
1. 構建 `RoundMakeDecision` 命令
2. 發送 POST 請求到 `/api/games/{game_id}/commands/make-decision`
3. 處理成功/失敗

**錯誤處理**: 同 `playHandCard`

---

## 2. UpdateUIStatePort

### 職責

更新 UI 狀態（場牌、手牌、獲得區、分數、FlowStage 等），通常通過狀態管理工具（Pinia）實作。

### 介面定義

```typescript
export interface UpdateUIStatePort {
  initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void
  restoreGameState(snapshot: GameSnapshotRestore): void
  setFlowStage(stage: FlowState): void
  updateFieldCards(cards: string[]): void
  updateHandCards(cards: string[]): void
  updateDepositoryCards(playerCards: string[], opponentCards: string[]): void
  updateScores(playerScore: number, opponentScore: number): void
  updateDeckRemaining(count: number): void
  updateKoiKoiMultiplier(playerId: string, multiplier: number): void
  getCurrentPlayerId(): string
}
```

---

### 方法規範

#### 2.1 initializeGameContext

**簽名**:
```typescript
initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void
```

**參數**:
- `gameId: string` - 遊戲 ID
- `players: PlayerInfo[]` - 玩家資訊列表
- `ruleset: Ruleset` - 遊戲規則集

**使用場景**: `GameStarted` 事件 - 遊戲初始化

**行為規範**:
1. 設定遊戲基本上下文（game_id、players、ruleset）
2. 識別當前玩家 ID（從 players 中找非 AI 玩家）
3. 初始化空的遊戲狀態（場牌、手牌、獲得區為空陣列）
4. 重置分數與倍率為初始值
5. **不觸發任何動畫**

**實作要求**:
- ✅ 同步操作（立即更新）
- ✅ 深拷貝 players 和 ruleset
- ✅ 靜默設置，無動畫

**範例實作**:
```typescript
initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void {
  this.gameId = gameId
  this.players = [...players]
  this.ruleset = { ...ruleset }
  this.currentPlayerId = players.find(p => !p.is_ai)?.player_id || players[0].player_id

  // 初始化空狀態
  this.fieldCards = []
  this.handCards = []
  this.playerDepository = []
  this.opponentDepository = []
  this.playerScore = 0
  this.opponentScore = 0
}
```

---

#### 2.2 restoreGameState

**簽名**:
```typescript
restoreGameState(snapshot: GameSnapshotRestore): void
```

**參數**:
- `snapshot: GameSnapshotRestore` - 完整的遊戲快照數據

**使用場景**: `GameSnapshotRestore` - 斷線重連恢復

**行為規範**:
1. 恢復遊戲基本上下文（game_id、players、ruleset）
2. 恢復所有遊戲狀態（場牌、手牌、獲得區、分數、倍率、FlowStage）
3. **不觸發任何動畫**（靜默恢復）

**實作要求**:
- ✅ 同步操作（立即更新）
- ✅ 深拷貝所有陣列和物件
- ✅ **絕對不可觸發動畫**（區別於正常的 update 方法）
- ✅ 必須恢復所有狀態，確保與伺服器完全同步

**範例實作**:
```typescript
restoreGameState(snapshot: GameSnapshotRestore): void {
  // 恢復基本上下文
  this.gameId = snapshot.game_id
  this.players = [...snapshot.players]
  this.ruleset = { ...snapshot.ruleset }

  // 恢復牌面狀態
  this.fieldCards = [...snapshot.field_cards]
  this.handCards = snapshot.player_hands.find(h => h.player_id === this.currentPlayerId)?.cards || []

  // 恢復分數、倍率、流程狀態等（根據 snapshot 內容）
  this.currentFlowStage = snapshot.current_flow_stage
  // ... 其他狀態恢復
}
```

**注意事項**:
- ⚠️ **關鍵區別**：此方法與 `updateFieldCards()` 等方法不同，**不觸發動畫**
- ⚠️ 恢復後的 UI 應該立即呈現完整狀態，無過渡效果

---

#### 2.3 setFlowStage

**簽名**:
```typescript
setFlowStage(stage: FlowState): void
```

**參數**:
- `stage: FlowState` - 當前流程階段（`'AWAITING_HAND_PLAY'` | `'AWAITING_SELECTION'` | `'AWAITING_DECISION'`）

**行為規範**:
1. 更新遊戲狀態的 `currentFlowStage` 屬性
2. 觸發 UI 重新渲染（由響應式系統自動處理）

**實作要求**:
- ✅ 同步操作（立即更新）
- ✅ 必須觸發響應式更新

**範例實作**（Pinia Store）:
```typescript
setFlowStage(stage: FlowState): void {
  this.currentFlowStage = stage
}
```

---

#### 2.4 updateFieldCards

**簽名**:
```typescript
updateFieldCards(cards: string[]): void
```

**參數**:
- `cards: string[]` - 場牌列表（卡片 ID 陣列）

**行為規範**:
1. 完全替換當前場牌列表（不是增量更新）
2. 觸發 UI 重新渲染

**實作要求**:
- ✅ 深拷貝陣列（避免引用問題）
- ✅ 驗證卡片 ID 格式（可選，生產環境建議）

**範例實作**:
```typescript
updateFieldCards(cards: string[]): void {
  this.fieldCards = [...cards]
}
```

---

#### 2.5 updateHandCards

**簽名**:
```typescript
updateHandCards(cards: string[]): void
```

**參數**:
- `cards: string[]` - 手牌列表

**行為規範**:
1. 完全替換當前手牌列表
2. 觸發 UI 重新渲染

**實作要求**: 同 `updateFieldCards`

---

#### 2.6 updateDepositoryCards

**簽名**:
```typescript
updateDepositoryCards(playerCards: string[], opponentCards: string[]): void
```

**參數**:
- `playerCards: string[]` - 玩家獲得區卡片
- `opponentCards: string[]` - 對手獲得區卡片

**行為規範**:
1. 同時更新玩家和對手的獲得區
2. 觸發 UI 重新渲染

**實作要求**:
- ✅ 深拷貝兩個陣列
- ✅ 保持獲得區卡片順序（用於顯示）

**範例實作**:
```typescript
updateDepositoryCards(playerCards: string[], opponentCards: string[]): void {
  this.playerDepository = [...playerCards]
  this.opponentDepository = [...opponentCards]
}
```

---

#### 2.7 updateScores

**簽名**:
```typescript
updateScores(playerScore: number, opponentScore: number): void
```

**參數**:
- `playerScore: number` - 玩家累計分數
- `opponentScore: number` - 對手累計分數

**行為規範**:
1. 更新累計分數（不是增量，是絕對值）
2. 觸發 UI 重新渲染

**實作要求**:
- ✅ 驗證分數為非負整數（可選）

---

#### 2.8 updateDeckRemaining

**簽名**:
```typescript
updateDeckRemaining(count: number): void
```

**參數**:
- `count: number` - 牌堆剩餘數量

**行為規範**:
1. 更新牌堆剩餘數量
2. 觸發 UI 重新渲染（顯示剩餘牌數）

**實作要求**:
- ✅ 驗證 count 在 0-48 範圍內（可選）

---

#### 2.9 updateKoiKoiMultiplier

**簽名**:
```typescript
updateKoiKoiMultiplier(playerId: string, multiplier: number): void
```

**參數**:
- `playerId: string` - 玩家 ID
- `multiplier: number` - Koi-Koi 倍率

**行為規範**:
1. 更新指定玩家的 Koi-Koi 倍率
2. 觸發 UI 重新渲染（顯示倍率標記）

**實作要求**:
- ✅ 驗證 playerId 存在（可選）
- ✅ 支援多玩家（未來擴展）

**範例實作**:
```typescript
updateKoiKoiMultiplier(playerId: string, multiplier: number): void {
  const player = this.players.find(p => p.id === playerId)
  if (player) {
    player.koiKoiMultiplier = multiplier
  }
}
```

---

#### 2.10 getCurrentPlayerId

**簽名**:
```typescript
getCurrentPlayerId(): string
```

**參數**: 無

**回傳值**: `string` - 當前玩家的 player_id

**行為規範**:
1. 返回代表「本地玩家」的 player_id
2. 該值通常在 `initializeGameContext()` 時設定（從 players 列表中找出非 AI 玩家）
3. 如果無法確定，返回 players 列表的第一個玩家 ID

**實作要求**:
- ✅ 必須同步返回（不可為 Promise）
- ✅ 必須返回有效的 player_id（不可為空字串）
- ✅ 該值在遊戲過程中不應變更

**範例實作** (Pinia Store):
```typescript
getCurrentPlayerId(): string {
  return this.currentPlayerId
}
```

**使用場景**:
- `HandleGameFinishedUseCase` - 判斷贏家是否為當前玩家
- 未來可能用於其他需要當前玩家資訊的 Use Cases

**⚠️ 架構注意事項**:
此方法是 MVP 階段的妥協方案。`currentPlayerId` 具有領域意義，但目前存儲在 UI State 中。
未來若玩家邏輯變複雜（如技能系統、狀態機），應考慮：
1. 在 Domain Layer 引入 Player Entity
2. 重構為獨立的 GameContextPort

---

## 3. TriggerUIEffectPort

### 職責

觸發 UI 效果（動畫、Modal、訊息提示等），不修改狀態，僅觸發視覺回饋。

### 介面定義

```typescript
export interface TriggerUIEffectPort {
  showSelectionUI(possibleTargets: string[]): void
  showDecisionModal(currentYaku: YakuScore[], currentScore: number, potentialScore?: number): void
  showErrorMessage(message: string): void
  showReconnectionMessage(): void
  showGameFinishedUI(winnerId: string, finalScores: PlayerScore[]): void
  showRoundDrawnUI(currentTotalScores: PlayerScore[]): void
  triggerAnimation<T extends AnimationType>(type: T, params: AnimationParams<T>): void
}
```

---

### 方法規範

#### 3.1 showSelectionUI

**簽名**:
```typescript
showSelectionUI(possibleTargets: string[]): void
```

**參數**:
- `possibleTargets: string[]` - 可選目標卡片 ID 列表

**行為規範**:
1. 高亮顯示 `possibleTargets` 中的所有卡片（視覺效果：邊框發光、陰影等）
2. 禁用其他卡片的點擊（防止誤操作）
3. 顯示提示文字：「請選擇要配對的卡片」

**實作要求**:
- ✅ 同步操作（立即顯示）
- ✅ 可取消選擇狀態（當玩家選擇後或事件取消時）

**範例實作**:
```typescript
showSelectionUI(possibleTargets: string[]): void {
  this.selectionMode = true
  this.selectableCards = new Set(possibleTargets)
  this.showToast('請選擇要配對的卡片', 'info')
}
```

---

#### 3.2 showDecisionModal

**簽名**:
```typescript
showDecisionModal(
  currentYaku: YakuScore[],
  currentScore: number,
  potentialScore?: number
): void
```

**參數**:
- `currentYaku: YakuScore[]` - 當前役種列表
- `currentScore: number` - 當前得分
- `potentialScore?: number` - 潛在得分（可選）

**行為規範**:
1. 顯示 Modal 對話框
2. 顯示當前役種列表（名稱、分數）
3. 顯示當前總分
4. 顯示兩個按鈕：「繼續 (Koi-Koi)」和「結束本局」
5. 若 `potentialScore` 存在，顯示潛在分數提示

**實作要求**:
- ✅ Modal 必須阻止背景操作
- ✅ 按鈕點擊後關閉 Modal 並調用對應的 Use Case

**範例實作**:
```typescript
showDecisionModal(
  currentYaku: YakuScore[],
  currentScore: number,
  potentialScore?: number
): void {
  this.modalData = {
    type: 'decision',
    yaku: currentYaku,
    currentScore,
    potentialScore,
    visible: true
  }
}
```

---

#### 3.3 showErrorMessage

**簽名**:
```typescript
showErrorMessage(message: string): void
```

**參數**:
- `message: string` - 錯誤訊息（友善的使用者提示）

**行為規範**:
1. 顯示錯誤提示（Toast / Snackbar）
2. 3 秒後自動消失
3. 樣式：紅色背景、白色文字、錯誤圖示

**實作要求**:
- ✅ 非阻塞（使用者可以繼續操作）
- ✅ 可堆疊（多個錯誤同時顯示）

---

#### 3.4 showReconnectionMessage

**簽名**:
```typescript
showReconnectionMessage(): void
```

**參數**: 無

**行為規範**:
1. 顯示成功提示（Toast）：「Connection is restored」
2. 2 秒後自動消失
3. 樣式：綠色背景、白色文字、成功圖示

**實作要求**: 同 `showErrorMessage`

---

#### 3.5 showGameFinishedUI

**簽名**:
```typescript
showGameFinishedUI(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void
```

**參數**:
- `winnerId: string` - 贏家玩家 ID
- `finalScores: PlayerScore[]` - 最終分數列表
- `isPlayerWinner: boolean` - 是否為當前玩家獲勝

**行為規範**:
1. 顯示遊戲結束畫面（Modal 或全螢幕覆蓋層）
2. 根據 `isPlayerWinner` 顯示不同訊息：
   - `true`: 「恭喜！你獲勝了！」（Victory / Congratulations）
   - `false`: 「你輸了」（Defeat / Better luck next time）
3. 顯示所有玩家的最終分數（排序：由高到低）
4. 提供操作按鈕：「回到首頁」、「再玩一次」（可選）
5. 包含視覺特效：
   - 勝利時：金色邊框、煙火動畫、勝利音效
   - 失敗時：灰色邊框、失落音效

**實作要求**:
- ✅ Modal 必須阻止背景操作
- ✅ 必須根據 `isPlayerWinner` 顯示不同的視覺風格和訊息
- ✅ 分數列表必須清晰易讀
- ✅ 支援響應式設計（手機、平板、桌面）

**範例實作**:
```typescript
showGameFinishedUI(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void {
  const winner = this.players.find(p => p.player_id === winnerId)
  const sortedScores = [...finalScores].sort((a, b) => b.score - a.score)

  this.modalData = {
    type: 'game-finished',
    winner: winner,
    scores: sortedScores,
    isPlayerWinner: isPlayerWinner,
    message: isPlayerWinner ? 'Congratulations! You Win!' : 'Defeat',
    visible: true
  }

  // 觸發對應動畫
  if (isPlayerWinner) {
    this.triggerAnimation('GAME_VICTORY', { winnerId })
  }
}
```

**使用場景**: `HandleGameFinishedUseCase` - 遊戲結束，顯示最終結果

---

#### 3.6 showRoundDrawnUI

**簽名**:
```typescript
showRoundDrawnUI(currentTotalScores: PlayerScore[]): void
```

**參數**:
- `currentTotalScores: PlayerScore[]` - 當前總分列表

**行為規範**:
1. 顯示平局通知（Toast 或 Modal）
2. 顯示平局訊息（如「本局平局，無人得分」）
3. 顯示當前累計總分（所有玩家）
4. 自動在 3-5 秒後關閉或提供「繼續」按鈕
5. 包含適當的視覺提示（如灰色背景、平衡圖示）

**實作要求**:
- ✅ 可使用 Modal 或 Toast（建議 Modal，更醒目）
- ✅ 分數資訊必須清晰
- ✅ 自動關閉或手動關閉都可接受
- ✅ 支援響應式設計

**範例實作**:
```typescript
showRoundDrawnUI(currentTotalScores: PlayerScore[]): void {
  this.modalData = {
    type: 'round-drawn',
    message: '本局平局，無人得分',
    scores: currentTotalScores,
    visible: true,
    autoClose: true,
    autoCloseDelay: 3000  // 3 秒後自動關閉
  }
}
```

**使用場景**: `HandleRoundDrawnUseCase` - 局平局，牌堆耗盡但無人形成役種

---

#### 3.7 triggerAnimation

**簽名**:
```typescript
triggerAnimation<T extends AnimationType>(
  type: T,
  params: AnimationParams<T>
): void
```

**參數**:
- `type: AnimationType` - 動畫類型
- `params: AnimationParams<T>` - 動畫參數（根據類型不同）

**動畫類型定義**:
```typescript
export type AnimationType =
  | 'DEAL_CARDS'
  | 'CARD_MOVE'
  | 'YAKU_EFFECT'
  | 'SCORE_UPDATE'

export type AnimationParams<T extends AnimationType = AnimationType> =
  T extends 'DEAL_CARDS' ? {
    fieldCards: string[]
    hands: Array<{ player_id: string; cards: string[] }>
  } :
  T extends 'CARD_MOVE' ? {
    cardId: string
    from: 'hand' | 'field' | 'deck'
    to: 'field' | 'depository'
  } :
  T extends 'YAKU_EFFECT' ? {
    yakuType: string
    affectedCards: string[]
  } :
  T extends 'SCORE_UPDATE' ? {
    playerId: string
    oldScore: number
    newScore: number
  } :
  never
```

**行為規範**:
1. 根據 `type` 觸發對應的動畫效果
2. 非阻塞（動畫進行時使用者可以看到，但不影響狀態更新）
3. 動畫完成後自動清理

**實作要求**:
- ✅ 使用 CSS transitions / animations（推薦）
- ✅ 或使用 Canvas / WebGL（進階）
- ✅ 動畫時長：300-500ms（建議）

**範例實作**（DEAL_CARDS）:
```typescript
triggerAnimation(type: 'DEAL_CARDS', params: { fieldCards, hands }): void {
  // 觸發 CSS 動畫類別
  this.animationQueue.push({
    type: 'DEAL_CARDS',
    duration: 500,
    onComplete: () => {
      // 動畫完成後的清理
    }
  })
}
```

---

## 實作檢查清單

所有 Output Ports 的 Adapter Layer 實作必須滿足以下條件：

### SendCommandPort
- [ ] 實作 3 個命令方法
- [ ] 正確構建命令 payload
- [ ] 處理網路錯誤、超時、伺服器錯誤
- [ ] 包含單元測試（Mock HTTP 請求）

### UpdateUIStatePort
- [ ] 實作 10 個方法（9 個狀態更新 + 1 個查詢方法）
- [ ] 使用響應式狀態管理（Pinia / Vue ref）
- [ ] 確保深拷貝陣列（避免引用問題）
- [ ] `initializeGameContext` 和 `restoreGameState` 必須靜默設置，不觸發動畫
- [ ] `getCurrentPlayerId` 必須同步返回有效的 player_id
- [ ] 包含單元測試（驗證狀態更新與查詢）

### TriggerUIEffectPort
- [ ] 實作 7 個 UI 效果方法
- [ ] 動畫流暢（60fps）
- [ ] 非阻塞操作
- [ ] 包含單元測試（驗證效果觸發）

---

## 版本歷史

- **1.0.0** (2025-11-14): 初始版本，定義 3 個 Output Ports
