# Contract: REST API Client

**Contract Type**: Implementation Contract
**Component**: `GameApiClient`
**Implements**: `SendCommandPort` (Output Port)
**Date**: 2025-01-19

本契約定義 REST API 客戶端的實作規範，包含請求格式、錯誤處理、重試機制、超時設定等。

---

## 1. 介面契約

### 1.1 SendCommandPort 實作

`GameApiClient` 必須完整實作 `SendCommandPort` 介面的所有方法。

```typescript
interface SendCommandPort {
  playHandCard(cardId: string, matchTargetId?: string): Promise<void>;
  selectTarget(sourceCardId: string, targetCardId: string): Promise<void>;
  makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void>;
}
```

**契約要求**:
- ✅ 所有方法必須為 `async`
- ✅ 所有方法成功時返回 `Promise<void>`
- ✅ 所有方法失敗時拋出錯誤（不返回錯誤對象）
- ✅ 錯誤必須為 `NetworkError` / `ServerError` / `TimeoutError` / `ValidationError` 之一

---

## 2. API 端點規範

### 2.1 playHandCard

**端點**: `POST /api/v1/games/{gameId}/commands/play-hand-card`

**請求格式**:
```json
{
  "card_id": "0111",
  "match_target_id": "0112"  // 可選
}
```

**成功回應**: `204 No Content`

**錯誤回應**:
- `400 Bad Request`: 無效的卡片 ID 或配對目標
- `404 Not Found`: 遊戲不存在
- `422 Unprocessable Entity`: 操作不合法（不是玩家回合）
- `500 Internal Server Error`: 伺服器錯誤

**契約要求**:
- ✅ `cardId` 必須為 4 位數字字串（例如 '0111'）
- ✅ `matchTargetId` 為可選參數，若無配對則不傳遞
- ✅ `gameId` 從 `GameStateStore` 獲取
- ✅ 請求超時時間 5 秒
- ✅ 失敗時自動重試最多 3 次（僅網路錯誤或 5xx）

---

### 2.2 selectTarget

**端點**: `POST /api/v1/games/{gameId}/commands/select-target`

**請求格式**:
```json
{
  "source_card_id": "0111",
  "target_card_id": "0112"
}
```

**成功回應**: `204 No Content`

**錯誤回應**:
- `400 Bad Request`: 無效的卡片 ID
- `404 Not Found`: 遊戲不存在
- `422 Unprocessable Entity`: 配對不合法

**契約要求**:
- ✅ `sourceCardId` 與 `targetCardId` 必須為 4 位數字字串
- ✅ `gameId` 從 `GameStateStore` 獲取
- ✅ 請求超時時間 5 秒
- ✅ 失敗時自動重試最多 3 次

---

### 2.3 makeDecision

**端點**: `POST /api/v1/games/{gameId}/commands/make-decision`

**請求格式**:
```json
{
  "decision": "KOI_KOI"  // 或 "END_ROUND"
}
```

**成功回應**: `204 No Content`

**錯誤回應**:
- `400 Bad Request`: 無效的決策值
- `404 Not Found`: 遊戲不存在
- `422 Unprocessable Entity`: 當前狀態不需要決策

**契約要求**:
- ✅ `decision` 必須為 `'KOI_KOI'` 或 `'END_ROUND'`
- ✅ `gameId` 從 `GameStateStore` 獲取
- ✅ 請求超時時間 5 秒
- ✅ 失敗時自動重試最多 3 次

---

### 2.4 joinGame (額外方法)

**端點**: `POST /api/v1/games/join`

**請求格式**:
```json
{
  "session_token": "abc-123-def"  // 可選，用於重連
}
```

**成功回應**: `200 OK`
```json
{
  "game_id": "uuid-123",
  "session_token": "new-token-456",
  "player_id": "player-1",
  "snapshot": { /* 完整遊戲快照（若為重連） */ }
}
```

**錯誤回應**:
- `400 Bad Request`: 無效的 session_token
- `404 Not Found`: session_token 對應的遊戲不存在
- `500 Internal Server Error`: 伺服器錯誤

**契約要求**:
- ✅ `sessionToken` 為可選參數（首次加入不傳遞，重連時傳遞）
- ✅ 成功後必須返回 `JoinGameResponse` 對象
- ✅ 返回的 `session_token` 必須保存到 SessionStorage
- ✅ 請求超時時間 5 秒
- ✅ 失敗時不重試（避免重複加入遊戲）

---

## 3. 錯誤處理契約

### 3.1 錯誤型別

所有錯誤必須為以下四種之一：

```typescript
class NetworkError extends Error {
  name: 'NetworkError';
  message: string;  // 預設 '網路連線失敗'
}

class ServerError extends Error {
  name: 'ServerError';
  status: number;   // HTTP 狀態碼 (5xx)
  message: string;  // 預設 '伺服器錯誤 (${status})'
}

class TimeoutError extends Error {
  name: 'TimeoutError';
  message: string;  // 預設 '請求超時'
}

class ValidationError extends Error {
  name: 'ValidationError';
  message: string;  // 詳細驗證錯誤訊息
}
```

---

### 3.2 錯誤分類規則

| 情況 | 錯誤型別 | 是否重試 |
|------|---------|---------|
| `fetch` 拋出 `TypeError`（網路斷線） | `NetworkError` | ✅ 是 |
| `AbortController.abort()`（超時） | `TimeoutError` | ❌ 否 |
| HTTP 4xx 客戶端錯誤 | `ValidationError` | ❌ 否 |
| HTTP 5xx 伺服器錯誤 | `ServerError` | ✅ 是 |

---

### 3.3 錯誤訊息友善化

**契約要求**:
- ✅ 所有錯誤訊息必須為繁體中文（或英文，根據語言設定）
- ✅ 不直接顯示 HTTP 狀態碼給使用者（包裝為友善訊息）
- ✅ 提供明確的錯誤原因（例如「無效的卡片 ID」而非「Bad Request」）

**範例映射**:
```typescript
const ERROR_MESSAGE_MAPPING: Record<number, string> = {
  400: '請求格式錯誤，請稍後再試',
  404: '遊戲不存在或已結束',
  422: '此操作不合法，請檢查遊戲狀態',
  500: '伺服器暫時無法使用，請稍後再試',
  503: '伺服器維護中，請稍後再試',
};
```

---

## 4. 重試機制契約

### 4.1 重試條件

**可重試錯誤**:
- `NetworkError`（網路斷線）
- `ServerError`（5xx 伺服器錯誤）

**不可重試錯誤**:
- `TimeoutError`（超時）
- `ValidationError`（4xx 客戶端錯誤）

---

### 4.2 重試策略

**指數退避策略**:
- 第 1 次重試：延遲 1 秒
- 第 2 次重試：延遲 2 秒
- 第 3 次重試：延遲 3 秒
- 最多重試 3 次

**契約要求**:
- ✅ 使用 `await sleep(delay)` 實作延遲
- ✅ 每次重試前記錄日誌（`console.warn`）
- ✅ 達到最大重試次數後拋出最後一次的錯誤
- ✅ 重試過程中不改變原始請求參數

**實作範例**:
```typescript
private async postWithRetry(url: string, body: any, retries = 3): Promise<any> {
  try {
    return await this.post(url, body);
  } catch (error) {
    if (retries > 0 && this.isRetryableError(error)) {
      const delay = (4 - retries) * 1000;  // 1s, 2s, 3s
      console.warn(`API 請求失敗，${delay}ms 後重試...（剩餘 ${retries} 次）`);
      await sleep(delay);
      return this.postWithRetry(url, body, retries - 1);
    }
    throw error;
  }
}
```

---

## 5. 超時處理契約

### 5.1 超時設定

**契約要求**:
- ✅ 所有 API 請求必須設定超時時間（預設 5 秒）
- ✅ 使用 `AbortController` 實作超時
- ✅ 超時後拋出 `TimeoutError`

**實作範例**:
```typescript
private async post(url: string, body: any): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), this.timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ServerError(response.status, await response.text());
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw error;
  }
}
```

---

## 6. 遊戲上下文獲取契約

### 6.1 gameId 與 playerId 獲取

**契約要求**:
- ✅ 所有命令端點都需要 `gameId`（路徑參數）
- ✅ `gameId` 必須從 `GameStateStore.gameId` 獲取
- ✅ 若 `gameId` 為 `null`，拋出 `ValidationError('遊戲尚未初始化')`

**實作範例**:
```typescript
private getGameContext(): { gameId: string; playerId: string } {
  const store = useGameStateStore();
  const gameId = store.gameId;
  const playerId = store.localPlayerId;

  if (!gameId) {
    throw new ValidationError('遊戲尚未初始化');
  }
  if (!playerId) {
    throw new ValidationError('玩家 ID 未設定');
  }

  return { gameId, playerId };
}
```

---

## 7. 日誌記錄契約

### 7.1 日誌層級

**契約要求**:
- ✅ 成功的 API 請求：`console.info`（可選，開發模式啟用）
- ✅ 重試中的請求：`console.warn`
- ✅ 最終失敗的請求：`console.error`

**範例**:
```typescript
// 成功
console.info(`[API] playHandCard success`, { cardId, matchTargetId });

// 重試
console.warn(`[API] playHandCard failed, retrying... (${retries} left)`, error);

// 失敗
console.error(`[API] playHandCard failed after 3 retries`, error);
```

---

## 8. 測試契約

### 8.1 單元測試要求

**必須測試的場景**:
1. ✅ 成功的 API 請求（200/204 回應）
2. ✅ 4xx 錯誤拋出 `ValidationError`（不重試）
3. ✅ 5xx 錯誤拋出 `ServerError`（重試 3 次）
4. ✅ 網路錯誤拋出 `NetworkError`（重試 3 次）
5. ✅ 超時拋出 `TimeoutError`（不重試）
6. ✅ 重試機制正確執行（指數退避）
7. ✅ `gameId` 為 `null` 時拋出 `ValidationError`

**測試覆蓋率目標**: > 85%

**測試範例**:
```typescript
describe('GameApiClient', () => {
  it('should successfully send playHandCard command', async () => {
    const client = new GameApiClient('http://localhost:8080');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await expect(client.playHandCard('0111')).resolves.toBeUndefined();
  });

  it('should throw ValidationError on 400 Bad Request', async () => {
    const client = new GameApiClient('http://localhost:8080');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Invalid card ID',
    });

    await expect(client.playHandCard('invalid')).rejects.toThrow(ValidationError);
  });

  it('should retry 3 times on ServerError', async () => {
    const client = new GameApiClient('http://localhost:8080');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(client.playHandCard('0111')).rejects.toThrow(ServerError);
    expect(global.fetch).toHaveBeenCalledTimes(4);  // 1 + 3 retries
  });
});
```

---

## 9. 安全性契約

### 9.1 輸入驗證

**契約要求**:
- ✅ 所有 `cardId` 必須驗證為 4 位數字字串（正則表達式 `/^\d{4}$/`）
- ✅ `decision` 必須驗證為 `'KOI_KOI'` 或 `'END_ROUND'`
- ✅ 驗證失敗時拋出 `ValidationError`（不發送請求）

**實作範例**:
```typescript
private validateCardId(cardId: string): void {
  if (!/^\d{4}$/.test(cardId)) {
    throw new ValidationError(`無效的卡片 ID: ${cardId}`);
  }
}
```

---

### 9.2 CORS 與 HTTPS

**契約要求**:
- ✅ 生產環境必須使用 HTTPS（`baseURL` 必須為 `https://`）
- ✅ 開發環境可使用 HTTP（`http://localhost:8080`）
- ✅ CORS 由後端設定，前端無需額外處理

---

## 10. 效能契約

### 10.1 請求超時

**契約要求**:
- ✅ 所有請求超時時間為 5 秒
- ✅ 可透過建構函數參數自訂（`new GameApiClient(baseURL, { timeout: 10000 })`）

---

### 10.2 並發請求

**契約要求**:
- ✅ 同一時間最多允許 3 個並發請求（避免過載）
- ❌ MVP 階段不實作並發限制（Post-MVP 可使用 `p-limit` 套件）

---

## 總結

本契約定義了 `GameApiClient` 的完整實作規範，確保：

✅ 嚴格遵循 `SendCommandPort` 介面
✅ 正確處理所有錯誤情況（4 種錯誤型別）
✅ 實作可靠的重試機制（指數退避，最多 3 次）
✅ 設定合理的超時時間（5 秒）
✅ 驗證所有輸入參數
✅ 記錄完整的日誌
✅ 達到 85% 以上的測試覆蓋率

所有實作必須通過契約測試後才能整合到系統中。
