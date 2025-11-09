# Local Game BC - Application Layer

## 職責

協調 Domain Layer 完成離線遊戲 Use Cases，管理遊戲狀態與流程控制，並透過 Output Ports 發送事件給 User Interface BC。

**核心原則**:
- ✅ **編排邏輯**: 協調 Domain Layer 的業務邏輯，不包含業務邏輯本身
- ✅ **狀態管理**: 維護遊戲狀態，確保狀態一致性
- ✅ **事件驅動**: 通過 Output Ports 發送事件，模擬 SSE 事件流
- ✅ **可測試性**: 使用 Mock 測試 Use Cases，驗證流程正確性

---

## Use Cases

### 1. InitializeGameUseCase（初始化遊戲）

#### 職責
- 建立新的離線遊戲
- 初始化遊戲配置（規則集、總局數）
- 發送 `GameStarted` 事件

#### Input Port
```typescript
interface InitializeGameCommand {
  playerId: string,
  opponentId: string,
  ruleset: {
    totalRounds: number,
    koiKoiMultiplier: number,
    sevenPointDouble: boolean
  }
}
```

#### Output Port
```typescript
interface LocalGameEventPublisher {
  publishGameStarted(event: GameStartedEvent): void
}
```

#### 流程
1. 調用 Domain Layer 初始化遊戲狀態
2. 設定玩家與對手 ID
3. 發送 `GameStarted` 事件給 User Interface BC
4. 調用 `StartNewRoundUseCase` 開始第一局

---

### 2. StartNewRoundUseCase（開始新局）

#### 職責
- 洗牌並發牌
- 檢測特殊開局（Teshi、場牌流局）
- 發送 `RoundDealt` 或 `RoundEndedInstantly` 事件

#### Input Port
```typescript
interface StartNewRoundCommand {
  gameId: string
}
```

#### Output Port
```typescript
interface LocalGameEventPublisher {
  publishRoundDealt(event: RoundDealtEvent): void
  publishRoundEndedInstantly(event: RoundEndedInstantlyEvent): void
}
```

#### 流程
1. 調用 Domain Layer 洗牌與發牌
2. 檢測 Teshi（手牌 4 張同月）
   - 若檢測到 Teshi，發送 `RoundEndedInstantly` 事件，結束本局
3. 檢測場牌流局（場上 4 張同月）
   - 若檢測到流局，發送 `RoundEndedInstantly` 事件，重新發牌
4. 若無特殊情況，發送 `RoundDealt` 事件
5. 更新流程狀態為 `AWAITING_HAND_PLAY`

---

### 3. ExecutePlayerTurnUseCase（執行玩家回合）

#### 職責
- 處理玩家打出手牌
- 執行配對邏輯
- 翻開牌堆牌並配對
- 檢測役種
- 發送對應事件（`TurnCompleted` / `SelectionRequired` / `DecisionRequired`）

#### Input Port
```typescript
interface ExecutePlayerTurnCommand {
  gameId: string,
  handCard: string,
  target?: string    // 手牌配對目標（多重配對時必填）
}
```

#### Output Port
```typescript
interface LocalGameEventPublisher {
  publishTurnCompleted(event: TurnCompletedEvent): void
  publishSelectionRequired(event: SelectionRequiredEvent): void
  publishDecisionRequired(event: DecisionRequiredEvent): void
  publishTurnError(event: TurnErrorEvent): void
}
```

#### 流程
1. **驗證操作合法性**
   - 檢查手牌是否在玩家手中
   - 檢查當前流程狀態是否為 `AWAITING_HAND_PLAY`
   - 若無效，發送 `TurnError` 事件

2. **執行手牌配對**
   - 調用 Domain Layer 找出可配對的場牌
   - 若有多張可配對牌且未提供 `target`，發送 `TurnError` 事件
   - 執行配對（或無配對時留在場上）

3. **翻開牌堆牌並配對**
   - 從牌堆頂翻開一張牌
   - 自動執行配對（或無配對時留在場上）
   - 若翻牌有多張可配對牌：
     - 發送 `SelectionRequired` 事件
     - 更新流程狀態為 `AWAITING_SELECTION`
     - 結束流程，等待玩家選擇

4. **檢測役種**
   - 調用 Domain Layer 檢測新形成的役種
   - 若有新役種：
     - 發送 `DecisionRequired` 事件
     - 更新流程狀態為 `AWAITING_DECISION`
     - 結束流程，等待玩家決策

5. **回合結束**
   - 若無役種形成，發送 `TurnCompleted` 事件
   - 更新流程狀態為 `AWAITING_HAND_PLAY`
   - 切換當前行動玩家為對手

---

### 4. SelectMatchTargetUseCase（選擇配對目標）

#### 職責
- 處理玩家選擇翻牌配對目標
- 完成翻牌配對
- 繼續役種檢測流程

#### Input Port
```typescript
interface SelectMatchTargetCommand {
  gameId: string,
  source: string,    // 翻出的牌
  target: string     // 選擇的配對目標
}
```

#### Output Port
```typescript
interface LocalGameEventPublisher {
  publishTurnProgressAfterSelection(event: TurnProgressAfterSelectionEvent): void
  publishDecisionRequired(event: DecisionRequiredEvent): void
  publishTurnError(event: TurnErrorEvent): void
}
```

#### 流程
1. **驗證操作合法性**
   - 檢查當前流程狀態是否為 `AWAITING_SELECTION`
   - 檢查 `target` 是否在可選目標列表中
   - 若無效，發送 `TurnError` 事件

2. **完成翻牌配對**
   - 執行配對邏輯
   - 更新遊戲狀態

3. **檢測役種**
   - 調用 Domain Layer 檢測新形成的役種
   - 若有新役種：
     - 發送 `DecisionRequired` 事件（包含 `TurnProgressAfterSelection`）
     - 更新流程狀態為 `AWAITING_DECISION`
   - 若無役種：
     - 發送 `TurnProgressAfterSelection` 事件
     - 更新流程狀態為 `AWAITING_HAND_PLAY`
     - 切換當前行動玩家為對手

---

### 5. HandleKoiKoiDecisionUseCase（處理 Koi-Koi 決策）

#### 職責
- 處理玩家 Koi-Koi 決策（繼續 / 結束）
- 若選擇結束，計算最終得分並結算
- 若選擇繼續，更新 Koi-Koi 倍率

#### Input Port
```typescript
interface HandleKoiKoiDecisionCommand {
  gameId: string,
  decision: 'KOI_KOI' | 'END_ROUND'
}
```

#### Output Port
```typescript
interface LocalGameEventPublisher {
  publishDecisionMade(event: DecisionMadeEvent): void
  publishRoundScored(event: RoundScoredEvent): void
  publishGameFinished(event: GameFinishedEvent): void
  publishTurnError(event: TurnErrorEvent): void
}
```

#### 流程
1. **驗證操作合法性**
   - 檢查當前流程狀態是否為 `AWAITING_DECISION`
   - 若無效，發送 `TurnError` 事件

2. **處理 END_ROUND 決策**
   - 調用 Domain Layer 計算最終得分
   - 更新累計分數
   - 發送 `RoundScored` 事件
   - 若達到總局數，發送 `GameFinished` 事件
   - 否則，調用 `StartNewRoundUseCase` 開始新局

3. **處理 KOI_KOI 決策**
   - 更新玩家 Koi-Koi 倍率
   - 發送 `DecisionMade` 事件
   - 更新流程狀態為 `AWAITING_HAND_PLAY`
   - 切換當前行動玩家為對手

---

### 6. ExecuteOpponentTurnUseCase（執行對手回合）

#### 職責
- 調用對手策略選擇手牌
- 自動執行配對與翻牌
- 處理對手 Koi-Koi 決策
- 發送對應事件

#### Input Port
```typescript
interface ExecuteOpponentTurnCommand {
  gameId: string
}
```

#### Output Port
```typescript
interface LocalGameEventPublisher {
  publishTurnCompleted(event: TurnCompletedEvent): void
  publishSelectionRequired(event: SelectionRequiredEvent): void
  publishDecisionRequired(event: DecisionRequiredEvent): void
  publishDecisionMade(event: DecisionMadeEvent): void
  publishRoundScored(event: RoundScoredEvent): void
}
```

#### 流程
1. **調用對手策略選擇手牌**
   - 調用 `OpponentStrategy.selectHandCard()`
   - 自動選擇配對目標（若有多張可配對牌）

2. **執行手牌配對與翻牌**
   - 與玩家回合相同的邏輯
   - 若翻牌需要選擇，自動調用 `OpponentStrategy.selectMatchTarget()`

3. **處理役種檢測**
   - 若形成役種，自動調用 `OpponentStrategy.makeKoiKoiDecision()`
   - 發送對應事件（`DecisionMade` 或 `RoundScored`）

4. **回合結束**
   - 切換當前行動玩家為玩家
   - 發送 `TurnCompleted` 事件

---

### 7. CalculateScoreUseCase（計算最終得分）

#### 職責
- 計算役種基礎分數
- 計算 Koi-Koi 倍率
- 應用 7 分倍增規則
- 返回最終得分

#### Input Port
```typescript
interface CalculateScoreCommand {
  yakus: Yaku[],
  koiKoiMultiplier: number,
  sevenPointDouble: boolean
}
```

#### Output
```typescript
{
  baseScore: number,
  totalMultiplier: number,
  finalScore: number
}
```

#### 流程
1. 調用 Domain Layer 計算基礎分數
2. 計算 Koi-Koi 倍率
3. 判斷是否應用 7 分倍增規則
4. 計算最終得分 = 基礎分數 × 總倍率
5. 返回結果

---

## Port 定義

### Input Ports（由 User Interface BC 或內部調用）

```typescript
interface LocalGameInputPorts {
  initializeGame(command: InitializeGameCommand): void
  startNewRound(command: StartNewRoundCommand): void
  executePlayerTurn(command: ExecutePlayerTurnCommand): void
  selectMatchTarget(command: SelectMatchTargetCommand): void
  handleKoiKoiDecision(command: HandleKoiKoiDecisionCommand): void
  executeOpponentTurn(command: ExecuteOpponentTurnCommand): void
}
```

### Output Ports（發送事件給 User Interface BC）

```typescript
interface LocalGameEventPublisher {
  // 遊戲級事件
  publishGameStarted(event: GameStartedEvent): void
  publishRoundDealt(event: RoundDealtEvent): void
  publishRoundEndedInstantly(event: RoundEndedInstantlyEvent): void
  publishRoundScored(event: RoundScoredEvent): void
  publishRoundDrawn(event: RoundDrawnEvent): void
  publishGameFinished(event: GameFinishedEvent): void

  // 回合級事件
  publishTurnCompleted(event: TurnCompletedEvent): void
  publishSelectionRequired(event: SelectionRequiredEvent): void
  publishTurnProgressAfterSelection(event: TurnProgressAfterSelectionEvent): void
  publishDecisionRequired(event: DecisionRequiredEvent): void
  publishDecisionMade(event: DecisionMadeEvent): void
  publishTurnError(event: TurnErrorEvent): void
}
```

**事件結構遵循 [protocol.md](../../shared/protocol.md) 定義**

---

## 狀態管理

### 遊戲狀態存儲

Local Game BC 需要維護完整的遊戲狀態：

```typescript
interface LocalGameStateStore {
  getGameState(gameId: string): LocalGameState
  updateGameState(gameId: string, state: LocalGameState): void
  deleteGameState(gameId: string): void
}
```

實作方式（由 Adapter Layer 提供）：
- 使用記憶體 Map 存儲（單機遊戲無需持久化）
- 或使用 IndexedDB（支援頁面重新載入後恢復）

---

## 測試要求

### Use Case 測試

- ✅ **InitializeGameUseCase**: 驗證初始化流程與事件發送
- ✅ **StartNewRoundUseCase**: 測試發牌、Teshi 檢測、場牌流局檢測
- ✅ **ExecutePlayerTurnUseCase**: 測試所有流程分支（無配對、單一配對、多重配對、役種形成）
- ✅ **SelectMatchTargetUseCase**: 驗證選擇邏輯與後續流程
- ✅ **HandleKoiKoiDecisionUseCase**: 測試繼續與結束兩種決策
- ✅ **ExecuteOpponentTurnUseCase**: 驗證對手自動操作流程
- ✅ **CalculateScoreUseCase**: 測試分數計算邏輯（含倍率）

### 測試策略

- 使用 Mock 實作 Output Ports，驗證事件發送
- 使用 Stub 實作 Domain Layer 服務，隔離業務邏輯
- 測試覆蓋率目標 > 90%

### 測試框架

- **工具**: Vitest
- **Mock 工具**: vi.fn() / vi.mock()
- **斷言庫**: expect (Vitest 內建)

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Adapter Layer](./adapter.md)
- [共用數據契約](../../shared/data-contracts.md)
- [通訊協議](../../shared/protocol.md)
- [前端架構總覽](../architecture.md)
