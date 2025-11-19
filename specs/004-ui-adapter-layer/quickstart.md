# Quickstart: UI Adapter Layer 開發指南

**Feature**: User Interface BC - Adapter Layer
**Date**: 2025-01-19
**Status**: Phase 1 Complete

本文檔提供 UI Adapter Layer 的快速入門指南，包含環境設定、開發流程、測試執行、常見任務等。

---

## 目錄

1. [環境設定](#1-環境設定)
2. [專案結構導覽](#2-專案結構導覽)
3. [開發流程](#3-開發流程)
4. [測試執行](#4-測試執行)
5. [常見開發任務](#5-常見開發任務)
6. [故障排除](#6-故障排除)

---

## 1. 環境設定

### 1.1 前置需求

**必要軟體**:
- **Node.js**: >= 18.x (建議 20.x)
- **pnpm**: >= 8.x (或 npm >= 9.x)
- **Git**: >= 2.x

**檢查版本**:
```bash
node --version  # v20.x.x
pnpm --version  # 8.x.x
git --version   # 2.x.x
```

---

### 1.2 Clone 專案

```bash
git clone https://github.com/your-org/hanahuda.git
cd hanahuda
git checkout 004-ui-adapter-layer
```

---

### 1.3 安裝依賴

```bash
cd front-end
pnpm install
```

**預期輸出**:
```
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 2.1s
```

---

### 1.4 環境變數設定

建立 `.env.local` 檔案（不提交到 Git）:

```bash
# front-end/.env.local
VITE_API_BASE_URL=http://localhost:8080
VITE_GAME_MODE=backend  # backend | mock | local
```

**環境變數說明**:
| 變數 | 預設值 | 說明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:8080` | 後端 API 基礎 URL |
| `VITE_GAME_MODE` | `backend` | 遊戲模式（backend / mock / local） |

---

### 1.5 啟動開發伺服器

```bash
pnpm dev
```

**預期輸出**:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

開啟瀏覽器訪問 `http://localhost:5173`。

---

## 2. 專案結構導覽

### 2.1 Adapter Layer 目錄結構

```
front-end/src/user-interface/adapter/
├── index.ts                # 公開 API（導出 setupDI、registerAdapters）
│
├── di/                     # 自訂輕量級 DI Container
│   ├── container.ts        # 核心容器實作（~100 行）
│   ├── registry.ts         # 依賴註冊函數
│   ├── tokens.ts           # 依賴注入 Token 定義（Symbol）
│   └── index.ts
│
├── api/                    # REST API 客戶端
│   ├── GameApiClient.ts    # 實作 SendCommandPort
│   ├── errors.ts           # API 錯誤型別
│   ├── types.ts            # API 請求/回應型別
│   └── index.ts
│
├── sse/                    # SSE 客戶端
│   ├── GameEventClient.ts  # EventSource 封裝 + 重連機制
│   ├── EventRouter.ts      # 事件路由器（事件類型 → Input Port）
│   ├── types.ts            # SSE 相關型別
│   └── index.ts
│
├── stores/                 # Pinia Stores（Output Ports 實作）
│   ├── gameState.ts        # 實作 UIStatePort
│   ├── uiState.ts          # 實作 TriggerUIEffectPort（非動畫）
│   └── index.ts
│
├── animation/              # 動畫系統
│   ├── AnimationService.ts # 實作 TriggerUIEffectPort.triggerAnimation
│   ├── AnimationQueue.ts   # FIFO 佇列 + 中斷支援
│   ├── types.ts            # 動畫型別定義
│   └── index.ts
│
├── router/                 # 路由守衛
│   ├── guards.ts           # gamePageGuard（模式切換邏輯）
│   └── index.ts
│
└── mock/                   # Mock 模式（開發測試）
    ├── MockApiClient.ts    # Mock SendCommandPort
    ├── MockEventEmitter.ts # Mock SSE 事件模擬器
    ├── mockEventScript.ts  # 內建遊戲事件序列
    └── index.ts
```

---

### 2.2 相關文檔位置

```
specs/004-ui-adapter-layer/
├── spec.md              # 功能規格（6 個 User Stories + 50 個 FR）
├── plan.md              # 實作計畫（本文檔）
├── research.md          # 技術決策記錄
├── data-model.md        # 實體定義（10 個核心實體）
├── quickstart.md        # 開發指南（本文檔）
└── contracts/           # 契約規範
    ├── api-client.md   # REST API 客戶端契約
    ├── sse-client.md   # SSE 客戶端契約
    ├── stores.md       # Pinia Stores 契約
    ├── animation.md    # 動畫服務契約
    └── di-container.md # DI Container 契約
```

---

## 3. 開發流程

### 3.1 TDD 開發循環

Adapter Layer 遵循 **TDD (Test-Driven Development)** 原則：

```
1. 📝 編寫測試（根據契約文件）
2. 🔴 執行測試（Red - 測試失敗）
3. ✅ 實作功能（最小實作）
4. 🟢 執行測試（Green - 測試通過）
5. ♻️ 重構（保持測試通過）
6. 🔁 重複步驟 1-5
```

---

### 3.2 實作順序（建議）

**Week 1-2: 核心基礎架構**

1. **DI Container**（~4 小時）
   - `container.ts`（~100 行）
   - `tokens.ts`（~50 行）
   - `registry.ts`（~100 行）
   - 測試：`di/container.spec.ts`

2. **Pinia Stores**（~6 小時）
   - `gameState.ts`（~200 行）
   - `uiState.ts`（~150 行）
   - 測試：`stores/gameState.spec.ts`、`stores/uiState.spec.ts`

3. **REST API Client**（~4 小時）
   - `GameApiClient.ts`（~150 行）
   - `errors.ts`（~50 行）
   - 測試：`api/GameApiClient.spec.ts`

---

**Week 3: SSE 整合**

4. **SSE Client**（~6 小時）
   - `GameEventClient.ts`（~150 行）
   - `EventRouter.ts`（~80 行）
   - 測試：`sse/GameEventClient.spec.ts`、`sse/EventRouter.spec.ts`

---

**Week 4: 路由與動畫**

5. **路由守衛**（~3 小時）
   - `guards.ts`（~100 行）
   - 測試：`router/guards.spec.ts`

6. **動畫系統（P1 基礎）**（~6 小時）
   - `AnimationQueue.ts`（~100 行）
   - `AnimationService.ts`（~150 行）
   - 測試：`animation/AnimationQueue.spec.ts`、`animation/AnimationService.spec.ts`

---

**Week 5: Mock 模式**

7. **Mock Adapters**（~4 小時）
   - `MockApiClient.ts`（~80 行）
   - `MockEventEmitter.ts`（~100 行）
   - `mockEventScript.ts`（~200 行，事件資料）
   - 測試：`mock/MockApiClient.spec.ts`

---

### 3.3 開發範例（GameApiClient）

#### 步驟 1: 編寫測試

```typescript
// tests/adapter/api/GameApiClient.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameApiClient } from '@/user-interface/adapter/api/GameApiClient';

describe('GameApiClient', () => {
  let client: GameApiClient;

  beforeEach(() => {
    client = new GameApiClient('http://localhost:8080');
    global.fetch = vi.fn();
  });

  it('should successfully send playHandCard command', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await expect(client.playHandCard('0111')).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/commands/play-hand-card'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ card_id: '0111' }),
      })
    );
  });
});
```

#### 步驟 2: 執行測試（Red）

```bash
pnpm test api/GameApiClient
```

預期輸出：
```
❌ FAIL  tests/adapter/api/GameApiClient.spec.ts
  GameApiClient
    ✕ should successfully send playHandCard command (10 ms)

  ● GameApiClient › should successfully send playHandCard command

    TypeError: Cannot read properties of undefined (reading 'playHandCard')
```

#### 步驟 3: 實作功能

```typescript
// src/user-interface/adapter/api/GameApiClient.ts
import type { SendCommandPort } from '@/user-interface/application/ports/output';

export class GameApiClient implements SendCommandPort {
  constructor(private baseURL: string) {}

  async playHandCard(cardId: string, matchTargetId?: string): Promise<void> {
    const url = `${this.baseURL}/api/v1/games/{gameId}/commands/play-hand-card`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: cardId, match_target_id: matchTargetId }),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }
  }

  // ... 其他方法
}
```

#### 步驟 4: 執行測試（Green）

```bash
pnpm test api/GameApiClient
```

預期輸出：
```
✓ PASS  tests/adapter/api/GameApiClient.spec.ts
  GameApiClient
    ✓ should successfully send playHandCard command (5 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

#### 步驟 5: 重構

- 提取重複代碼（`post` 方法）
- 增加錯誤處理
- 增加重試機制
- 保持測試通過

---

## 4. 測試執行

### 4.1 執行所有測試

```bash
pnpm test
```

---

### 4.2 執行特定檔案測試

```bash
pnpm test api/GameApiClient
pnpm test stores/gameState
pnpm test sse/EventRouter
```

---

### 4.3 監視模式（自動重新執行）

```bash
pnpm test --watch
```

---

### 4.4 測試覆蓋率報告

```bash
pnpm test --coverage
```

**預期輸出**:
```
---------------------|---------|----------|---------|---------|
File                 | % Stmts | % Branch | % Funcs | % Lines |
---------------------|---------|----------|---------|---------|
All files            |   78.5  |   72.3   |   81.2  |   78.1  |
 adapter/            |   75.2  |   70.1   |   77.8  |   74.9  |
  api/               |   87.3  |   82.5   |   90.1  |   86.8  |
  stores/            |   82.1  |   76.3   |   85.4  |   81.7  |
  sse/               |   76.5  |   71.2   |   78.9  |   75.8  |
---------------------|---------|----------|---------|---------|
```

**目標覆蓋率**:
- Adapter Layer 整體: > 70%
- Pinia Stores: > 80%
- API 客戶端: > 85%
- SSE 客戶端: > 75%

---

## 5. 常見開發任務

### 5.1 新增 Input Port 整合

**場景**: 新增一個事件處理 Use Case，需要整合到 DI Container 與 EventRouter。

**步驟**:

1. **在 tokens.ts 新增 Token**:
```typescript
// adapter/di/tokens.ts
export const TOKENS = {
  // ... 現有 Tokens
  HandleNewEventPort: Symbol('HandleNewEventPort'),
} as const;
```

2. **在 registry.ts 註冊 Use Case**:
```typescript
// adapter/di/registry.ts
container.register(
  TOKENS.HandleNewEventPort,
  () => new HandleNewEventUseCase(
    container.resolve(TOKENS.UIStatePort),
    container.resolve(TOKENS.TriggerUIEffectPort)
  ),
  { singleton: true }
);
```

3. **在 EventRouter 註冊事件映射**:
```typescript
// adapter/di/registry.ts 的 registerEventRouter 函數
router.register('NewEvent', container.resolve(TOKENS.HandleNewEventPort));
```

4. **在 main.ts 提供 Input Port**:
```typescript
// main.ts
app.provide(TOKENS.HandleNewEventPort, container.resolve(TOKENS.HandleNewEventPort));
```

---

### 5.2 切換遊戲模式

**Mock 模式**（不需要後端）:
```bash
# .env.local
VITE_GAME_MODE=mock
```

或使用 URL 參數：
```
http://localhost:5173/game?mode=mock
```

**Backend 模式**（需要後端）:
```bash
# .env.local
VITE_GAME_MODE=backend
VITE_API_BASE_URL=http://localhost:8080
```

**Local 模式**（架構預留，暫未實作）:
```bash
# .env.local
VITE_GAME_MODE=local
```

---

### 5.3 查看 DI Container 註冊狀況

**開發模式下在 Console 查看**:
```typescript
// main.ts（開發模式）
if (import.meta.env.DEV) {
  console.log('[DI] Registered dependencies', container);
  (window as any).container = container;  // 暴露到 window
}
```

**在瀏覽器 Console 查看**:
```javascript
window.container.has(Symbol.for('PlayHandCardPort'))  // true
```

---

### 5.4 模擬 SSE 事件（Mock 模式）

**修改內建事件腳本**:
```typescript
// adapter/mock/mockEventScript.ts
export const FULL_GAME_SCRIPT: MockEvent[] = [
  {
    type: 'GameStarted',
    delay: 0,
    payload: {
      game_id: 'mock-game-123',
      players: [/* ... */],
      ruleset: {/* ... */}
    }
  },
  // 新增自訂事件
  {
    type: 'TurnCompleted',
    delay: 2000,
    payload: {
      /* 自訂 payload */
    }
  },
];
```

---

### 5.5 新增動畫類型（P3 階段）

**步驟**:

1. **在 animation/types.ts 新增動畫類型**:
```typescript
export type AnimationType =
  | 'DEAL_CARDS'
  | 'CARD_MOVE'
  | 'NEW_ANIMATION';  // 新增

export interface NewAnimationParams {
  // 定義參數
}
```

2. **在 AnimationService 實作動畫**:
```typescript
// animation/AnimationService.ts
private async executeAnimation(animation: Animation): Promise<void> {
  // ... 現有動畫類型處理

  if (animation.type === 'NEW_ANIMATION') {
    const params = animation.params as NewAnimationParams;
    // 實作動畫邏輯
  }
}
```

3. **編寫測試**:
```typescript
// tests/adapter/animation/AnimationService.spec.ts
it('should execute NEW_ANIMATION', async () => {
  const service = new AnimationService(new AnimationQueue());
  await service.trigger('NEW_ANIMATION', { /* params */ });
  // 驗證動畫執行
});
```

---

## 6. 故障排除

### 6.1 常見錯誤

#### 錯誤 1: `DependencyNotFoundError: Dependency not found: Symbol(PlayHandCardPort)`

**原因**: Input Port 未在 DI Container 註冊。

**解決方案**:
1. 檢查 `adapter/di/registry.ts` 是否註冊該 Port
2. 檢查 Token 名稱是否正確（Symbol 必須完全匹配）
3. 檢查 `main.ts` 是否調用 `registerDependencies`

---

#### 錯誤 2: `TypeError: Cannot read properties of null (reading 'gameId')`

**原因**: `GameStateStore` 未初始化（`gameId` 為 `null`）。

**解決方案**:
1. 確認 `joinGame` API 已成功調用
2. 確認 `HandleGameStartedUseCase` 已執行（調用 `initializeGameContext`）
3. 檢查 SSE 連線是否建立（查看 Console 日誌）

---

#### 錯誤 3: `EventSource failed: net::ERR_CONNECTION_REFUSED`

**原因**: SSE 連線失敗，後端未啟動或 URL 錯誤。

**解決方案**:
1. 確認後端伺服器已啟動（`http://localhost:8080`）
2. 檢查 `.env.local` 的 `VITE_API_BASE_URL` 設定
3. 切換到 Mock 模式測試前端功能（`VITE_GAME_MODE=mock`）

---

#### 錯誤 4: 測試失敗 `global.fetch is not a function`

**原因**: Vitest 環境未提供 `fetch` API。

**解決方案**:
1. 在測試檔案中 mock `global.fetch`:
```typescript
beforeEach(() => {
  global.fetch = vi.fn();
});
```

2. 或安裝 `whatwg-fetch` polyfill:
```bash
pnpm add -D whatwg-fetch
```

---

### 6.2 開發工具

**Vue DevTools**:
- 安裝 Chrome 擴充功能：Vue.js DevTools
- 查看 Pinia Stores 狀態
- 查看 Vue 組件樹

**Vite DevTools**:
- 開發模式下自動啟用
- 查看模組依賴圖
- 查看 HMR 更新日誌

---

### 6.3 效能分析

**Chrome DevTools Performance**:
1. 開啟 DevTools → Performance 面板
2. 點擊 Record
3. 執行動畫或操作
4. 停止錄製
5. 檢查 FPS、Frame Drops、Layout/Reflow

**目標效能指標**:
- FPS > 50（目標 60）
- 動畫執行時間 < 1s
- API 回應時間 P95 < 500ms

---

## 總結

本快速入門指南涵蓋了 UI Adapter Layer 開發的所有基礎知識，包含：

✅ 環境設定與依賴安裝
✅ 專案結構導覽
✅ TDD 開發流程
✅ 測試執行與覆蓋率
✅ 常見開發任務
✅ 故障排除

**下一步**:
1. 📖 閱讀 `plan.md`（實作計畫）
2. 📖 閱讀 `contracts/`（契約規範）
3. 💻 開始實作（從 DI Container 開始）
4. ✅ 遵循 TDD 循環（Red-Green-Refactor）
5. 🎯 達到測試覆蓋率目標（> 70%）

祝開發順利！🚀
