# HTTP 狀態碼規格

## 概述

本文檔定義後端 API 使用的所有 HTTP 狀態碼及其對應的使用場景與錯誤代碼。

---

## I. 狀態碼清單

| 狀態碼 | 名稱 | 說明 |
|-------|------|------|
| 200 | OK | 請求成功 |
| 201 | Created | 資源建立成功 |
| 400 | Bad Request | 請求參數驗證失敗 |
| 401 | Unauthorized | 身份驗證失敗 |
| 403 | Forbidden | 授權失敗 |
| 404 | Not Found | 資源不存在 |
| 409 | Conflict | 狀態衝突 |
| 410 | Gone | 資源已過期 |
| 429 | Too Many Requests | 超過速率限制 |
| 500 | Internal Server Error | 伺服器內部錯誤 |

---

## II. 成功狀態碼

### 200 OK

請求成功處理。

**使用場景**：
- 遊戲重連成功
- 快照取得成功
- 遊戲操作成功（打牌、選擇配對目標、決策、確認繼續、離開）
- SSE 連線建立成功

**相關端點**：
- `GET /api/v1/games/connect` - SSE-First 連線
- `GET /api/v1/games/{gameId}/snapshot` - 遊戲快照
- `GET /api/v1/games/{gameId}/events` - SSE 事件串流
- `POST /api/v1/games/{gameId}/confirm-continue` - 確認繼續
- `POST /api/v1/games/{gameId}/leave` - 離開遊戲
- `POST /api/v1/games/{gameId}/turns/play-card` - 打出手牌
- `POST /api/v1/games/{gameId}/turns/select-target` - 選擇配對目標
- `POST /api/v1/games/{gameId}/rounds/decision` - Koi-Koi 決策

---

### 201 Created

新資源建立成功。

**使用場景**：
- 新遊戲建立成功
- 玩家首次加入遊戲（非重連）

**相關端點**：
- `POST /api/v1/games/join` - 加入/建立遊戲

---

## III. 客戶端錯誤狀態碼

### 400 Bad Request

請求參數驗證失敗。

**錯誤代碼**：`VALIDATION_ERROR` | `MISSING_GAME_ID`

**使用場景**：
- 請求 Body 格式錯誤（缺少必填欄位、類型不符）
- 路由參數驗證失敗
- Query 參數驗證失敗

**回應格式**：
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "card": ["card is required"]
    }
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

### 401 Unauthorized

身份驗證失敗。

**錯誤代碼**：`MISSING_TOKEN` | `INVALID_SESSION`

**使用場景**：
- 缺少 HttpOnly Cookie 中的 `session_token`
- Session token 無效或已過期

**回應格式**：
```json
{
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Session token is required"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

### 403 Forbidden

授權失敗，玩家無權存取該資源。

**錯誤代碼**：`GAME_MISMATCH`

**使用場景**：
- 玩家嘗試存取不屬於自己的遊戲會話
- Session token 與 gameId 不匹配

**回應格式**：
```json
{
  "error": {
    "code": "GAME_MISMATCH",
    "message": "Session does not match the requested game"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

### 404 Not Found

請求的資源不存在。

**錯誤代碼**：`GAME_NOT_FOUND`

**使用場景**：
- 遊戲 ID 無效
- 遊戲已被刪除

**回應格式**：
```json
{
  "error": {
    "code": "GAME_NOT_FOUND",
    "message": "Game not found"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

### 409 Conflict

請求與當前資源狀態衝突。

**錯誤代碼**：`GAME_NOT_STARTED` | `GAME_ALREADY_FINISHED` | `CONFIRMATION_NOT_REQUIRED`

**使用場景**：
- 遊戲尚未開始（仍在 `WAITING` 狀態）
- 遊戲已結束
- 操作與當前遊戲狀態衝突
- 不需要進行該操作的狀態

**回應格式**：
```json
{
  "error": {
    "code": "GAME_NOT_STARTED",
    "message": "Game has not started yet"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

### 410 Gone

資源曾經存在但已過期，無法恢復。

**錯誤代碼**：`GAME_EXPIRED`

**使用場景**：
- 遊戲存在於資料庫但不在記憶體中
- 無法恢復完整遊戲狀態

**回應格式**：
```json
{
  "error": {
    "code": "GAME_EXPIRED",
    "message": "Game has expired and cannot be restored"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

### 429 Too Many Requests

超過速率限制。

**錯誤代碼**：`RATE_LIMIT_EXCEEDED`

**使用場景**：
- 客戶端超過 API 速率限制

**速率限制規則**：

| 端點類型 | 限制 |
|---------|------|
| Join | 10 requests/minute |
| Turns/Rounds | 60 requests/minute |

**回應標頭**：
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
Retry-After: 30
```

**回應格式**：
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later."
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## IV. 伺服器錯誤狀態碼

### 500 Internal Server Error

伺服器內部錯誤。

**錯誤代碼**：`INTERNAL_ERROR` | `PLAYER_NOT_FOUND`

**使用場景**：
- 未捕捉的例外錯誤
- 內部邏輯錯誤
- 資料庫操作失敗
- 找不到人類玩家（內部狀態異常）

**回應格式**：
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## V. 錯誤代碼對照表

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|---------|-----------|------|
| `VALIDATION_ERROR` | 400 | 請求參數/Body 驗證失敗 |
| `MISSING_GAME_ID` | 400 | 缺少遊戲 ID |
| `MISSING_TOKEN` | 401 | 缺少 session token |
| `INVALID_SESSION` | 401 | Session token 無效或過期 |
| `GAME_MISMATCH` | 403 | Session 與遊戲 ID 不匹配 |
| `GAME_NOT_FOUND` | 404 | 遊戲不存在 |
| `GAME_NOT_STARTED` | 409 | 遊戲尚未開始 |
| `GAME_ALREADY_FINISHED` | 409 | 遊戲已結束 |
| `CONFIRMATION_NOT_REQUIRED` | 409 | 不需要確認操作 |
| `GAME_EXPIRED` | 410 | 遊戲已過期 |
| `RATE_LIMIT_EXCEEDED` | 429 | 超過速率限制 |
| `INTERNAL_ERROR` | 500 | 伺服器內部錯誤 |
| `PLAYER_NOT_FOUND` | 500 | 找不到玩家（內部異常） |

---

## VI. 端點與狀態碼對照表

| 端點 | 成功 | 可能的錯誤狀態碼 |
|-----|------|-----------------|
| `POST /api/v1/games/join` | 201, 200 | 400, 500 |
| `GET /api/v1/games/connect` | 200 | 400, 410, 500 |
| `GET /api/v1/games/{gameId}/snapshot` | 200 | 400, 401, 404, 409, 500 |
| `GET /api/v1/games/{gameId}/events` | 200 | 400, 401, 403, 500 |
| `POST /api/v1/games/{gameId}/confirm-continue` | 200 | 400, 401, 403, 404, 409, 500 |
| `POST /api/v1/games/{gameId}/leave` | 200 | 400, 401, 403, 404, 409, 500 |
| `POST /api/v1/games/{gameId}/turns/play-card` | 200 | 400, 401, 403, 404, 409, 500 |
| `POST /api/v1/games/{gameId}/turns/select-target` | 200 | 400, 401, 403, 404, 409, 500 |
| `POST /api/v1/games/{gameId}/rounds/decision` | 200 | 400, 401, 403, 404, 409, 500 |

**注意**：所有端點均可能因速率限制返回 `429`。

---

## VII. 錯誤回應通用格式

所有錯誤回應遵循以下格式：

```typescript
interface ErrorResponse {
  error: {
    code: string;              // 錯誤代碼
    message: string;           // 人類可讀的錯誤訊息
    details?: Record<string, string[]>;  // 驗證錯誤的詳細資訊
  };
  timestamp: string;           // ISO 8601 格式時間戳
}
```

---

## VIII. 相關文件

- [通訊協議](./protocol.md) - 前後端交互規格（命令與事件）
- [數據契約](./data-contracts.md) - 前後端共用的數據結構
