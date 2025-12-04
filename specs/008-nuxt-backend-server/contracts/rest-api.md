# REST API Contracts

**Feature Branch**: `008-nuxt-backend-server`
**Date**: 2024-12-04
**Base Path**: `/api/v1`

---

## 1. Overview

所有 API 端點遵循 RESTful 設計，使用 JSON 格式傳輸資料。

### 1.1 通用回應格式

**成功回應**:
```typescript
{
  data: T,
  timestamp: string  // ISO 8601
}
```

**錯誤回應**:
```typescript
{
  error: {
    code: string,
    message: string,
    details?: Record<string, unknown>
  },
  timestamp: string
}
```

### 1.2 HTTP 狀態碼

| 狀態碼 | 用途 |
|-------|------|
| 200 | 成功 |
| 201 | 資源建立成功 |
| 400 | 請求格式錯誤 |
| 401 | 未授權（session_token 無效）|
| 404 | 資源不存在 |
| 409 | 狀態衝突（如：不是該玩家的回合）|
| 500 | 伺服器錯誤 |

---

## 2. Game Endpoints

### 2.1 POST /games/join

加入遊戲或重連現有遊戲。

**Request Body**:
```typescript
interface GameJoinRequest {
  player_id: string       // UUID v4，前端 localStorage 生成
  player_name: string     // 玩家名稱（1-50 字元）
  session_token?: string  // 重連時提供
}
```

**Response (201 Created)** - 新遊戲:
```typescript
interface GameJoinResponse {
  game_id: string         // UUID v4
  session_token: string   // UUID v4，用於後續請求驗證
  player_id: string       // 確認的玩家 ID
  sse_endpoint: string    // SSE 連線端點 URL
}
```

**Response (200 OK)** - 重連:
```typescript
interface GameReconnectResponse {
  game_id: string
  session_token: string
  player_id: string
  sse_endpoint: string
  reconnected: true
}
```

**Error Responses**:
- `400 Bad Request`: 請求格式錯誤
- `401 Unauthorized`: session_token 無效或過期
- `404 Not Found`: 重連時遊戲不存在

---

### 2.2 POST /games/{gameId}/leave

玩家主動離開遊戲。

**Path Parameters**:
- `gameId`: 遊戲 ID (UUID)

**Headers**:
- `X-Session-Token`: session_token

**Response (200 OK)**:
```typescript
interface GameLeaveResponse {
  game_id: string
  left_at: string  // ISO 8601
}
```

**Side Effects**:
- 遊戲結束，對手獲勝
- 推送 `GameFinishedEvent` 給對手
- 清除遊戲會話

---

## 3. Turn Endpoints

### 3.1 POST /games/{gameId}/turns/play-card

打出手牌。

**Path Parameters**:
- `gameId`: 遊戲 ID (UUID)

**Headers**:
- `X-Session-Token`: session_token

**Request Body**:
```typescript
interface PlayCardRequest {
  card_id: string         // MMTI 格式卡片 ID
  target_card_id?: string // 配對目標（雙重配對時必須指定）
}
```

**Response (200 OK)**:
```typescript
interface PlayCardResponse {
  accepted: true
  // 實際結果透過 SSE 事件推送
}
```

**Error Responses**:
- `400 Bad Request`: 請求格式錯誤
- `401 Unauthorized`: session_token 無效
- `409 Conflict`:
  - `WRONG_PLAYER`: 不是該玩家的回合
  - `INVALID_STATE`: 當前狀態不允許此操作
  - `INVALID_CARD`: 卡片不在手牌中
  - `INVALID_TARGET`: 無效的配對目標

---

### 3.2 POST /games/{gameId}/turns/select-target

選擇翻牌配對目標（雙重配對時）。

**Path Parameters**:
- `gameId`: 遊戲 ID (UUID)

**Headers**:
- `X-Session-Token`: session_token

**Request Body**:
```typescript
interface SelectTargetRequest {
  source_card_id: string  // 翻出的卡片 ID
  target_card_id: string  // 選擇的配對目標
}
```

**Response (200 OK)**:
```typescript
interface SelectTargetResponse {
  accepted: true
}
```

**Error Responses**:
- `409 Conflict`:
  - `INVALID_STATE`: 當前狀態不是 AWAITING_SELECTION
  - `INVALID_SELECTION`: 選擇的目標不在可選列表中

---

## 4. Round Endpoints

### 4.1 POST /games/{gameId}/rounds/decision

做出 Koi-Koi 決策。

**Path Parameters**:
- `gameId`: 遊戲 ID (UUID)

**Headers**:
- `X-Session-Token`: session_token

**Request Body**:
```typescript
interface MakeDecisionRequest {
  decision: 'KOI_KOI' | 'END_ROUND'
}
```

**Response (200 OK)**:
```typescript
interface MakeDecisionResponse {
  accepted: true
}
```

**Error Responses**:
- `409 Conflict`:
  - `INVALID_STATE`: 當前狀態不是 AWAITING_DECISION

---

## 5. Snapshot Endpoint

### 5.1 GET /games/{gameId}/snapshot

取得遊戲狀態快照（SSE 斷線時的 fallback）。

**Path Parameters**:
- `gameId`: 遊戲 ID (UUID)

**Headers**:
- `X-Session-Token`: session_token

**Response (200 OK)**:
```typescript
// 結構同 GameSnapshotRestore 事件
interface SnapshotResponse {
  game_id: string
  players: PlayerInfo[]
  ruleset: Ruleset
  field_cards: string[]
  deck_remaining: number
  player_hands: PlayerHand[]
  player_depositories: PlayerDepository[]
  player_scores: PlayerScore[]
  current_flow_stage: FlowState
  active_player_id: string
  koi_statuses: KoiStatus[]
  action_timeout_seconds: number
}
```

**Error Responses**:
- `401 Unauthorized`: session_token 無效
- `404 Not Found`: 遊戲不存在或已結束

---

## 6. SSE Endpoint

### 6.1 GET /games/{gameId}/events

建立 SSE 連線接收遊戲事件。

**Path Parameters**:
- `gameId`: 遊戲 ID (UUID)

**Query Parameters**:
- `token`: session_token

**Response Headers**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Format**:
```
event: {event_type}
data: {JSON payload}

```

**Heartbeat** (每 30 秒):
```
: keepalive

```

**連線關閉條件**:
- 遊戲結束（收到 GameFinishedEvent 後）
- session_token 過期
- 客戶端主動關閉
- 伺服器偵測到連線異常

---

## 7. Authentication

所有需要驗證的端點使用 `X-Session-Token` header：

```
X-Session-Token: {session_token}
```

SSE 端點使用 query parameter：

```
GET /games/{gameId}/events?token={session_token}
```

### 7.1 Token 生命週期

| 事件 | Token 狀態 |
|-----|-----------|
| 加入遊戲 | 產生新 token |
| 重連 | 驗證現有 token |
| 遊戲結束 | Token 立即失效 |
| 斷線超過 60 秒 | Token 失效 |

---

## 8. Rate Limiting

| 端點類型 | 限制 |
|---------|------|
| /games/join | 10 req/min per IP |
| /games/{id}/turns/* | 60 req/min per session |
| /games/{id}/events | 1 連線 per session |

超過限制時回傳 `429 Too Many Requests`。
