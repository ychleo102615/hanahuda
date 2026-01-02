# Core Game BC - Adapter Layer

## 職責

實作 Application Layer 定義的 Port 介面，處理 REST API、SSE 推送、資料持久化。

**核心原則**:
- ✅ **實作 Output Ports**: Repository、Event Publisher、Game Lock
- ✅ **提供 REST API**: 接收客戶端命令（Nitro Server Routes）
- ✅ **SSE 事件推送**: 發送遊戲事件給客戶端
- ✅ **DTO 轉換**: Domain ↔ DTO 轉換

---

## REST API Routes

### 1. 加入遊戲

**端點**: `POST /api/v1/games/join`

```typescript
// server/api/v1/games/join.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const sessionToken = getCookie(event, 'session_token')

  const result = await joinGameUseCase.execute({
    playerId: body.player_id,
    playerName: body.player_name,
    sessionToken,
    gameId: body.game_id
  })

  // 設置 Cookie
  if (result.sessionToken) {
    setCookie(event, 'session_token', result.sessionToken, {
      httpOnly: true,
      sameSite: 'strict'
    })
  }

  return result
})
```

---

### 2. SSE 事件流

**端點**: `GET /api/v1/games/:gameId/events`

```typescript
// server/api/v1/games/[gameId]/events.get.ts
export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'gameId')
  const sessionToken = getCookie(event, 'session_token')

  // 驗證 session
  // ...

  // 設置 SSE headers
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  return eventStream(event, async (push) => {
    const stream = eventPublisher.getEventStream(gameId)

    for await (const gameEvent of stream) {
      push({
        id: gameEvent.id,
        event: gameEvent.type,
        data: JSON.stringify(gameEvent.payload)
      })
    }
  })
})
```

---

### 3. 打出手牌

**端點**: `POST /api/v1/games/:gameId/turns/play-card`

```typescript
// server/api/v1/games/[gameId]/turns/play-card.post.ts
export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'gameId')
  const body = await readBody(event)

  await playHandCardUseCase.execute({
    gameId,
    playerId: body.player_id,
    cardId: body.card_id,
    targetId: body.target_id
  })

  return { success: true }
})
```

---

### 4. 選擇配對目標

**端點**: `POST /api/v1/games/:gameId/turns/select-match`

```typescript
// server/api/v1/games/[gameId]/turns/select-match.post.ts
export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'gameId')
  const body = await readBody(event)

  await selectMatchedCardUseCase.execute({
    gameId,
    playerId: body.player_id,
    selectedTargetId: body.selected_target_id
  })

  return { success: true }
})
```

---

### 5. Koi-Koi 決策

**端點**: `POST /api/v1/games/:gameId/rounds/decision`

```typescript
// server/api/v1/games/[gameId]/rounds/decision.post.ts
export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'gameId')
  const body = await readBody(event)

  await makeDecisionUseCase.execute({
    gameId,
    playerId: body.player_id,
    decision: body.decision_type // 'KOI_KOI' | 'STOP'
  })

  return { success: true }
})
```

---

## Repository Adapter

### GameRepositoryAdapter

```typescript
// server/adapters/persistence/GameRepositoryAdapter.ts
class GameRepositoryAdapter extends GameRepositoryPort {
  constructor(private db: DrizzleClient) {}

  async findById(gameId: string): Promise<Game | null> {
    const row = await this.db.select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1)

    if (!row[0]) return null
    return this.toDomain(row[0])
  }

  async findBySessionToken(token: string): Promise<Game | null> {
    const row = await this.db.select()
      .from(games)
      .where(eq(games.sessionToken, token))
      .limit(1)

    if (!row[0]) return null
    return this.toDomain(row[0])
  }

  async save(game: Game): Promise<void> {
    await this.db.insert(games)
      .values(this.toEntity(game))
      .onConflictDoUpdate({
        target: games.id,
        set: this.toEntity(game)
      })
  }

  // Domain ↔ Entity 轉換
  private toDomain(entity: GamesTable): Game { ... }
  private toEntity(game: Game): GamesInsert { ... }
}
```

---

## Event Publisher

### SSEEventPublisher

```typescript
// server/adapters/event/SSEEventPublisher.ts
class SSEEventPublisher extends EventPublisherPort {
  private registry: SSEConnectionRegistry

  publish(gameId: string, event: SSEEvent): void {
    // 記錄到 game_logs
    this.logEvent(gameId, event)

    // 廣播給所有連線
    this.registry.broadcast(gameId, event)
  }

  getEventStream(gameId: string): AsyncIterable<SSEEvent> {
    return this.registry.subscribe(gameId)
  }
}
```

### SSEConnectionRegistry

```typescript
// server/adapters/event/SSEConnectionRegistry.ts
class SSEConnectionRegistry {
  private connections: Map<string, Set<EventStream>> = new Map()

  register(gameId: string, stream: EventStream): void {
    const set = this.connections.get(gameId) ?? new Set()
    set.add(stream)
    this.connections.set(gameId, set)
  }

  unregister(gameId: string, stream: EventStream): void {
    this.connections.get(gameId)?.delete(stream)
  }

  broadcast(gameId: string, event: SSEEvent): void {
    const streams = this.connections.get(gameId)
    if (!streams) return

    for (const stream of streams) {
      stream.push(event)
    }
  }
}
```

---

## Game Lock

### InMemoryGameLock

使用 Promise Chain 實現悲觀鎖：

```typescript
// server/adapters/lock/InMemoryGameLock.ts
class InMemoryGameLock extends GameLockPort {
  private locks: Map<string, Promise<void>> = new Map()

  async withLock<T>(gameId: string, operation: () => Promise<T>): Promise<T> {
    const currentLock = this.locks.get(gameId) ?? Promise.resolve()

    const newLock = currentLock.then(async () => {
      await operation()
    })

    this.locks.set(gameId, newLock.catch(() => {}))

    return newLock
  }
}
```

---

## 錯誤處理

### HTTP 狀態碼

| 狀態碼 | 錯誤類型 |
|--------|---------|
| 400 | 無效操作（INVALID_OPERATION） |
| 401 | 未授權（UNAUTHORIZED） |
| 403 | 權限不足（FORBIDDEN） |
| 404 | 遊戲不存在（GAME_NOT_FOUND） |
| 409 | 狀態衝突（CONFLICT） |
| 500 | 伺服器錯誤 |

### 錯誤回應格式

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
  }
}
```

---

## 測試要求

### 適配器測試

- ✅ **REST Routes**: 測試所有端點
- ✅ **Repository Adapter**: 測試資料持久化與查詢
- ✅ **Event Publisher**: 測試 SSE 推送機制
- ✅ **Game Lock**: 測試並發控制

### 整合測試

- ✅ 測試完整 API 流程
- ✅ 測試 SSE 事件推送
- ✅ 測試錯誤處理

### 測試框架

- **工具**: Vitest
- **資料庫測試**: SQLite in-memory（開發）/ Testcontainers（CI）

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Application Layer](./application.md)
- [共用數據契約](../../shared/data-contracts.md)
- [通訊協議](../../shared/protocol.md)
- [後端架構總覽](../architecture.md)
