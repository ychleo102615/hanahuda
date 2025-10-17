# Port Interface Contracts

**Feature Branch**: `002-game-ui-game`
**Date**: 2025-10-17
**Version**: 1.0

## Overview

本文檔定義 game-engine 和 game-ui 兩個 BC 的 Port 介面契約。這些介面是兩個 BC 與外部世界的邊界。

---

## 1. game-engine BC Ports

### 1.1 IGameStateRepository

**目的**: 遊戲狀態持久化

**位置**: `src/game-engine/application/ports/IGameStateRepository.ts`

**契約**:

```typescript
/**
 * Game State Repository Port
 *
 * 責任: 遊戲狀態的持久化,不包含業務邏輯
 * 實作位置: Infrastructure Layer
 */
export interface IGameStateRepository {
  /**
   * 創建新遊戲
   * @returns 遊戲 ID (UUID)
   * @throws Error 如果創建失敗
   */
  createGame(): Promise<string>

  /**
   * 取得遊戲狀態
   * @param gameId 遊戲 ID
   * @returns GameState 實體,如果不存在則返回 null
   */
  getGameState(gameId: string): Promise<GameState | null>

  /**
   * 儲存遊戲狀態
   * @param gameId 遊戲 ID
   * @param gameState 遊戲狀態實體
   * @returns true 如果儲存成功, false 如果失敗
   */
  saveGameState(gameId: string, gameState: GameState): Promise<boolean>

  /**
   * 刪除遊戲
   * @param gameId 遊戲 ID
   * @returns true 如果刪除成功, false 如果遊戲不存在
   */
  deleteGame(gameId: string): Promise<boolean>
}
```

**設計約束**:
- ✅ 必須是無狀態的 (stateless)
- ✅ 不可包含業務邏輯
- ✅ 必須支援並發操作 (如果需要)
- ✅ 錯誤處理透過 Promise rejection

**實作範例**:

```typescript
// Infrastructure Layer
export class LocalGameRepository implements IGameStateRepository {
  private games = new Map<string, GameState>()

  async createGame(): Promise<string> {
    const gameId = uuidv4()
    return gameId
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    return this.games.get(gameId) || null
  }

  async saveGameState(gameId: string, gameState: GameState): Promise<boolean> {
    this.games.set(gameId, gameState)
    return true
  }

  async deleteGame(gameId: string): Promise<boolean> {
    return this.games.delete(gameId)
  }
}
```

### 1.2 IEventPublisher

**目的**: 發布整合事件到其他 BC

**位置**: `src/shared/events/ports/IEventPublisher.ts`

**契約**:

```typescript
/**
 * Event Publisher Port
 *
 * 責任: 發布整合事件,確保事件被傳遞到 EventBus
 * 實作位置: Infrastructure Layer
 */
export interface IEventPublisher {
  /**
   * 發布整合事件
   * @param event 整合事件
   * @throws Error 如果發布失敗 (EventBus 未啟動等)
   */
  publishEvent(event: IntegrationEvent): Promise<void>

  /**
   * 取得下一個序列號
   * @returns 遞增的序列號
   */
  getNextSequenceNumber(): number
}
```

**設計約束**:
- ✅ 必須保證事件序列號嚴格遞增
- ✅ 必須是執行緒安全的 (如果支援並發)
- ✅ 發布失敗必須拋出錯誤

**實作範例**:

```typescript
// Infrastructure Layer
export class EventBusAdapter implements IEventPublisher {
  private sequenceNumber = 0

  constructor(private eventBus: IEventBus) {}

  async publishEvent(event: IntegrationEvent): Promise<void> {
    await this.eventBus.publish(event.eventType, event)
  }

  getNextSequenceNumber(): number {
    return ++this.sequenceNumber
  }
}
```

---

## 2. game-ui BC Ports

### 2.1 IUIPresenter

**目的**: 將應用層的更新呈現到 UI

**位置**: `src/game-ui/application/ports/IUIPresenter.ts`

**契約**:

```typescript
/**
 * UI Presenter Port
 *
 * 責任: 將 GameViewModel 更新呈現到 UI (Pinia Store)
 * 實作位置: Presentation Layer
 */
export interface IUIPresenter {
  // === 狀態更新 ===

  /**
   * 呈現增量狀態更新
   * @param gameViewModel 更新後的遊戲視圖模型
   */
  presentStateUpdate(gameViewModel: GameViewModel): void

  /**
   * 呈現完整遊戲狀態 (用於初始化或完整同步)
   * @param gameViewModel 完整的遊戲視圖模型
   */
  presentGameState(gameViewModel: GameViewModel): void

  // === 動畫 ===

  /**
   * 呈現卡片播放動畫
   * @param cardId 卡片 ID
   * @param targetArea 目標區域 ('field' | 'captured')
   */
  presentCardPlayAnimation(cardId: string, targetArea: 'field' | 'captured'): void

  /**
   * 呈現牌堆翻牌動畫
   * @param cardId 翻出的卡片 ID
   */
  presentDeckRevealAnimation(cardId: string): void

  /**
   * 呈現回合轉換動畫
   * @param fromPlayerId 前一個玩家 ID
   * @param toPlayerId 當前玩家 ID
   */
  presentTurnTransition(fromPlayerId: string, toPlayerId: string): void

  // === UI 元素 ===

  /**
   * 呈現役種達成提示
   * @param yakuNames 役種名稱陣列
   * @param score 得分
   */
  presentYakuAchievement(yakuNames: string[], score: number): void

  /**
   * 呈現/隱藏來來對話框
   * @param show true=顯示, false=隱藏
   */
  presentKoikoiDialog(show: boolean): void

  /**
   * 呈現配對選擇 UI (多重配對時)
   * @param matchingCardIds 可選擇的場牌 IDs
   */
  presentMatchSelection(matchingCardIds: string[]): void

  /**
   * 清除配對選擇 UI
   */
  clearMatchSelection(): void

  /**
   * 清除來來對話框
   */
  clearKoikoiDialog(): void

  // === 遊戲結束 ===

  /**
   * 呈現回合結束
   * @param winnerId 獲勝者 ID (null=平局)
   * @param score 得分
   */
  presentRoundEnd(winnerId: string | null, score: number): void

  /**
   * 呈現遊戲結束
   * @param winnerId 獲勝者 ID (null=平手)
   * @param finalScore 最終得分
   */
  presentGameEnd(winnerId: string | null, finalScore: number): void

  // === 訊息與錯誤 ===

  /**
   * 呈現遊戲訊息
   * @param messageKey 訊息國際化鍵值
   * @param params 參數
   */
  presentMessage(messageKey: string, params?: Record<string, string | number>): void

  /**
   * 呈現錯誤訊息
   * @param errorKey 錯誤國際化鍵值
   * @param params 參數
   */
  presentError(errorKey: string, params?: Record<string, string | number>): void

  /**
   * 清除錯誤訊息
   */
  clearError(): void
}
```

**設計約束**:
- ✅ 必須是同步方法 (void 返回)
- ✅ 不可包含業務邏輯
- ✅ 僅負責 UI 狀態更新
- ✅ 必須支援多次調用

**實作範例**:

```typescript
// Presentation Layer
export class VueGamePresenter implements IUIPresenter {
  constructor(
    private gameStore: ReturnType<typeof useGameStore>,
    private localeService: LocaleService
  ) {}

  presentStateUpdate(gameViewModel: GameViewModel): void {
    this.gameStore.setGameViewModel(gameViewModel)
  }

  presentGameState(gameViewModel: GameViewModel): void {
    this.gameStore.setGameViewModel(gameViewModel)
    this.gameStore.setGameStarted(true)
  }

  presentCardPlayAnimation(cardId: string, targetArea: 'field' | 'captured'): void {
    this.gameStore.addAnimation({
      type: 'card_play',
      cardId,
      targetArea,
    })
  }

  // ... 其他方法實作
}
```

### 2.2 IEventSubscriber

**目的**: 訂閱整合事件

**位置**: `src/shared/events/ports/IEventSubscriber.ts`

**契約**:

```typescript
/**
 * Event Subscriber Port
 *
 * 責任: 訂閱並接收整合事件
 * 實作位置: Infrastructure Layer
 */
export interface IEventSubscriber {
  /**
   * 訂閱特定類型的事件
   * @param eventType 事件類型 (如 'GameInitialized')
   * @param handler 事件處理器
   * @returns 取消訂閱函式
   */
  subscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): Unsubscribe

  /**
   * 訂閱所有事件
   * @param handler 事件處理器
   * @returns 取消訂閱函式
   */
  subscribeAll(handler: EventHandler<IntegrationEvent>): Unsubscribe

  /**
   * 取消訂閱
   * @param eventType 事件類型
   * @param handler 事件處理器
   */
  unsubscribe(eventType: string, handler: EventHandler): void
}

export type EventHandler<T extends IntegrationEvent> = (event: T) => void | Promise<void>
export type Unsubscribe = () => void
```

**設計約束**:
- ✅ 必須支援多個訂閱者
- ✅ 必須支援萬用字元訂閱 ('*')
- ✅ handler 可以是同步或非同步
- ✅ 返回的 unsubscribe 函式必須能正確取消訂閱

**實作範例**:

```typescript
// Infrastructure Layer
export class EventBusAdapter implements IEventSubscriber {
  constructor(private eventBus: IEventBus) {}

  subscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): Unsubscribe {
    this.eventBus.subscribe(eventType, handler)
    return () => this.unsubscribe(eventType, handler)
  }

  subscribeAll(handler: EventHandler<IntegrationEvent>): Unsubscribe {
    return this.subscribe('*', handler)
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this.eventBus.unsubscribe(eventType, handler)
  }
}
```

---

## 3. Shared Ports

### 3.1 IEventBus

**目的**: 事件匯流排,連接所有 BC

**位置**: `src/shared/events/ports/IEventBus.ts`

**契約**:

```typescript
/**
 * Event Bus Port
 *
 * 責任: 事件的發布與訂閱,實作 Pub/Sub 模式
 * 實作位置: Shared Infrastructure
 */
export interface IEventBus {
  /**
   * 啟動事件匯流排
   */
  start(): void

  /**
   * 停止事件匯流排
   */
  stop(): void

  /**
   * 發布事件
   * @param eventType 事件類型
   * @param event 事件資料
   */
  publish<T extends IntegrationEvent>(eventType: string, event: T): Promise<void>

  /**
   * 訂閱事件
   * @param eventType 事件類型 (支援 '*' 萬用字元)
   * @param handler 事件處理器
   */
  subscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void

  /**
   * 取消訂閱
   * @param eventType 事件類型
   * @param handler 事件處理器
   */
  unsubscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void

  /**
   * 取得匯流排狀態
   */
  getStatus(): 'stopped' | 'starting' | 'running'
}
```

**設計約束**:
- ✅ 必須是單例 (Singleton)
- ✅ 必須支援非同步事件處理
- ✅ 必須支援多個訂閱者
- ✅ 錯誤處理不可中斷其他訂閱者

### 3.2 ICardMatchingService

**目的**: 卡片配對邏輯 (shared interface)

**位置**: `src/shared/services/ICardMatchingService.ts`

**契約**:

```typescript
/**
 * Card Matching Service Interface
 *
 * 責任: 判斷卡片是否可以配對
 * 實作位置: game-engine 和 game-ui 各自實作
 */
export interface ICardMatchingService {
  /**
   * 找出可配對的卡片
   * @param card 來源卡片
   * @param fieldCards 場上的卡片
   * @returns 可配對的卡片陣列
   */
  findMatchingCards(card: any, fieldCards: readonly any[]): any[]

  /**
   * 判斷兩張卡片是否可以配對
   * @param card1 卡片 1
   * @param card2 卡片 2
   * @returns true 如果可以配對
   */
  canMatch(card1: any, card2: any): boolean
}
```

**設計約束**:
- ✅ 兩個 BC 有各自的實作 (使用不同的卡片類型)
- ✅ 配對規則必須一致
- ✅ 必須是純函式 (無副作用)

---

## 4. 契約測試

### 4.1 Repository 契約測試

```typescript
describe('IGameStateRepository Contract', () => {
  let repository: IGameStateRepository

  beforeEach(() => {
    repository = new LocalGameRepository()
  })

  it('should create game and return UUID', async () => {
    const gameId = await repository.createGame()
    expect(gameId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('should save and retrieve game state', async () => {
    const gameId = await repository.createGame()
    const gameState = createMockGameState()

    await repository.saveGameState(gameId, gameState)
    const retrieved = await repository.getGameState(gameId)

    expect(retrieved).toBe(gameState)
  })

  it('should return null for non-existent game', async () => {
    const result = await repository.getGameState('non-existent-id')
    expect(result).toBeNull()
  })

  it('should delete game successfully', async () => {
    const gameId = await repository.createGame()
    const deleted = await repository.deleteGame(gameId)

    expect(deleted).toBe(true)
    const retrieved = await repository.getGameState(gameId)
    expect(retrieved).toBeNull()
  })
})
```

### 4.2 Event Publisher 契約測試

```typescript
describe('IEventPublisher Contract', () => {
  let publisher: IEventPublisher
  let eventBus: IEventBus

  beforeEach(() => {
    eventBus = new InMemoryEventBus()
    eventBus.start()
    publisher = new EventBusAdapter(eventBus)
  })

  it('should publish event successfully', async () => {
    const handler = vi.fn()
    eventBus.subscribe('TestEvent', handler)

    const event = createTestEvent()
    await publisher.publishEvent(event)

    expect(handler).toHaveBeenCalledWith(event)
  })

  it('should generate incrementing sequence numbers', () => {
    const seq1 = publisher.getNextSequenceNumber()
    const seq2 = publisher.getNextSequenceNumber()
    const seq3 = publisher.getNextSequenceNumber()

    expect(seq2).toBe(seq1 + 1)
    expect(seq3).toBe(seq2 + 1)
  })
})
```

### 4.3 UI Presenter 契約測試

```typescript
describe('IUIPresenter Contract', () => {
  let presenter: IUIPresenter
  let gameStore: ReturnType<typeof useGameStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    gameStore = useGameStore()
    presenter = new VueGamePresenter(gameStore, mockLocaleService)
  })

  it('should update game state in store', () => {
    const gameViewModel = createMockGameViewModel()

    presenter.presentGameState(gameViewModel)

    expect(gameStore.gameViewModel).toBe(gameViewModel)
    expect(gameStore.gameState.gameStarted).toBe(true)
  })

  it('should show koikoi dialog', () => {
    presenter.presentKoikoiDialog(true)

    expect(gameStore.uiState.showKoikoiDialog).toBe(true)
  })

  it('should present error message', () => {
    presenter.presentError('errors.invalidMove')

    expect(gameStore.uiState.error).toContain('invalid')
  })
})
```

---

## 5. 版本管理與演進

### 5.1 版本策略

**Port 介面版本**: 使用語意化版本 (Semantic Versioning)

- **MAJOR**: 移除方法、修改方法簽章 (不相容變更)
- **MINOR**: 新增方法 (相容變更)
- **PATCH**: 文件更新、註解修正 (無程式碼變更)

**當前版本**: 1.0.0

### 5.2 演進指引

**新增方法**:
1. 在介面中新增方法
2. 在所有實作中提供實作
3. 更新契約測試
4. 遞增 MINOR 版本

**修改方法簽章**:
1. 建立新版本介面 (如 IGameStateRepositoryV2)
2. 提供舊版本的適配器
3. 逐步遷移使用者
4. 棄用舊版本
5. 遞增 MAJOR 版本

---

**契約版本**: 1.0.0
**最後更新**: 2025-10-17
