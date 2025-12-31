# Contract: GameLogRepositoryPort

**Type**: Output Port (Application Layer → Adapter Layer)
**Purpose**: 遊戲事件日誌的非同步寫入介面

## Interface Definition

```typescript
/**
 * GameLogRepositoryPort
 *
 * 遊戲日誌儲存的輸出埠介面。
 * 採用 fire-and-forget 模式，不阻斷主遊戲流程。
 *
 * @implements Clean Architecture Output Port
 */
export abstract class GameLogRepositoryPort {
  /**
   * 非同步記錄遊戲事件
   *
   * @description
   * - Fire-and-forget 模式，不等待寫入完成
   * - 寫入失敗時記錄 console error，不拋出例外
   * - 不應阻斷呼叫者的執行流程
   *
   * @param entry - 遊戲日誌條目
   */
  abstract logAsync(entry: GameLogEntry): void

  /**
   * 查詢特定遊戲的所有日誌
   *
   * @description
   * 用於遊戲重播功能，按時間順序返回事件序列。
   *
   * @param gameId - 遊戲 ID
   * @returns 按時間排序的日誌條目陣列
   */
  abstract findByGameId(gameId: string): Promise<GameLog[]>
}
```

## Data Types

```typescript
/**
 * 遊戲日誌事件類型
 */
export type GameLogEventType =
  // Game Lifecycle
  | 'GAME_STARTED'
  | 'GAME_FINISHED'
  // Round Lifecycle
  | 'ROUND_STARTED'
  | 'ROUND_ENDED'
  // Turn Actions
  | 'CARD_PLAYED_FROM_HAND'
  | 'CARD_DRAWN'
  | 'SELECTION_MADE'
  | 'CARDS_COLLECTED'
  | 'DECISION_MADE'
  // System Events
  | 'PLAYER_TIMEOUT'
  | 'PLAYER_LEFT'

/**
 * 遊戲日誌輸入條目（寫入用）
 */
export interface GameLogEntry {
  gameId: string
  playerId?: string
  eventType: GameLogEventType
  payload: Record<string, unknown>
}

/**
 * 遊戲日誌完整記錄（查詢用）
 */
export interface GameLog extends GameLogEntry {
  id: string
  createdAt: Date
}
```

## Implementation Requirements

### Adapter: DrizzleGameLogRepository

```typescript
export class DrizzleGameLogRepository extends GameLogRepositoryPort {
  constructor(private readonly db: PostgresJsDatabase) {}

  logAsync(entry: GameLogEntry): void {
    // Fire-and-forget: 不等待，不阻斷
    this.db.insert(gameLogs).values({
      gameId: entry.gameId,
      playerId: entry.playerId ?? null,
      eventType: entry.eventType,
      payload: entry.payload,
    }).catch(err => {
      console.error('[GameLogRepository] Failed to write log', err, entry)
    })
  }

  async findByGameId(gameId: string): Promise<GameLog[]> {
    const results = await this.db
      .select()
      .from(gameLogs)
      .where(eq(gameLogs.gameId, gameId))
      .orderBy(asc(gameLogs.createdAt))

    return results
  }
}
```

## Integration Points

### 1. Event Publisher Integration

在 `CompositeEventPublisher` 中整合日誌記錄：

```typescript
class CompositeEventPublisher implements EventPublisherPort {
  constructor(
    private readonly gameEventBus: GameEventBus,
    private readonly gameLogRepository: GameLogRepositoryPort,  // 新增
  ) {}

  publish(gameId: string, event: GameEvent): void {
    // 1. 發布即時事件
    this.gameEventBus.publish(gameId, event)

    // 2. 記錄到日誌（fire-and-forget）
    this.gameLogRepository.logAsync({
      gameId,
      playerId: event.playerId,
      eventType: this.mapEventType(event),
      payload: event,
    })
  }
}
```

### 2. API Handler Integration

在 API handlers 中記錄 Command：

```typescript
// play-card.post.ts
export default defineEventHandler(async (event) => {
  const { gameId, playerId, cardId, targetCardId } = await readBody(event)

  // 記錄 Command（fire-and-forget）
  gameLogRepository.logAsync({
    gameId,
    playerId,
    eventType: 'CARD_PLAYED_FROM_HAND',
    payload: { cardId, targetCardId },
  })

  // 執行 Use Case
  await playHandCardUseCase.execute({ gameId, playerId, cardId, targetCardId })
})
```

## Performance Contract

| Metric | Target |
|--------|--------|
| `logAsync()` 執行時間 | < 1ms（非同步，不等待 DB） |
| `findByGameId()` 查詢時間 | < 50ms（單場遊戲約 100-500 事件） |
| 對主遊戲流程延遲影響 | < 10ms |
