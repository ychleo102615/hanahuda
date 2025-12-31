# Contract: GameError Event

**Version**: 1.0.0
**Feature**: 007-lobby-settings-panel
**Created**: 2025-11-30
**Status**: Draft

---

## Overview

`GameError` 事件用於通知客戶端遊戲層級的錯誤狀況，由伺服器主動發送（Server Authority 原則）。

### 與 TurnError 的區別

| 特性 | GameError | TurnError |
|------|-----------|-----------|
| **層級** | 遊戲會話層級 | 回合操作層級 |
| **範例** | 配對超時、遊戲過期 | 打牌無效、選牌錯誤 |
| **發送時機** | 遊戲會話建立前後皆可 | 僅在遊戲進行中 |
| **客戶端處理** | 可能需要導航（返回首頁/大廳） | 顯示錯誤提示，保持在遊戲畫面 |

---

## Event Structure

### JSON Schema

```json
{
  "event_type": "GameError",
  "event_id": "string (UUID)",
  "timestamp": "string (ISO 8601)",
  "error_code": "MATCHMAKING_TIMEOUT | GAME_EXPIRED | SESSION_INVALID | OPPONENT_DISCONNECTED",
  "message": "string",
  "recoverable": "boolean",
  "suggested_action": "RETRY_MATCHMAKING | RETURN_HOME | RECONNECT (optional)"
}
```

### TypeScript Interface

```typescript
export interface GameErrorEvent {
  /** 事件類型（固定為 'GameError'） */
  readonly event_type: 'GameError'

  /** 事件 ID（唯一識別碼，UUID 格式） */
  readonly event_id: string

  /** 事件時間戳（ISO 8601 格式） */
  readonly timestamp: string

  /** 錯誤代碼 */
  readonly error_code:
    | 'MATCHMAKING_TIMEOUT'
    | 'GAME_EXPIRED'
    | 'SESSION_INVALID'
    | 'OPPONENT_DISCONNECTED'

  /** 錯誤訊息（人類可讀） */
  readonly message: string

  /** 錯誤是否可恢復 */
  readonly recoverable: boolean

  /** 建議的使用者操作（可選） */
  readonly suggested_action?: 'RETRY_MATCHMAKING' | 'RETURN_HOME' | 'RECONNECT'
}
```

---

## Error Codes

### MATCHMAKING_TIMEOUT

配對超時（伺服器在指定時間內未找到對手）。

**觸發條件**：
- 客戶端發送 `GameRequestJoin` 命令後，伺服器在 30 秒內未找到對手

**伺服器行為**：
1. 停止配對流程
2. 發送 `GameError` 事件
3. 釋放配對資源

**客戶端處理**：
- 顯示錯誤訊息「Matchmaking timeout, please retry」
- 重置配對狀態為 `idle`
- 允許使用者重試

**範例**：
```json
{
  "event_type": "GameError",
  "event_id": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2025-11-30T12:00:30Z",
  "error_code": "MATCHMAKING_TIMEOUT",
  "message": "Matchmaking timeout after 30 seconds",
  "recoverable": true,
  "suggested_action": "RETRY_MATCHMAKING"
}
```

---

### GAME_EXPIRED

遊戲會話過期（長時間無操作，伺服器清理資源）。

**觸發條件**：
- 遊戲進行中，玩家超過 10 分鐘未操作（可配置）
- 伺服器主動清理過期會話

**伺服器行為**：
1. 刪除遊戲會話
2. 發送 `GameError` 事件
3. 釋放資源

**客戶端處理**：
- 顯示錯誤訊息「Game session expired due to inactivity」
- 清除遊戲狀態
- 導航至首頁

**範例**：
```json
{
  "event_type": "GameError",
  "event_id": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2025-11-30T12:15:00Z",
  "error_code": "GAME_EXPIRED",
  "message": "Game session expired due to inactivity",
  "recoverable": false,
  "suggested_action": "RETURN_HOME"
}
```

---

### SESSION_INVALID

會話 Token 無效（重連失敗或 Token 過期）。

**觸發條件**：
- 客戶端使用無效/過期的 `session_token` 嘗試重連
- 伺服器端會話已清理

**伺服器行為**：
1. 拒絕重連請求
2. 發送 `GameError` 事件（若 SSE 連線仍存在）
3. 或於 HTTP 回應中返回錯誤（若 SSE 已斷線）

**客戶端處理**：
- 顯示錯誤訊息「Session invalid, please start a new game」
- 清除本地 `session_token`
- 導航至大廳或首頁

**範例**：
```json
{
  "event_type": "GameError",
  "event_id": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2025-11-30T12:20:00Z",
  "error_code": "SESSION_INVALID",
  "message": "Session invalid, please start a new game",
  "recoverable": false,
  "suggested_action": "RETURN_HOME"
}
```

---

### OPPONENT_DISCONNECTED

對手永久斷線（超過重連時限）。

**觸發條件**：
- 對手斷線超過 60 秒（可配置）未重連
- 伺服器判定對手永久離線

**伺服器行為**：
1. 結束遊戲會話
2. 判定剩餘玩家獲勝（可選）
3. 發送 `GameError` 事件

**客戶端處理**：
- 顯示錯誤訊息「Opponent disconnected, game ended」
- 顯示對話框，提供「View Results」或「Back to Home」選項
- 清除遊戲狀態

**範例**：
```json
{
  "event_type": "GameError",
  "event_id": "550e8400-e29b-41d4-a716-446655440004",
  "timestamp": "2025-11-30T12:25:00Z",
  "error_code": "OPPONENT_DISCONNECTED",
  "message": "Opponent disconnected, game ended",
  "recoverable": false,
  "suggested_action": "RETURN_HOME"
}
```

---

## Fields Specification

### event_type
- **Type**: `string`
- **Value**: `"GameError"` (固定)
- **Required**: ✅

### event_id
- **Type**: `string`
- **Format**: UUID v4
- **Example**: `"550e8400-e29b-41d4-a716-446655440000"`
- **Required**: ✅

### timestamp
- **Type**: `string`
- **Format**: ISO 8601 (UTC)
- **Example**: `"2025-11-30T12:00:00Z"`
- **Required**: ✅

### error_code
- **Type**: `enum`
- **Values**:
  - `MATCHMAKING_TIMEOUT`
  - `GAME_EXPIRED`
  - `SESSION_INVALID`
  - `OPPONENT_DISCONNECTED`
- **Required**: ✅

### message
- **Type**: `string`
- **Description**: 人類可讀的錯誤訊息（英文）
- **Max Length**: 200 characters
- **Required**: ✅

### recoverable
- **Type**: `boolean`
- **Description**:
  - `true`: 使用者可重試（如配對超時）
  - `false`: 不可恢復，需返回首頁（如會話無效）
- **Required**: ✅

### suggested_action
- **Type**: `enum | undefined`
- **Values**:
  - `RETRY_MATCHMAKING`: 建議重試配對（保持在大廳）
  - `RETURN_HOME`: 建議返回首頁（清除狀態）
  - `RECONNECT`: 建議嘗試重連（保留會話）
- **Required**: ❌ (可選)
- **Default**: `undefined`

---

## Client Implementation

### Event Handler (Use Case)

```typescript
export class HandleGameErrorUseCase implements HandleGameErrorPort {
  constructor(
    private readonly notification: NotificationPort,
    private readonly matchmakingState: MatchmakingStatePort,
    private readonly navigation: NavigationPort
  ) {}

  execute(event: GameErrorEvent): void {
    // 1. 顯示錯誤通知
    this.notification.showError(event.message)

    // 2. 更新配對狀態
    this.matchmakingState.setStatus('error')
    this.matchmakingState.setErrorMessage(event.message)

    // 3. 根據 recoverable 決定後續處理
    if (!event.recoverable) {
      this.matchmakingState.clearSession()
      this.navigation.navigateToHome()
      return
    }

    // 4. 可恢復錯誤，根據 suggested_action 處理
    switch (event.suggested_action) {
      case 'RETURN_HOME':
        this.matchmakingState.clearSession()
        this.navigation.navigateToHome()
        break
      case 'RETRY_MATCHMAKING':
        // 保持在大廳，使用者可手動重試
        break
      case 'RECONNECT':
        // 嘗試重連（若實作）
        break
    }
  }
}
```

---

## Server Implementation Guidelines

### 1. Timeout Management

伺服器應使用 **後台任務/排程器** 管理超時邏輯，而非依賴客戶端回報。

**範例（配對超時）**：
```java
// 偽代碼
@Service
public class MatchmakingService {
  private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

  public void startMatchmaking(String playerId) {
    // 啟動配對流程
    MatchmakingRequest request = new MatchmakingRequest(playerId);
    matchmakingQueue.add(request);

    // 排程 30 秒後檢查配對結果
    scheduler.schedule(() -> {
      if (!request.isMatched()) {
        // 配對超時，發送 GameError 事件
        GameErrorEvent errorEvent = GameErrorEvent.builder()
          .eventType("GameError")
          .eventId(UUID.randomUUID().toString())
          .timestamp(Instant.now().toString())
          .errorCode("MATCHMAKING_TIMEOUT")
          .message("Matchmaking timeout after 30 seconds")
          .recoverable(true)
          .suggestedAction("RETRY_MATCHMAKING")
          .build();

        sseService.sendEventToPlayer(playerId, errorEvent);
        matchmakingQueue.remove(request);
      }
    }, 30, TimeUnit.SECONDS);
  }
}
```

---

### 2. Error Code Selection Guidelines

| 情境 | 錯誤代碼 | recoverable | suggested_action |
|------|----------|-------------|------------------|
| 配對超時（無對手） | `MATCHMAKING_TIMEOUT` | `true` | `RETRY_MATCHMAKING` |
| 遊戲長時間無操作 | `GAME_EXPIRED` | `false` | `RETURN_HOME` |
| Token 無效/過期 | `SESSION_INVALID` | `false` | `RETURN_HOME` |
| 對手永久斷線 | `OPPONENT_DISCONNECTED` | `false` | `RETURN_HOME` |

---

### 3. SSE 推送

使用現有的 SSE 事件推送機制：

```java
// 偽代碼
sseEventPublisher.publishToPlayer(playerId, gameErrorEvent);
```

---

## Testing

### Unit Test (Client)

```typescript
describe('HandleGameErrorUseCase', () => {
  it('should handle MATCHMAKING_TIMEOUT and reset to idle', () => {
    const event: GameErrorEvent = {
      event_type: 'GameError',
      event_id: 'test-001',
      timestamp: '2025-11-30T12:00:00Z',
      error_code: 'MATCHMAKING_TIMEOUT',
      message: 'Matchmaking timeout after 30 seconds',
      recoverable: true,
      suggested_action: 'RETRY_MATCHMAKING',
    }

    useCase.execute(event)

    expect(notificationPort.showError).toHaveBeenCalledWith('Matchmaking timeout after 30 seconds')
    expect(matchmakingStatePort.setStatus).toHaveBeenCalledWith('error')
    expect(matchmakingStatePort.setErrorMessage).toHaveBeenCalledWith('Matchmaking timeout after 30 seconds')
    expect(navigationPort.navigateToHome).not.toHaveBeenCalled()
  })

  it('should handle SESSION_INVALID and navigate to home', () => {
    const event: GameErrorEvent = {
      event_type: 'GameError',
      event_id: 'test-002',
      timestamp: '2025-11-30T12:00:00Z',
      error_code: 'SESSION_INVALID',
      message: 'Session invalid',
      recoverable: false,
    }

    useCase.execute(event)

    expect(matchmakingStatePort.clearSession).toHaveBeenCalled()
    expect(navigationPort.navigateToHome).toHaveBeenCalled()
  })
})
```

---

## Integration with protocol.md

此事件規格應整合至 `doc/shared/protocol.md`：

### 建議新增位置

```markdown
## V. Server-to-Client Events

### B. Game Events (新增 Section)

#### GameError

遊戲層級錯誤事件（詳見 specs/007-lobby-settings-panel/contracts/game-error-event.md）

**Event Type**: `GameError`

**Payload**:
```json
{
  "event_type": "GameError",
  "event_id": "string",
  "timestamp": "string",
  "error_code": "MATCHMAKING_TIMEOUT | GAME_EXPIRED | SESSION_INVALID | OPPONENT_DISCONNECTED",
  "message": "string",
  "recoverable": "boolean",
  "suggested_action": "RETRY_MATCHMAKING | RETURN_HOME | RECONNECT (optional)"
}
```

**Usage**: 由伺服器主動推送，通知客戶端遊戲層級錯誤（配對超時、會話過期等）
```

---

## Versioning

- **Version 1.0.0** (2025-11-30): 初始版本
  - 定義 4 種錯誤代碼（MATCHMAKING_TIMEOUT, GAME_EXPIRED, SESSION_INVALID, OPPONENT_DISCONNECTED）
  - 定義 3 種 suggested_action
  - 建立客戶端/伺服器實作指南

---

## Appendix

### Related Documents

- `specs/007-lobby-settings-panel/spec.md` - 功能規格
- `specs/007-lobby-settings-panel/data-model.md` - 數據模型
- `doc/shared/protocol.md` - 通訊協議（需更新）

### Future Extensions

未來可擴充的錯誤代碼：
- `OPPONENT_AFK`: 對手掛機（長時間未操作）
- `SERVER_MAINTENANCE`: 伺服器維護中
- `RATE_LIMIT_EXCEEDED`: 請求速率超限
