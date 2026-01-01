# Core Game BC - Application Layer

## 職責

協調 Domain Layer 完成遊戲 Use Cases，定義 Input/Output Ports，不包含業務邏輯。

**核心原則**:
- ✅ **編排邏輯**: 協調 Domain Layer 的業務邏輯
- ✅ **Port 定義**: 定義輸入/輸出介面，由 Adapter Layer 實作
- ✅ **事件發布**: 通過 Output Ports 發布 SSE 事件
- ✅ **並發控制**: 使用 GameLockPort 確保操作互斥

---

## Use Cases

### 1. JoinGameUseCase（加入遊戲/重連）

#### 流程
1. 檢查 Cookie 中的 `session_token`
2. 若存在且有效：發送 Snapshot 事件（重連）
3. 若不存在：創建新遊戲，啟動 AI 對手，發送 GameStarted 事件
4. 開始第一局

```typescript
// server/application/use-cases/JoinGameUseCase.ts
class JoinGameUseCase {
  constructor(
    private gameRepository: GameRepositoryPort,
    private eventPublisher: EventPublisherPort,
    private gameLock: GameLockPort
  ) {}

  async execute(input: JoinGameInput): Promise<JoinGameOutput>
}
```

---

### 2. PlayHandCardUseCase（打出手牌）

#### 流程
1. 獲取遊戲鎖
2. 載入遊戲狀態
3. 驗證操作合法性
4. 執行手牌配對（調用 Domain 函數）
5. 執行牌堆翻牌
6. 檢查是否需要選擇配對目標
   - 若需要：發送 SelectionRequired 事件
7. 檢測役種
   - 若有新役種：發送 DecisionRequired 事件
8. 若無役種：發送 TurnCompleted 事件
9. 切換行動玩家，若輪到 AI 則自動執行

```typescript
// server/application/use-cases/PlayHandCardUseCase.ts
class PlayHandCardUseCase {
  constructor(
    private gameRepository: GameRepositoryPort,
    private eventPublisher: EventPublisherPort,
    private gameLock: GameLockPort,
    private opponentStrategy: OpponentStrategyPort
  ) {}

  async execute(input: PlayHandCardInput): Promise<void>
}
```

---

### 3. SelectMatchedCardUseCase（選擇配對目標）

#### 流程
1. 獲取遊戲鎖
2. 驗證當前 FlowStage 是否為 `AWAITING_SELECTION`
3. 執行翻牌配對選擇
4. 檢測役種
5. 發送對應事件

```typescript
// server/application/use-cases/SelectMatchedCardUseCase.ts
class SelectMatchedCardUseCase {
  async execute(input: SelectMatchedCardInput): Promise<void>
}
```

---

### 4. MakeDecisionUseCase（Koi-Koi 決策）

#### 流程
1. 獲取遊戲鎖
2. 驗證當前 FlowStage 是否為 `AWAITING_DECISION`
3. 若選擇 `STOP`：
   - 計算最終得分
   - 更新累計分數
   - 發送 RoundEnded 事件
   - 若達到總局數：發送 GameFinished 事件
4. 若選擇 `KOI_KOI`：
   - 更新 Koi-Koi 倍率
   - 發送 TurnCompleted 事件
   - 切換行動玩家

```typescript
// server/application/use-cases/MakeDecisionUseCase.ts
class MakeDecisionUseCase {
  async execute(input: MakeDecisionInput): Promise<void>
}
```

---

### 5. ExecuteOpponentTurnUseCase（執行 AI 回合）

#### 流程
1. 調用 Opponent BC 選擇手牌
2. 執行手牌配對與翻牌
3. 處理配對選擇（若需要）
4. 檢測役種
5. 若有役種：調用 Opponent BC 做 Koi-Koi 決策
6. 發送對應事件
7. 切換行動玩家

```typescript
// server/application/use-cases/ExecuteOpponentTurnUseCase.ts
class ExecuteOpponentTurnUseCase {
  async execute(gameId: string): Promise<void>
}
```

---

## Port 定義

### Input Ports

```typescript
// server/application/ports/input/JoinGamePort.ts
interface JoinGameInput {
  playerId: string
  playerName: string
  sessionToken?: string
  gameId?: string
}

interface JoinGameOutput {
  status: 'game_waiting' | 'game_started' | 'snapshot' | 'game_finished' | 'game_expired'
  gameId?: string
  sessionToken?: string
}
```

### Output Ports

```typescript
// server/application/ports/output/GameRepositoryPort.ts
abstract class GameRepositoryPort {
  abstract findById(gameId: string): Promise<Game | null>
  abstract findBySessionToken(token: string): Promise<Game | null>
  abstract save(game: Game): Promise<void>
}

// server/application/ports/output/EventPublisherPort.ts
abstract class EventPublisherPort {
  abstract publish(gameId: string, event: SSEEvent): void
  abstract getEventStream(gameId: string): EventStream
}

// server/application/ports/output/GameLockPort.ts
abstract class GameLockPort {
  abstract withLock<T>(gameId: string, operation: () => Promise<T>): Promise<T>
}

// server/application/ports/output/OpponentStrategyPort.ts
abstract class OpponentStrategyPort {
  abstract selectHandCard(round: Round): string
  abstract selectMatchTarget(options: string[]): string
  abstract makeKoiKoiDecision(yakus: Yaku[], baseScore: number): 'KOI_KOI' | 'STOP'
}
```

---

## 事件類型

Use Cases 通過 EventPublisherPort 發送以下事件：

| 事件 | 觸發時機 |
|------|---------|
| `initial_state` | 加入遊戲/重連 |
| `round_dealt` | 發牌完成 |
| `turn_completed` | 回合完成（無役種） |
| `selection_required` | 需要選擇配對目標 |
| `turn_progress_after_selection` | 選擇後繼續 |
| `decision_required` | 有新役種，需要決策 |
| `round_ended` | 局結束 |
| `game_finished` | 遊戲結束 |

---

## 測試要求

### Use Case 測試

- ✅ **JoinGameUseCase**: 測試加入遊戲與重連流程
- ✅ **PlayHandCardUseCase**: 測試所有流程分支
- ✅ **SelectMatchedCardUseCase**: 驗證選擇邏輯
- ✅ **MakeDecisionUseCase**: 測試繼續與結束兩種決策
- ✅ **ExecuteOpponentTurnUseCase**: 驗證 AI 自動操作

### 測試策略

- 使用 Mock 實作 Output Ports
- 測試覆蓋率目標 > 80%

### 測試框架

- **工具**: Vitest
- **Mock**: vi.mock / vi.fn

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Adapter Layer](./adapter.md)
- [共用數據契約](../../shared/data-contracts.md)
- [通訊協議](../../shared/protocol.md)
- [後端架構總覽](../architecture.md)
