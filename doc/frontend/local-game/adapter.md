# Local Game BC - Adapter Layer

## 職責

實作 Application Layer 定義的 Port 介面，處理與 User Interface BC 的整合，提供離線遊戲模式的適配器。

**核心原則**:
- ✅ **實作 Output Ports**: 發送事件給 User Interface BC
- ✅ **實作 Input Ports**: 接收來自 User Interface BC 的命令
- ✅ **DI Container 整合**: 提供離線模式下的依賴注入配置
- ✅ **狀態存儲**: 管理遊戲狀態的持久化（可選）

---

## 核心適配器

### 1. LocalGameAdapter（命令接收適配器）

#### 職責
實作 `SendCommandPort`（User Interface BC 的 Output Port），接收來自 User Interface BC 的命令並轉發給 Local Game BC 的 Use Cases。

**在離線模式下，User Interface BC 調用 LocalGameAdapter 替代 SSEGameClient**

#### 介面定義

```typescript
interface SendCommandPort {
  sendPlayHandCard(command: PlayHandCardCommand): Promise<void>
  sendSelectTarget(command: SelectTargetCommand): Promise<void>
  sendMakeDecision(command: MakeDecisionCommand): Promise<void>
}
```

#### 實作範例

```typescript
class LocalGameAdapter implements SendCommandPort {
  constructor(
    private executePlayerTurnUseCase: ExecutePlayerTurnUseCase,
    private selectMatchTargetUseCase: SelectMatchTargetUseCase,
    private handleKoiKoiDecisionUseCase: HandleKoiKoiDecisionUseCase,
    private executeOpponentTurnUseCase: ExecuteOpponentTurnUseCase
  ) {}

  async sendPlayHandCard(command: PlayHandCardCommand): Promise<void> {
    // 轉發給 ExecutePlayerTurnUseCase
    await this.executePlayerTurnUseCase.execute({
      gameId: command.gameId,
      handCard: command.card,
      target: command.target
    })

    // 若玩家回合結束且無等待狀態，自動執行對手回合
    if (this.shouldExecuteOpponentTurn()) {
      await this.executeOpponentTurnUseCase.execute({
        gameId: command.gameId
      })
    }
  }

  async sendSelectTarget(command: SelectTargetCommand): Promise<void> {
    // 轉發給 SelectMatchTargetUseCase
    await this.selectMatchTargetUseCase.execute({
      gameId: command.gameId,
      source: command.source,
      target: command.target
    })

    // 檢查是否需要自動執行對手回合
    if (this.shouldExecuteOpponentTurn()) {
      await this.executeOpponentTurnUseCase.execute({
        gameId: command.gameId
      })
    }
  }

  async sendMakeDecision(command: MakeDecisionCommand): Promise<void> {
    // 轉發給 HandleKoiKoiDecisionUseCase
    await this.handleKoiKoiDecisionUseCase.execute({
      gameId: command.gameId,
      decision: command.decision
    })

    // 若選擇 KOI_KOI，自動執行對手回合
    if (command.decision === 'KOI_KOI' && this.shouldExecuteOpponentTurn()) {
      await this.executeOpponentTurnUseCase.execute({
        gameId: command.gameId
      })
    }
  }

  private shouldExecuteOpponentTurn(): boolean {
    // 檢查當前流程狀態，若為 AWAITING_HAND_PLAY 且輪到對手，則執行
    const state = this.gameStateStore.getGameState(this.currentGameId)
    return (
      state.flowStage === 'AWAITING_HAND_PLAY' &&
      state.activePlayerId === this.opponentId
    )
  }
}
```

---

### 2. LocalGameEventEmitter（事件推送適配器）

#### 職責
實作 `LocalGameEventPublisher`（Application Layer 的 Output Port），模擬 SSE 事件推送，發送遊戲事件給 User Interface BC。

**在離線模式下，LocalGameEventEmitter 替代 SSE 推送**

#### 介面定義

```typescript
interface LocalGameEventPublisher {
  publishGameStarted(event: GameStartedEvent): void
  publishRoundDealt(event: RoundDealtEvent): void
  publishTurnCompleted(event: TurnCompletedEvent): void
  publishSelectionRequired(event: SelectionRequiredEvent): void
  publishDecisionRequired(event: DecisionRequiredEvent): void
  publishDecisionMade(event: DecisionMadeEvent): void
  publishRoundScored(event: RoundScoredEvent): void
  publishGameFinished(event: GameFinishedEvent): void
  publishTurnError(event: TurnErrorEvent): void
  // ... 其他事件
}
```

#### 實作範例

```typescript
class LocalGameEventEmitter implements LocalGameEventPublisher {
  private eventHandlers: Map<string, EventHandler[]> = new Map()

  // 訂閱事件（由 User Interface BC 調用）
  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push(handler)
  }

  // 發布事件（由 Use Cases 調用）
  publishGameStarted(event: GameStartedEvent): void {
    this.emit('GameStarted', event)
  }

  publishRoundDealt(event: RoundDealtEvent): void {
    this.emit('RoundDealt', event)
  }

  publishTurnCompleted(event: TurnCompletedEvent): void {
    this.emit('TurnCompleted', event)
  }

  publishSelectionRequired(event: SelectionRequiredEvent): void {
    this.emit('SelectionRequired', event)
  }

  publishDecisionRequired(event: DecisionRequiredEvent): void {
    this.emit('DecisionRequired', event)
  }

  publishDecisionMade(event: DecisionMadeEvent): void {
    this.emit('DecisionMade', event)
  }

  publishRoundScored(event: RoundScoredEvent): void {
    this.emit('RoundScored', event)
  }

  publishGameFinished(event: GameFinishedEvent): void {
    this.emit('GameFinished', event)
  }

  publishTurnError(event: TurnErrorEvent): void {
    this.emit('TurnError', event)
  }

  // 內部實作：觸發事件處理器
  private emit(eventType: string, event: any): void {
    const handlers = this.eventHandlers.get(eventType) || []
    handlers.forEach(handler => {
      // 使用 setTimeout 模擬非同步，避免阻塞
      setTimeout(() => handler(event), 0)
    })
  }
}
```

**與 SSE 的對應關係**:
- SSE: `eventSource.addEventListener('GameStarted', handler)`
- Local: `eventEmitter.on('GameStarted', handler)`

---

### 3. OpponentStrategy（對手策略適配器）

#### 職責
實作對手決策邏輯，提供簡易隨機策略（MVP）。

#### MVP 實作：簡易隨機策略

```typescript
class RandomOpponentStrategy implements OpponentStrategy {
  selectHandCard(hand: string[], field: string[]): string {
    // 策略：優先選擇能配對的牌，否則隨機選擇
    const matchableCards = hand.filter(card => {
      const matches = this.cardLogic.findMatchableCards(card, field)
      return matches.length > 0
    })

    if (matchableCards.length > 0) {
      return this.randomSelect(matchableCards)
    }

    return this.randomSelect(hand)
  }

  selectMatchTarget(possibleTargets: string[]): string {
    // 簡單隨機選擇
    return this.randomSelect(possibleTargets)
  }

  makeKoiKoiDecision(currentYaku: Yaku[], baseScore: number): 'KOI_KOI' | 'END_ROUND' {
    // 簡單策略：
    // - 基礎分數 < 5：繼續 (KOI_KOI)
    // - 基礎分數 >= 5：結束 (END_ROUND)
    return baseScore < 5 ? 'KOI_KOI' : 'END_ROUND'
  }

  private randomSelect<T>(array: T[]): T {
    const index = Math.floor(Math.random() * array.length)
    return array[index]
  }
}
```

#### Post-MVP 擴展：進階策略

```typescript
class AdvancedOpponentStrategy implements OpponentStrategy {
  selectHandCard(hand: string[], field: string[], depository: string[]): string {
    // 策略：分析役種進度，優先打出能形成役種的牌
    // 1. 計算每張牌的潛在價值（能否形成役種）
    // 2. 選擇價值最高的牌
    // 3. 若價值相同，隨機選擇
  }

  makeKoiKoiDecision(currentYaku: Yaku[], baseScore: number, opponentScore: number): 'KOI_KOI' | 'END_ROUND' {
    // 進階策略：
    // 1. 若對手分數領先且差距大，激進策略（繼續）
    // 2. 若己方分數領先且差距大，保守策略（結束）
    // 3. 若接近遊戲結束（剩餘局數少），調整策略
  }
}
```

---

### 4. LocalGameStateStore（狀態存儲適配器）

#### 職責
管理遊戲狀態的存儲與恢復，支援頁面重新載入後恢復遊戲。

#### 實作方式 A：記憶體存儲（最簡單）

```typescript
class InMemoryGameStateStore implements LocalGameStateStore {
  private states: Map<string, LocalGameState> = new Map()

  getGameState(gameId: string): LocalGameState {
    const state = this.states.get(gameId)
    if (!state) {
      throw new Error(`Game state not found: ${gameId}`)
    }
    return state
  }

  updateGameState(gameId: string, state: LocalGameState): void {
    this.states.set(gameId, state)
  }

  deleteGameState(gameId: string): void {
    this.states.delete(gameId)
  }
}
```

**優點**: 簡單、快速
**缺點**: 頁面重新載入後遊戲狀態丟失

#### 實作方式 B：IndexedDB 存儲（持久化）

```typescript
class IndexedDBGameStateStore implements LocalGameStateStore {
  private dbName = 'hanafuda-local-games'
  private storeName = 'game-states'

  async getGameState(gameId: string): Promise<LocalGameState> {
    const db = await this.openDB()
    const tx = db.transaction(this.storeName, 'readonly')
    const store = tx.objectStore(this.storeName)
    const state = await store.get(gameId)
    return state
  }

  async updateGameState(gameId: string, state: LocalGameState): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)
    await store.put(state, gameId)
  }

  async deleteGameState(gameId: string): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)
    await store.delete(gameId)
  }

  private async openDB(): Promise<IDBDatabase> {
    // 使用 idb 庫或原生 IndexedDB API
  }
}
```

**優點**: 持久化，支援頁面重新載入後恢復
**缺點**: 實作較複雜，非同步 API

---

## DI Container 整合

### 離線模式切換

在 User Interface BC 的 DI Container 中，根據模式切換依賴：

```typescript
// src/di-container.ts

import { container } from 'tsyringe'

// 根據模式註冊不同的實作
if (isOfflineMode) {
  // 離線模式：使用 LocalGameAdapter
  container.register<SendCommandPort>('SendCommandPort', {
    useClass: LocalGameAdapter
  })

  container.register<GameEventSource>('GameEventSource', {
    useClass: LocalGameEventEmitter
  })
} else {
  // 線上模式：使用 SSEGameClient
  container.register<SendCommandPort>('SendCommandPort', {
    useClass: SSEGameClient
  })

  container.register<GameEventSource>('GameEventSource', {
    useClass: SSEEventSource
  })
}

// 註冊 Local Game BC 的依賴
container.register<OpponentStrategy>('OpponentStrategy', {
  useClass: RandomOpponentStrategy
})

container.register<LocalGameStateStore>('LocalGameStateStore', {
  useClass: InMemoryGameStateStore  // 或 IndexedDBGameStateStore
})
```

### Use Cases 註冊

```typescript
// 註冊 Local Game BC 的 Use Cases
container.register('InitializeGameUseCase', {
  useClass: InitializeGameUseCase
})

container.register('ExecutePlayerTurnUseCase', {
  useClass: ExecutePlayerTurnUseCase
})

container.register('SelectMatchTargetUseCase', {
  useClass: SelectMatchTargetUseCase
})

container.register('HandleKoiKoiDecisionUseCase', {
  useClass: HandleKoiKoiDecisionUseCase
})

container.register('ExecuteOpponentTurnUseCase', {
  useClass: ExecuteOpponentTurnUseCase
})
```

---

## 與 User Interface BC 的整合流程

### 初始化離線遊戲

```typescript
// User Interface BC 的 StartGameUseCase

class StartGameUseCase {
  constructor(
    @inject('InitializeGameUseCase') private initializeGame: InitializeGameUseCase,
    @inject('GameEventSource') private eventSource: GameEventSource
  ) {}

  async execute(mode: 'online' | 'offline'): Promise<void> {
    if (mode === 'offline') {
      // 調用 Local Game BC 初始化遊戲
      await this.initializeGame.execute({
        playerId: 'player-1',
        opponentId: 'opponent-ai',
        ruleset: {
          totalRounds: 12,
          koiKoiMultiplier: 2,
          sevenPointDouble: true
        }
      })

      // 訂閱事件（LocalGameEventEmitter）
      this.eventSource.on('GameStarted', this.handleGameStarted)
      this.eventSource.on('RoundDealt', this.handleRoundDealt)
      // ... 訂閱其他事件
    } else {
      // 線上模式：呼叫後端 API
      await this.apiClient.joinGame()
    }
  }
}
```

### 玩家操作流程

```typescript
// User Interface BC 的 PlayHandCardUseCase

class PlayHandCardUseCase {
  constructor(
    @inject('SendCommandPort') private commandPort: SendCommandPort
  ) {}

  async execute(cardId: string, target?: string): Promise<void> {
    // 無論線上/離線，都調用 SendCommandPort
    await this.commandPort.sendPlayHandCard({
      gameId: this.currentGameId,
      card: cardId,
      target: target
    })

    // 離線模式：LocalGameAdapter 自動執行對手回合
    // 線上模式：SSEGameClient 發送命令到伺服器
  }
}
```

---

## 測試要求

### 適配器測試

- ✅ **LocalGameAdapter**: 驗證命令轉發與對手回合自動執行
- ✅ **LocalGameEventEmitter**: 測試事件訂閱與發布機制
- ✅ **OpponentStrategy**: 測試隨機策略的正確性
- ✅ **LocalGameStateStore**: 測試狀態存儲與恢復

### 整合測試

- ✅ 測試 User Interface BC 與 Local Game BC 的完整流程
- ✅ 驗證離線模式下的遊戲流程（初始化 → 回合 → 結束）
- ✅ 測試 DI Container 的模式切換

### 測試框架

- **工具**: Vitest
- **Mock 工具**: vi.fn() / vi.mock()
- **斷言庫**: expect (Vitest 內建)

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Application Layer](./application.md)
- [User Interface BC - Adapter Layer](../user-interface/adapter.md)
- [共用數據契約](../../shared/data-contracts.md)
- [通訊協議](../../shared/protocol.md)
- [前端架構總覽](../architecture.md)
