# Contract: SSE Client

**Contract Type**: Implementation Contract
**Component**: `GameEventClient` + `EventRouter`
**Interacts With**: Input Ports (事件處理)
**Date**: 2025-01-19

本契約定義 SSE 客戶端的實作規範，包含連線管理、事件解析、重連機制、事件路由等。

---

## 1. GameEventClient 契約

### 1.1 連線管理

**契約要求**:
- ✅ 使用原生 `EventSource` API（不使用第三方庫）
- ✅ 連線建立時自動註冊所有事件監聽器（13 種事件類型）
- ✅ 連線中斷時自動觸發重連機制
- ✅ 提供 `connect()` / `disconnect()` / `isConnected()` 公開方法

**連線 URL 格式**:
```
GET /api/v1/games/{gameId}/events?token={sessionToken}
```

**實作範例**:
```typescript
connect(gameId: string, sessionToken: string): void {
  const url = `${this.baseURL}/api/v1/games/${gameId}/events?token=${sessionToken}`;
  this.eventSource = new EventSource(url);

  this.eventSource.onopen = () => {
    console.info('SSE 連線已建立');
    this.reconnectAttempts = 0;
    this.onConnectionEstablished();
  };

  this.eventSource.onerror = (event) => {
    console.error('SSE 連線錯誤', event);
    this.eventSource?.close();
    this.onConnectionLost();
    this.reconnect(gameId, sessionToken);
  };

  this.registerEventListeners();
}
```

---

### 1.2 事件監聽註冊

**契約要求**:
- ✅ 必須註冊所有 13 種 SSE 事件類型
- ✅ 使用 `addEventListener(eventType, handler)` 註冊
- ✅ 事件 handler 必須解析 `event.data`（JSON 字串）
- ✅ 解析後的 payload 交給 `EventRouter.route()` 處理

**支援的事件類型**:
```typescript
const SSE_EVENT_TYPES = [
  'GameStarted',
  'RoundDealt',
  'TurnCompleted',
  'SelectionRequired',
  'TurnProgressAfterSelection',
  'DecisionRequired',
  'DecisionMade',
  'YakuFormed',
  'RoundScored',
  'RoundEndedInstantly',
  'RoundDrawn',
  'GameFinished',
  'TurnError',
  'GameSnapshotRestore',
] as const;
```

**實作範例**:
```typescript
private registerEventListeners(): void {
  SSE_EVENT_TYPES.forEach(eventType => {
    this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        this.eventRouter.route(eventType, payload);
      } catch (error) {
        console.error(`SSE 事件解析失敗: ${eventType}`, error);
      }
    });
  });
}
```

---

### 1.3 重連機制

**契約要求**:
- ✅ 連線中斷時自動重連
- ✅ 使用指數退避策略（1s → 2s → 4s → 8s → 16s）
- ✅ 最大重連次數 5 次
- ✅ 最大等待時間 30 秒（16s 後不再增加延遲）
- ✅ 重連成功後重置計數器
- ✅ 達到最大次數後調用 `onConnectionFailed()`

**指數退避表**:
| 嘗試次數 | 延遲時間 |
|---------|---------|
| 1 | 1 秒 |
| 2 | 2 秒 |
| 3 | 4 秒 |
| 4 | 8 秒 |
| 5 | 16 秒 |

**實作範例**:
```typescript
private async reconnect(gameId: string, sessionToken: string): Promise<void> {
  if (this.reconnectAttempts >= this.maxAttempts) {
    console.error('SSE 重連失敗，達到最大嘗試次數');
    this.onConnectionFailed();
    return;
  }

  const delay = this.reconnectDelays[this.reconnectAttempts];
  this.reconnectAttempts++;

  console.warn(`SSE 重連中... (嘗試 ${this.reconnectAttempts}/${this.maxAttempts})，等待 ${delay}ms`);

  await sleep(delay);
  this.connect(gameId, sessionToken);
}
```

---

### 1.4 連線狀態回調

**契約要求**:
- ✅ 連線建立成功：`onConnectionEstablished()`
- ✅ 連線中斷：`onConnectionLost()`
- ✅ 重連失敗（達到最大次數）：`onConnectionFailed()`

**回調行為**:
```typescript
private onConnectionEstablished(): void {
  const uiState = useUIStateStore();
  uiState.setConnectionStatus('connected');
  uiState.hideReconnectionMessage();

  // 發送 joinGame 請求獲取快照（確保狀態同步）
  const apiClient = container.resolve<GameApiClient>('GameApiClient');
  const sessionToken = sessionStorage.getItem('sessionToken')!;
  apiClient.joinGame(sessionToken).then(response => {
    if (response.snapshot) {
      const port = container.resolve<HandleGameSnapshotRestorePort>('HandleGameSnapshotRestorePort');
      port.execute(response.snapshot);
    }
  });
}

private onConnectionLost(): void {
  const uiState = useUIStateStore();
  uiState.setConnectionStatus('disconnected');
  uiState.showReconnectionMessage();
}

private onConnectionFailed(): void {
  const uiState = useUIStateStore();
  uiState.setConnectionStatus('disconnected');
  uiState.showErrorMessage('無法連線到伺服器，請檢查網路或重新整理頁面');
}
```

---

## 2. EventRouter 契約

### 2.1 事件路由職責

**契約要求**:
- ✅ 將 SSE 事件類型映射到對應的 Input Port
- ✅ **僅依賴 Input Ports 介面**（不依賴具體 Use Cases）
- ✅ 未註冊的事件類型顯示警告（不拋出異常）
- ✅ 事件 payload 直接傳遞給 Input Port（不做額外處理）

**類別定義**:
```typescript
class EventRouter {
  private handlers: Map<string, InputPort<any>>;

  constructor() {
    this.handlers = new Map();
  }

  register(eventType: string, port: InputPort<any>): void {
    this.handlers.set(eventType, port);
  }

  route(eventType: string, payload: any): void {
    const port = this.handlers.get(eventType);
    if (port) {
      port.execute(payload);
    } else {
      console.warn(`未註冊的事件類型: ${eventType}`);
    }
  }

  unregister(eventType: string): void {
    this.handlers.delete(eventType);
  }

  clear(): void {
    this.handlers.clear();
  }
}
```

---

### 2.2 事件類型映射

**契約要求**:
- ✅ 所有 13 種事件類型必須在 DI Container 初始化時註冊
- ✅ 使用 Input Port Token 而非 Use Case 類別
- ✅ 註冊順序不影響功能（Map 無序）

**註冊範例**（在 `di/registry.ts` 中）:
```typescript
function registerEventRouter(container: DIContainer): EventRouter {
  const router = new EventRouter();

  router.register('GameStarted',
    container.resolve<HandleGameStartedPort>('HandleGameStartedPort')
  );

  router.register('RoundDealt',
    container.resolve<HandleRoundDealtPort>('HandleRoundDealtPort')
  );

  router.register('TurnCompleted',
    container.resolve<HandleTurnCompletedPort>('HandleTurnCompletedPort')
  );

  // ... 註冊所有 15 個事件處理 Input Ports

  return router;
}
```

---

## 3. SSE 事件格式契約

### 3.1 事件結構

**SSE 訊息格式** (遵循 SSE 標準):
```
event: GameStarted
data: {"game_id":"123","players":[...],"ruleset":{...}}
id: 1

event: RoundDealt
data: {"round_number":1,"hand_cards":[...],"field_cards":[...]}
id: 2
```

**契約要求**:
- ✅ `event` 欄位：事件類型（字串）
- ✅ `data` 欄位：JSON 字串（必須可解析為對象）
- ✅ `id` 欄位：事件序列號（可選，用於去重）

---

### 3.2 Payload 驗證

**契約要求**:
- ✅ 解析 `event.data` 時使用 `JSON.parse()`
- ✅ 解析失敗時記錄錯誤（`console.error`），但不拋出異常
- ✅ 解析成功後不驗證 payload 結構（由 Use Cases 驗證）
- ✅ 將 payload 原樣傳遞給 Input Port

**錯誤處理範例**:
```typescript
this.eventSource.addEventListener(eventType, (event: MessageEvent) => {
  try {
    const payload = JSON.parse(event.data);
    this.eventRouter.route(eventType, payload);
  } catch (error) {
    console.error(`SSE 事件解析失敗: ${eventType}`, {
      data: event.data,
      error,
    });
    // 不拋出異常，避免中斷後續事件處理
  }
});
```

---

## 4. 連線生命週期契約

### 4.1 初始化流程

```
1. 調用 connect(gameId, sessionToken)
2. 建立 EventSource 連線
3. 註冊 onopen / onerror 處理器
4. 註冊所有事件監聽器（13 種）
5. 等待連線建立
6. onopen 觸發 → onConnectionEstablished()
7. 發送 joinGame 請求獲取快照（若為重連）
```

---

### 4.2 正常運作流程

```
1. EventSource 保持連線
2. 接收 SSE 事件（MessageEvent）
3. 解析 event.data (JSON)
4. 路由到對應的 Input Port
5. Input Port 調用 Use Case
6. Use Case 更新狀態 / 觸發 UI 效果
```

---

### 4.3 斷線重連流程

```
1. EventSource onerror 觸發
2. 關閉舊連線（eventSource.close()）
3. 調用 onConnectionLost()（顯示重連提示）
4. 調用 reconnect()
5. 等待指數退避延遲（1s, 2s, 4s, 8s, 16s）
6. 重新調用 connect(gameId, sessionToken)
7. 若成功 → onConnectionEstablished()，重置計數器
8. 若失敗 → 重複步驟 2-7（最多 5 次）
9. 達到最大次數 → onConnectionFailed()（顯示錯誤訊息）
```

---

### 4.4 主動斷線流程

```
1. 調用 disconnect()
2. 關閉 EventSource（eventSource.close()）
3. 清空 eventSource 引用（eventSource = null）
4. 不觸發重連機制
```

---

## 5. 測試契約

### 5.1 單元測試要求

**必須測試的場景**:
1. ✅ 成功建立 SSE 連線（`onopen` 觸發）
2. ✅ 接收事件並正確路由到 Input Port
3. ✅ 解析錯誤的 JSON payload（記錄錯誤但不拋出異常）
4. ✅ 連線中斷後自動重連（`onerror` 觸發）
5. ✅ 重連使用指數退避策略（延遲正確）
6. ✅ 達到最大重連次數後停止重連
7. ✅ 重連成功後重置計數器
8. ✅ 主動斷線後不觸發重連

**測試覆蓋率目標**: > 75%

---

### 5.2 整合測試要求

**必須測試的場景**:
1. ✅ 與真實 SSE 伺服器建立連線（Mock Server）
2. ✅ 接收完整的事件流（GameStarted → RoundDealt → TurnCompleted → ...）
3. ✅ 模擬斷線並驗證重連行為
4. ✅ 驗證事件正確路由到 Use Cases（端到端）

**測試範例**（使用 Mock Server）:
```typescript
describe('GameEventClient', () => {
  let mockServer: MockSSEServer;

  beforeEach(() => {
    mockServer = new MockSSEServer('http://localhost:9999');
    mockServer.start();
  });

  afterEach(() => {
    mockServer.stop();
  });

  it('should establish SSE connection', async () => {
    const router = new EventRouter();
    const client = new GameEventClient('http://localhost:9999', router);

    const onOpen = vi.fn();
    mockServer.on('connection', onOpen);

    client.connect('game-123', 'token-456');

    await waitFor(() => expect(onOpen).toHaveBeenCalled());
  });

  it('should route events to Input Ports', async () => {
    const router = new EventRouter();
    const mockPort = { execute: vi.fn() };
    router.register('GameStarted', mockPort);

    const client = new GameEventClient('http://localhost:9999', router);
    client.connect('game-123', 'token-456');

    mockServer.emit('GameStarted', { game_id: '123' });

    await waitFor(() => expect(mockPort.execute).toHaveBeenCalledWith({ game_id: '123' }));
  });

  it('should retry on connection error', async () => {
    const client = new GameEventClient('http://localhost:9999', new EventRouter());

    mockServer.failNextConnection();

    client.connect('game-123', 'token-456');

    await sleep(2000);  // 等待第一次重連（1s 延遲）

    expect(client['reconnectAttempts']).toBe(1);
  });
});
```

---

## 6. 安全性契約

### 6.1 Token 傳遞

**契約要求**:
- ✅ `sessionToken` 必須透過 URL 參數傳遞（`?token={sessionToken}`）
- ✅ 不使用 HTTP Headers（EventSource 不支援自訂 Headers）
- ✅ 使用 HTTPS 確保 Token 加密傳輸（生產環境）

---

### 6.2 事件來源驗證

**契約要求**:
- ✅ 僅接受來自指定 `baseURL` 的事件
- ✅ 不處理來自其他來源的 MessageEvent
- ✅ 驗證 `event.origin`（瀏覽器自動處理）

---

## 7. 效能契約

### 7.1 事件處理效能

**契約要求**:
- ✅ 事件解析時間 < 10ms（JSON.parse）
- ✅ 事件路由時間 < 5ms（Map.get + 函數調用）
- ✅ 總延遲 < 100ms（SSE 推送到 Use Case 執行）

---

### 7.2 記憶體管理

**契約要求**:
- ✅ 斷線後正確釋放 EventSource 資源（`eventSource.close()`）
- ✅ 不累積未處理的事件（事件處理為同步流程）
- ✅ EventRouter 的 Map 不無限增長（固定 13-15 個事件類型）

---

## 8. 日誌記錄契約

### 8.1 日誌層級

**契約要求**:
- ✅ 連線建立成功：`console.info`
- ✅ 接收到事件：`console.info`（開發模式，生產環境可關閉）
- ✅ 連線中斷：`console.warn`
- ✅ 重連嘗試：`console.warn`
- ✅ 事件解析失敗：`console.error`
- ✅ 重連失敗（達到最大次數）：`console.error`

**範例**:
```typescript
// 連線建立
console.info('[SSE] 連線已建立', { gameId, sessionToken });

// 接收事件
console.info('[SSE] 接收事件', { eventType, payload });

// 重連嘗試
console.warn('[SSE] 重連中...', { attempts: this.reconnectAttempts, delay });

// 重連失敗
console.error('[SSE] 重連失敗，達到最大嘗試次數', { maxAttempts: this.maxAttempts });
```

---

## 總結

本契約定義了 SSE 客戶端的完整實作規範，確保：

✅ 正確使用原生 EventSource API
✅ 實作可靠的重連機制（指數退避，最多 5 次）
✅ 正確路由事件到 Input Ports（不依賴具體 Use Cases）
✅ 處理所有錯誤情況（解析失敗、連線中斷、重連失敗）
✅ 提供清晰的連線狀態回調
✅ 記錄完整的日誌
✅ 達到 75% 以上的測試覆蓋率

所有實作必須通過契約測試後才能整合到系統中。
