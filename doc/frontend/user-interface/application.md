# User Interface BC - Application Layer

## 職責

協調 Domain Layer 與 Adapter Layer，控制 UI 流程與業務編排，**不依賴任何框架**。

**核心原則**:
- ✅ **Use Case 模式**: 每個用戶操作或事件對應一個 Use Case
- ✅ **框架無關**: 不直接使用 Vue、Pinia（由 Adapter Layer 橋接）
- ✅ **純業務編排**: 調用 Domain Layer 進行運算，通過 Port 與外部互動
- ✅ **可測試性**: 使用 Mock 可獨立測試

---

## Use Cases

### 1. 玩家操作流程

#### PlayHandCardUseCase

**職責**: 處理玩家打出手牌的完整流程

**輸入**:
```typescript
{
  cardId: string,           // 要打出的手牌 ID
  handCards: string[],      // 當前手牌列表
  fieldCards: string[]      // 當前場牌列表
}
```

**流程**:
1. 調用 Domain Layer 驗證卡片是否在手牌中
2. 調用 Domain Layer 檢查配對邏輯
3. 若有多張可配對場牌，觸發選擇 UI（通過 Output Port）
4. 若單一配對或無配對，直接發送命令（通過 Output Port）

**輸出**:
```typescript
{
  needSelection: boolean,
  possibleTargets?: string[],
  selectedTarget?: string | null
}
```

---

#### SelectMatchTargetUseCase

**職責**: 處理玩家選擇配對目標

**輸入**:
```typescript
{
  sourceCardId: string,
  targetCardId: string,
  possibleTargets: string[]
}
```

**流程**:
1. 調用 Domain Layer 驗證選擇的目標是否合法
2. 發送 `TurnSelectTarget` 命令（通過 Output Port）

**輸出**:
```typescript
{
  valid: boolean,
  errorMessage?: string
}
```

---

#### MakeKoiKoiDecisionUseCase

**職責**: 處理 Koi-Koi 決策

**輸入**:
```typescript
{
  currentYaku: YakuScore[],
  depositoryCards: string[],
  koiKoiMultiplier: number,
  decision: 'KOI_KOI' | 'END_ROUND'
}
```

**流程**:
1. 調用 Domain Layer 計算當前役種與得分
2. 若選擇繼續，調用 Domain Layer 預測潛在分數
3. 發送 `RoundMakeDecision` 命令（通過 Output Port）
4. 更新 UI 狀態（通過 Output Port）

**輸出**:
```typescript
{
  decision: 'KOI_KOI' | 'END_ROUND',
  currentScore: number,
  potentialScore?: number
}
```

---

### 2. SSE 事件處理 Use Cases

每個 SSE 事件類型對應一個獨立的 Use Case。

#### HandleGameStartedUseCase

**職責**: 處理 `GameStarted` 事件

**輸入**: `GameStarted` payload（詳見 [protocol.md](../../shared/protocol.md)）

**流程**:
1. 解析玩家資訊與規則集
2. 初始化遊戲上下文（通過 `UpdateUIStatePort`）
3. 顯示「遊戲開始」訊息（通過 `TriggerUIEffectPort`）

---

#### HandleRoundDealtUseCase

**職責**: 處理 `RoundDealt` 事件

**輸入**: `RoundDealt` payload

**流程**:
1. 觸發發牌動畫（通過 `TriggerUIEffectPort`）
2. 更新場牌狀態（通過 `UpdateUIStatePort.updateFieldCards`）
3. 更新手牌狀態（通過 `UpdateUIStatePort.updateHandCards`）
4. 更新牌堆剩餘數量
5. 根據 `next_state` 更新 FlowStage（通過 `UpdateUIStatePort.setFlowStage`）

---

#### HandleTurnCompletedUseCase

**職責**: 處理 `TurnCompleted` 事件（無中斷、無役種形成）

**輸入**: `TurnCompleted` payload

**流程**:
1. 解析手牌操作與翻牌操作
2. 觸發卡片移動動畫（通過 `TriggerUIEffectPort.triggerAnimation`）
3. 更新場牌、手牌、獲得區狀態（通過 `UpdateUIStatePort`）
4. 更新牌堆剩餘數量
5. 根據 `next_state` 更新 FlowStage（通過 `UpdateUIStatePort.setFlowStage`）

---

#### HandleSelectionRequiredUseCase

**職責**: 處理 `SelectionRequired` 事件（翻牌雙重配對）

**輸入**: `SelectionRequired` payload

**流程**:
1. 解析已完成的手牌操作
2. 觸發手牌移動動畫（通過 `TriggerUIEffectPort`）
3. 更新手牌狀態（通過 `UpdateUIStatePort`）
4. 顯示選擇配對 UI（通過 `TriggerUIEffectPort.showSelectionUI`），高亮可選目標
5. 更新 FlowStage 為 `AWAITING_SELECTION`（通過 `UpdateUIStatePort.setFlowStage`）

---

#### HandleTurnProgressAfterSelectionUseCase

**職責**: 處理 `TurnProgressAfterSelection` 事件

**輸入**: `TurnProgressAfterSelection` payload

**流程**:
1. 解析選擇後的翻牌操作
2. 觸發卡片移動動畫（通過 `TriggerUIEffectPort`）
3. 更新場牌、獲得區狀態（通過 `UpdateUIStatePort`）
4. 若有新役種形成（`yaku_update` 非 null）：
   - 調用 Domain Layer 驗證役種
   - 觸發役種形成特效（通過 `TriggerUIEffectPort`）
5. 根據 `next_state` 更新 FlowStage（通過 `UpdateUIStatePort.setFlowStage`）

---

#### HandleDecisionRequiredUseCase

**職責**: 處理 `DecisionRequired` 事件（形成役種，需決策）

**輸入**: `DecisionRequired` payload

**流程**:
1. 解析本回合的手牌操作與翻牌操作
2. 觸發卡片移動動畫（通過 `TriggerUIEffectPort`）
3. 更新場牌、手牌、獲得區狀態（通過 `UpdateUIStatePort`）
4. 調用 Domain Layer 計算當前役種與得分
5. 調用 Domain Layer 預測潛在分數（用於決策建議）
6. 顯示 Koi-Koi 決策 Modal（通過 `TriggerUIEffectPort.showDecisionModal`）
7. 更新 FlowStage 為 `AWAITING_DECISION`（通過 `UpdateUIStatePort.setFlowStage`）

---

#### HandleDecisionMadeUseCase

**職責**: 處理 `DecisionMade` 事件（僅在選擇 `KOI_KOI` 時）

**輸入**: `DecisionMade` payload

**流程**:
1. 更新玩家 Koi-Koi 倍率（通過 `UpdateUIStatePort`）
2. 顯示「繼續遊戲」訊息（通過 `TriggerUIEffectPort`）
3. 根據 `next_state` 更新 FlowStage（返回 `AWAITING_HAND_PLAY`）

---

#### HandleRoundScoredUseCase

**職責**: 處理 `RoundScored` 事件（局結束計分）

**輸入**: `RoundScored` payload

**流程**:
1. 解析勝者、役種列表、倍率、最終得分
2. 調用 Domain Layer 驗證分數計算
3. 觸發分數變化動畫（通過 `TriggerUIEffectPort`）
4. 更新累計分數（通過 `UpdateUIStatePort.updateScores`）
5. 顯示局結算畫面（通過 `TriggerUIEffectPort`）

---

#### HandleRoundDrawnUseCase

**職責**: 處理 `RoundDrawn` 事件（平局）

**輸入**: `RoundDrawn` payload

**流程**:
1. 顯示「本局平局」訊息（通過 `TriggerUIEffectPort`）
2. 更新累計分數（無變化，僅顯示當前分數）

---

#### HandleRoundEndedInstantlyUseCase

**職責**: 處理 `RoundEndedInstantly` 事件（Teshi 或場牌流局）

**輸入**: `RoundEndedInstantly` payload

**流程**:
1. 解析結束原因（`TESHI` / `FIELD_KUTTSUKI`）
2. 若為 Teshi，顯示勝者與獲得分數
3. 更新累計分數（通過 `UpdateUIStatePort`）
4. 顯示特殊結束訊息（通過 `TriggerUIEffectPort`）

---

#### HandleGameFinishedUseCase

**職責**: 處理 `GameFinished` 事件（遊戲結束）

**輸入**: `GameFinished` payload

**流程**:
1. 解析最終分數與勝者
2. 顯示遊戲結束畫面（通過 `TriggerUIEffectPort`）
3. 提供「重新開始」與「返回首頁」選項

---

#### HandleTurnErrorUseCase

**職責**: 處理 `TurnError` 事件（操作錯誤）

**輸入**: `TurnError` payload

**流程**:
1. 解析錯誤代碼與訊息
2. 調用 Domain Layer 提供友善的錯誤說明
3. 顯示錯誤提示（通過 `TriggerUIEffectPort.showErrorMessage`）
4. 根據 `retry_allowed` 決定是否允許重試

---

#### HandleReconnectionUseCase

**職責**: 處理斷線重連的快照恢復

**輸入**: `GameSnapshotRestore` payload

**流程**:
1. 解析快照數據
2. 恢復遊戲上下文（game_id、player_scores、ruleset）
3. 恢復牌面狀態（field_cards、hand_cards、depositories）
4. 恢復流程控制（current_flow_stage、active_player_id）
5. 根據 `current_flow_stage` 渲染對應 UI（通過 `UpdateUIStatePort`）
6. 顯示「連線已恢復」提示訊息（通過 `TriggerUIEffectPort.showReconnectionMessage`）

---

## Port 定義

### Input Ports（由 Adapter Layer 呼叫）

```typescript
// 玩家操作
interface PlayHandCardPort {
  execute(input: PlayHandCardInput): PlayHandCardOutput
}

interface SelectMatchTargetPort {
  execute(input: SelectMatchTargetInput): SelectMatchTargetOutput
}

interface MakeKoiKoiDecisionPort {
  execute(input: MakeKoiKoiDecisionInput): MakeKoiKoiDecisionOutput
}

// SSE 事件處理
interface HandleGameStartedPort {
  execute(event: GameStartedEvent): void
}

interface HandleRoundDealtPort {
  execute(event: RoundDealtEvent): void
}

interface HandleTurnCompletedPort {
  execute(event: TurnCompletedEvent): void
}

interface HandleSelectionRequiredPort {
  execute(event: SelectionRequiredEvent): void
}

interface HandleTurnProgressAfterSelectionPort {
  execute(event: TurnProgressAfterSelectionEvent): void
}

interface HandleDecisionRequiredPort {
  execute(event: DecisionRequiredEvent): void
}

interface HandleDecisionMadePort {
  execute(event: DecisionMadeEvent): void
}

interface HandleRoundScoredPort {
  execute(event: RoundScoredEvent): void
}

interface HandleRoundDrawnPort {
  execute(event: RoundDrawnEvent): void
}

interface HandleRoundEndedInstantlyPort {
  execute(event: RoundEndedInstantlyEvent): void
}

interface HandleGameFinishedPort {
  execute(event: GameFinishedEvent): void
}

interface HandleTurnErrorPort {
  execute(event: TurnErrorEvent): void
}

interface HandleReconnectionPort {
  execute(snapshot: GameSnapshotRestore): void
}
```

### Output Ports（由 Application Layer 呼叫，Adapter Layer 實作）

```typescript
// 發送命令到後端
interface SendCommandPort {
  playHandCard(cardId: string, target?: string): Promise<void>
  selectTarget(source: string, target: string): Promise<void>
  makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void>
}

// 更新 UI 狀態
interface UpdateUIStatePort {
  setFlowStage(stage: FlowStage): void
  updateFieldCards(cards: string[]): void
  updateHandCards(cards: string[]): void
  updateDepositoryCards(playerCards: string[], opponentCards: string[]): void
  updateScores(playerScore: number, opponentScore: number): void
  updateDeckRemaining(count: number): void
  updateKoiKoiMultiplier(playerId: string, multiplier: number): void
}

// 觸發 UI 效果
interface TriggerUIEffectPort {
  showSelectionUI(possibleTargets: string[]): void
  showDecisionModal(currentYaku: YakuScore[], currentScore: number, potentialScore?: number): void
  showErrorMessage(message: string): void
  showReconnectionMessage(): void
  triggerAnimation(type: AnimationType, params: AnimationParams): void
}
```

---

## 錯誤處理策略

### 1. 操作錯誤

**來源**: `TurnError` 事件

**處理**: 由 `HandleTurnErrorUseCase` 處理

**錯誤類型**:
- `INVALID_CARD`: 卡片不在手牌中
- `INVALID_TARGET`: 配對目標無效
- `WRONG_PLAYER`: 不是當前玩家的回合
- `INVALID_STATE`: 流程狀態不正確
- `INVALID_SELECTION`: 選擇的配對目標不合法

---

### 2. 網路錯誤

**來源**: SSE 連線中斷、API 請求失敗

**處理流程**:
1. 偵測錯誤類型（連線中斷、超時、伺服器錯誤）
2. 顯示錯誤提示（通過 `TriggerUIEffectPort.showErrorMessage`）
3. 觸發重連邏輯（由 Adapter Layer 處理）
4. 使用指數退避策略：1s → 2s → 4s → 8s → 16s（最大 30s）

---

### 3. 狀態不一致

**來源**: 客戶端與伺服器狀態不同步

**處理流程**:
1. 偵測狀態差異（如 FlowStage 不匹配）
2. 記錄錯誤日誌
3. 觸發快照恢復（發送重連請求）
4. 顯示「正在同步遊戲狀態」訊息

---

## 測試策略

### Use Case 測試

**測試重點**:
- Mock Domain Layer 的所有依賴
- Mock Output Ports（SendCommandPort、UpdateUIStatePort 等）
- 驗證 Use Case 的業務流程編排正確性

**測試覆蓋率目標**: > 80%

**範例測試**:
```typescript
describe('PlayHandCardUseCase', () => {
  it('應該在有多張可配對場牌時觸發選擇 UI', () => {
    // Arrange
    const mockDomain = createMockDomain()
    const mockOutputPort = createMockOutputPort()
    const useCase = new PlayHandCardUseCase(mockDomain, mockOutputPort)

    // Act
    const result = useCase.execute({
      cardId: '0341',
      handCards: ['0341', '0342'],
      fieldCards: ['0343', '0344']  // 兩張可配對
    })

    // Assert
    expect(result.needSelection).toBe(true)
    expect(result.possibleTargets).toEqual(['0343', '0344'])
    expect(mockOutputPort.showSelectionUI).toHaveBeenCalled()
  })
})

describe('HandleRoundDealtUseCase', () => {
  it('應該更新場牌、手牌並觸發發牌動畫', () => {
    // Arrange
    const mockUpdateUIState = createMock<UpdateUIStatePort>()
    const mockTriggerUIEffect = createMock<TriggerUIEffectPort>()
    const useCase = new HandleRoundDealtUseCase(mockUpdateUIState, mockTriggerUIEffect)

    const event = {
      dealer_id: 'player-1',
      field: ['0111', '0121'],
      hands: [{ player_id: 'player-1', cards: ['0131', '0141'] }],
      deck_remaining: 32,
      next_state: { state_type: 'AWAITING_HAND_PLAY', active_player_id: 'player-1' }
    }

    // Act
    useCase.execute(event)

    // Assert
    expect(mockTriggerUIEffect.triggerAnimation).toHaveBeenCalledWith('DEAL_CARDS', expect.any(Object))
    expect(mockUpdateUIState.updateFieldCards).toHaveBeenCalledWith(['0111', '0121'])
    expect(mockUpdateUIState.updateHandCards).toHaveBeenCalledWith(['0131', '0141'])
    expect(mockUpdateUIState.setFlowStage).toHaveBeenCalledWith('AWAITING_HAND_PLAY')
  })
})
```

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Adapter Layer](./adapter.md)
- [通訊協議](../../shared/protocol.md)
- [共用數據契約](../../shared/data-contracts.md)
