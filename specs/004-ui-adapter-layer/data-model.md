# Data Model: UI Adapter Layer

**Feature**: User Interface BC - Adapter Layer
**Date**: 2025-01-19
**Status**: Phase 1 Complete

本文檔定義 Adapter Layer 的所有實體、型別與資料結構，包含 Pinia Stores、API 客戶端、SSE 客戶端、DI Container、Vue 組件等。

---

## 目錄

1. [Pinia Stores](#1-pinia-stores)
2. [API 客戶端](#2-api-客戶端)
3. [SSE 客戶端](#3-sse-客戶端)
4. [Output Ports 實作](#4-output-ports-實作)
5. [動畫系統](#5-動畫系統)
6. [DI Container](#6-di-container)
7. [路由守衛](#7-路由守衛)
8. [Mock 模式](#8-mock-模式)
9. [Vue 組件](#9-vue-組件)
10. [型別定義](#10-型別定義)

---

## 1. Pinia Stores

### GameStateStore

**職責**: 管理遊戲核心狀態（與後端同步的狀態），實作 `UIStatePort` 介面。

**State 結構**:

```typescript
interface GameStateStoreState {
  // 遊戲上下文
  gameId: string | null;
  localPlayerId: string | null;
  opponentPlayerId: string | null;
  ruleset: Ruleset | null;

  // 流程狀態
  flowStage: FlowStage;
  activePlayerId: string | null;

  // 牌面狀態
  fieldCards: string[];           // 場上卡片 ID 列表
  myHandCards: string[];          // 玩家手牌 ID 列表
  opponentHandCount: number;      // 對手手牌數量
  myDepository: string[];         // 玩家已獲得牌列表
  opponentDepository: string[];   // 對手已獲得牌列表
  deckRemaining: number;          // 牌堆剩餘數量

  // 分數與役種
  myScore: number;
  opponentScore: number;
  myYaku: YakuScore[];
  opponentYaku: YakuScore[];
  koiKoiMultipliers: Record<string, number>;
}
```

**Getters**:

```typescript
interface GameStateStoreGetters {
  isMyTurn: boolean;                  // 是否為玩家回合
  currentFlowStage: FlowStage;        // 當前流程階段
  myKoiKoiMultiplier: number;         // 玩家 Koi-Koi 倍率
  opponentKoiKoiMultiplier: number;   // 對手 Koi-Koi 倍率
}
```

**Actions** (實作 UIStatePort 介面):

```typescript
interface GameStateStoreActions extends UIStatePort {
  // UIStatePort 方法（10 個）
  initializeGameContext(gameId: string, players: Player[], ruleset: Ruleset): void;
  restoreGameState(snapshot: GameSnapshot): void;
  setFlowStage(stage: FlowStage): void;
  updateFieldCards(cards: string[]): void;
  updateHandCards(cards: string[]): void;
  updateDepositoryCards(playerCards: string[], opponentCards: string[]): void;
  updateScores(playerScore: number, opponentScore: number): void;
  updateDeckRemaining(count: number): void;
  updateKoiKoiMultiplier(playerId: string, multiplier: number): void;
  getLocalPlayerId(): string;

  // 內部輔助方法
  reset(): void;  // 重置所有狀態（用於離開遊戲）
}
```

**關聯關係**:
- 由 Use Cases 透過 `UIStatePort` 介面更新
- 被 Vue 組件讀取（透過 `storeToRefs`）
- 在快照恢復時完全覆蓋（`restoreGameState`）

---

### UIStateStore

**職責**: 管理 UI 互動狀態（前端臨時狀態），實作 `TriggerUIEffectPort` 介面的非動畫部分。

**State 結構**:

```typescript
interface UIStateStoreState {
  // 配對選擇
  selectionMode: boolean;
  selectionSourceCard: string | null;
  selectionPossibleTargets: string[];

  // Koi-Koi 決策 Modal
  decisionModalVisible: boolean;
  decisionModalData: DecisionModalData | null;

  // 遊戲結束 UI
  gameFinishedVisible: boolean;
  gameFinishedData: GameFinishedData | null;

  // 訊息提示
  errorMessage: string | null;
  infoMessage: string | null;

  // 連線狀態
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  reconnecting: boolean;
}
```

**Actions** (實作 TriggerUIEffectPort 部分):

```typescript
interface UIStateStoreActions {
  // TriggerUIEffectPort 方法（6 個中的 5 個，triggerAnimation 由 AnimationService 實作）
  showSelectionUI(possibleTargets: string[]): void;
  showDecisionModal(currentYaku: YakuScore[], currentScore: number, potentialScore?: number): void;
  showErrorMessage(message: string): void;
  showReconnectionMessage(): void;
  showGameFinishedUI(winner: string | null, finalScores: Record<string, number>): void;

  // 內部輔助方法
  hideSelectionUI(): void;
  hideDecisionModal(): void;
  hideGameFinishedUI(): void;
  hideReconnectionMessage(): void;
  setConnectionStatus(status: 'connected' | 'connecting' | 'disconnected'): void;
  reset(): void;
}
```

**關聯關係**:
- 由 Use Cases 透過 `TriggerUIEffectPort` 介面更新
- 被 Vue 組件讀取（控制 Modal/Toast 顯示）
- **不參與快照恢復**（重連後重置為初始狀態）

---

## 2. API 客戶端

### GameApiClient

**職責**: 實作 `SendCommandPort` 介面，處理所有 REST API 請求。

**類別定義**:

```typescript
class GameApiClient implements SendCommandPort {
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;

  constructor(baseURL: string, timeout?: number);

  // SendCommandPort 方法（3 個）
  async playHandCard(cardId: string, matchTargetId?: string): Promise<void>;
  async selectTarget(sourceCardId: string, targetCardId: string): Promise<void>;
  async makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void>;

  // 額外的 API 方法（不在 SendCommandPort 中）
  async joinGame(sessionToken?: string): Promise<JoinGameResponse>;

  // 內部方法
  private async post<T>(path: string, body: any, retries?: number): Promise<T>;
  private async get<T>(path: string, retries?: number): Promise<T>;
  private isRetryableError(error: any): boolean;
  private wrapError(error: any): Error;
  private getGameContext(): { gameId: string; playerId: string };
}
```

**關鍵屬性**:
- `baseURL`: API 基礎 URL（從環境變數讀取，例如 `http://localhost:8080`）
- `timeout`: 請求超時時間（預設 5000ms）
- `maxRetries`: 最大重試次數（預設 3 次）

**錯誤處理**:
- 網路錯誤（`NetworkError`）→ 重試
- 5xx 伺服器錯誤（`ServerError`）→ 重試
- 4xx 客戶端錯誤 → 不重試，直接拋出
- 超時錯誤（`TimeoutError`）→ 不重試，直接拋出

**重試策略**:
- 指數退避：1s → 2s → 3s
- 最多重試 3 次
- 僅對可重試錯誤（網路錯誤、5xx）重試

---

### JoinGameResponse

**職責**: `joinGame` API 的回應型別。

```typescript
interface JoinGameResponse {
  game_id: string;
  session_token: string;
  player_id: string;
  // 若為重連，包含完整快照
  snapshot?: GameSnapshot;
}
```

---

## 3. SSE 客戶端

### GameEventClient

**職責**: 管理 SSE 連線，接收事件並路由到 `EventRouter`。

**類別定義**:

```typescript
class GameEventClient {
  private eventSource: EventSource | null;
  private eventRouter: EventRouter;
  private reconnectAttempts: number;
  private maxAttempts: number;
  private reconnectDelays: number[];
  private baseURL: string;
  private gameId: string | null;
  private sessionToken: string | null;

  constructor(baseURL: string, eventRouter: EventRouter);

  // 公開方法
  connect(gameId: string, sessionToken: string): void;
  disconnect(): void;
  isConnected(): boolean;

  // 內部方法
  private registerEventListeners(): void;
  private async reconnect(): Promise<void>;
  private onConnectionEstablished(): void;
  private onConnectionLost(): void;
  private onConnectionFailed(): void;
}
```

**關鍵屬性**:
- `reconnectAttempts`: 當前重連嘗試次數
- `maxAttempts`: 最大重連次數（5 次）
- `reconnectDelays`: 重連延遲陣列（`[1000, 2000, 4000, 8000, 16000]` ms）

**連線狀態管理**:
- `connected`: SSE 連線正常
- `connecting`: 正在重連中
- `disconnected`: 連線中斷

**重連機制**:
- 連線中斷時自動觸發重連
- 使用指數退避策略（1s → 2s → 4s → 8s → 16s）
- 最多嘗試 5 次
- 重連成功後重置計數器

---

### EventRouter

**職責**: 將 SSE 事件路由到對應的 Input Ports。

**類別定義**:

```typescript
class EventRouter {
  private handlers: Map<string, InputPort<any>>;

  constructor();

  // 公開方法
  register(eventType: string, port: InputPort<any>): void;
  route(eventType: string, payload: any): void;
  unregister(eventType: string): void;
  clear(): void;
}
```

**事件類型映射**:

```typescript
const EVENT_TYPE_MAPPING: Record<string, string> = {
  'GameStarted': 'HandleGameStartedPort',
  'RoundDealt': 'HandleRoundDealtPort',
  'TurnCompleted': 'HandleTurnCompletedPort',
  'SelectionRequired': 'HandleSelectionRequiredPort',
  'TurnProgressAfterSelection': 'HandleTurnProgressAfterSelectionPort',
  'DecisionRequired': 'HandleDecisionRequiredPort',
  'DecisionMade': 'HandleDecisionMadePort',
  'YakuFormed': 'HandleYakuFormedPort',
  'RoundScored': 'HandleRoundScoredPort',
  'RoundEndedInstantly': 'HandleRoundEndedInstantlyPort',
  'RoundDrawn': 'HandleRoundDrawnPort',
  'GameFinished': 'HandleGameFinishedPort',
  'TurnError': 'HandleTurnErrorPort',
  'GameSnapshotRestore': 'HandleGameSnapshotRestorePort',
  // 未來可擴展
};
```

**關鍵原則**:
- ✅ 依賴 `InputPort<T>` 介面（不依賴具體 Use Cases）
- ✅ 由 DI Container 注入所有 Input Ports
- ✅ 未註冊的事件類型顯示警告（不拋出異常）

---

## 4. Output Ports 實作

### SendCommandPortAdapter

**職責**: 將 `GameApiClient` 適配為 `SendCommandPort` 介面。

```typescript
function createSendCommandPortAdapter(apiClient: GameApiClient): SendCommandPort {
  return {
    playHandCard: apiClient.playHandCard.bind(apiClient),
    selectTarget: apiClient.selectTarget.bind(apiClient),
    makeDecision: apiClient.makeDecision.bind(apiClient),
  };
}
```

**注意**: 由於 `GameApiClient` 已直接實作 `SendCommandPort`，此 Adapter 僅作為顯式綁定，實際可省略。

---

### UIStatePortAdapter

**職責**: 將 `GameStateStore` 適配為 `UIStatePort` 介面。

```typescript
function createUIStatePortAdapter(): UIStatePort {
  const store = useGameStateStore();
  return {
    initializeGameContext: store.initializeGameContext.bind(store),
    restoreGameState: store.restoreGameState.bind(store),
    setFlowStage: store.setFlowStage.bind(store),
    updateFieldCards: store.updateFieldCards.bind(store),
    updateHandCards: store.updateHandCards.bind(store),
    updateDepositoryCards: store.updateDepositoryCards.bind(store),
    updateScores: store.updateScores.bind(store),
    updateDeckRemaining: store.updateDeckRemaining.bind(store),
    updateKoiKoiMultiplier: store.updateKoiKoiMultiplier.bind(store),
    getLocalPlayerId: store.getLocalPlayerId.bind(store),
  };
}
```

---

### TriggerUIEffectPortAdapter

**職責**: 將 `UIStateStore` 與 `AnimationService` 組合適配為 `TriggerUIEffectPort` 介面。

```typescript
function createTriggerUIEffectPortAdapter(
  animationService: AnimationService
): TriggerUIEffectPort {
  const store = useUIStateStore();
  return {
    showSelectionUI: store.showSelectionUI.bind(store),
    showDecisionModal: store.showDecisionModal.bind(store),
    showErrorMessage: store.showErrorMessage.bind(store),
    showReconnectionMessage: store.showReconnectionMessage.bind(store),
    triggerAnimation: animationService.trigger.bind(animationService),
    showGameFinishedUI: store.showGameFinishedUI.bind(store),
  };
}
```

---

## 5. 動畫系統

### AnimationService

**職責**: 實作 `TriggerUIEffectPort.triggerAnimation` 方法，管理動畫執行。

**類別定義**:

```typescript
class AnimationService {
  private queue: AnimationQueue;

  constructor(queue: AnimationQueue);

  // TriggerUIEffectPort.triggerAnimation 實作
  trigger(type: AnimationType, params: AnimationParams): Promise<void>;

  // 內部方法
  private async executeAnimation(animation: Animation): Promise<void>;
  interrupt(): void;  // 快照恢復時中斷所有動畫
}
```

**支援的動畫類型** (P1 階段):

```typescript
type AnimationType =
  | 'DEAL_CARDS'      // 發牌動畫
  | 'CARD_MOVE';      // 卡片移動動畫
  // P3 階段擴展:
  // | 'MATCH_HIGHLIGHT' | 'YAKU_FORMED' | 'SCORE_UPDATE'
```

**動畫參數**:

```typescript
type AnimationParams = DealCardsParams | CardMoveParams;

interface DealCardsParams {
  targetZones: Zone[];
  delay: number;
  duration: number;
}

interface CardMoveParams {
  cardId: string;
  from: Position;
  to: Position;
  duration: number;
}

interface Position {
  x: number;
  y: number;
}

type Zone = 'player-hand' | 'opponent-hand' | 'field' | 'player-depository' | 'opponent-depository' | 'deck';
```

---

### AnimationQueue

**職責**: FIFO 動畫隊列管理，支援中斷。

**類別定義**:

```typescript
class AnimationQueue {
  private queue: Animation[];
  private isPlaying: boolean;
  private currentAnimation: Animation | null;

  constructor();

  // 公開方法
  enqueue(animation: Animation): void;
  interrupt(): void;
  isEmpty(): boolean;
  size(): number;

  // 內部方法
  private async playNext(): Promise<void>;
  private async play(animation: Animation): Promise<void>;
}
```

**Animation 實體**:

```typescript
interface Animation {
  id: string;  // UUID
  type: AnimationType;
  params: AnimationParams;
  status: 'pending' | 'running' | 'completed' | 'interrupted';
  callback?: () => void;
}
```

**關鍵行為**:
- FIFO 順序執行（前一個完成後才執行下一個）
- 支援中斷（`interrupt()`）：清空隊列並停止當前動畫
- 提供回調機制（動畫完成後通知上層）

---

## 6. DI Container

### DIContainer

**職責**: 輕量級依賴注入容器，管理所有依賴的註冊與解析。

**類別定義**:

```typescript
class DIContainer {
  private dependencies: Map<Symbol | string, DependencyFactory>;
  private singletons: Map<Symbol | string, any>;

  constructor();

  // 公開方法
  register<T>(
    token: Symbol | string,
    factory: DependencyFactory<T>,
    options?: { singleton?: boolean }
  ): void;

  resolve<T>(token: Symbol | string): T;

  clear(): void;

  has(token: Symbol | string): boolean;
}

type DependencyFactory<T> = () => T;
```

**使用範例**:

```typescript
const container = new DIContainer();

// 註冊單例
container.register('GameStateStore', () => useGameStateStore(), { singleton: true });

// 註冊工廠
container.register('GameApiClient', () => new GameApiClient(baseURL));

// 解析依賴
const apiClient = container.resolve<GameApiClient>('GameApiClient');
```

---

### Dependency Tokens

**職責**: 定義所有依賴注入的 Token（Symbol 常數）。

```typescript
// di/tokens.ts
export const TOKENS = {
  // Output Ports
  SendCommandPort: Symbol('SendCommandPort'),
  UIStatePort: Symbol('UIStatePort'),
  TriggerUIEffectPort: Symbol('TriggerUIEffectPort'),

  // Input Ports (18 個)
  PlayHandCardPort: Symbol('PlayHandCardPort'),
  SelectMatchTargetPort: Symbol('SelectMatchTargetPort'),
  MakeKoiKoiDecisionPort: Symbol('MakeKoiKoiDecisionPort'),
  HandleGameStartedPort: Symbol('HandleGameStartedPort'),
  HandleRoundDealtPort: Symbol('HandleRoundDealtPort'),
  // ... 更多 Input Ports

  // Adapters
  GameApiClient: Symbol('GameApiClient'),
  GameEventClient: Symbol('GameEventClient'),
  EventRouter: Symbol('EventRouter'),
  AnimationService: Symbol('AnimationService'),
  AnimationQueue: Symbol('AnimationQueue'),

  // Stores
  GameStateStore: Symbol('GameStateStore'),
  UIStateStore: Symbol('UIStateStore'),

  // Mock Adapters
  MockApiClient: Symbol('MockApiClient'),
  MockEventEmitter: Symbol('MockEventEmitter'),
} as const;
```

**為何使用 Symbol**:
- 避免命名衝突（Symbol 保證唯一性）
- 型別安全（TypeScript 型別檢查）
- 更好的開發體驗（IDE 自動完成）

---

### DependencyRegistry

**職責**: 統一管理所有依賴的註冊邏輯。

```typescript
// di/registry.ts
export function registerDependencies(container: DIContainer, mode: GameMode): void {
  // 1. 註冊 Stores
  registerStores(container);

  // 2. 註冊 Output Ports
  registerOutputPorts(container);

  // 3. 註冊 Use Cases (作為 Input Ports)
  registerInputPorts(container);

  // 4. 根據模式註冊 Adapters
  if (mode === 'backend') {
    registerBackendAdapters(container);
  } else if (mode === 'mock') {
    registerMockAdapters(container);
  } else if (mode === 'local') {
    registerLocalAdapters(container);
  }

  // 5. 註冊動畫系統
  registerAnimationSystem(container);

  // 6. 註冊 SSE 客戶端與事件路由
  if (mode === 'backend') {
    registerSSEClient(container);
  }
}
```

---

## 7. 路由守衛

### gamePageGuard

**職責**: `/game` 路由的 `beforeEnter` 守衛，初始化遊戲模式。

**函數簽名**:

```typescript
async function gamePageGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void>;
```

**執行流程**:

1. **讀取遊戲模式配置**（優先級：URL 參數 > localStorage > 環境變數）
2. **根據模式初始化對應的 Adapter**:
   - `backend`: 檢查 sessionToken → 發送 joinGame → 建立 SSE 連線
   - `mock`: 啟動 Mock Event Emitter → 播放內建事件腳本
   - `local`: 初始化 Local Game BC（架構預留，暫時空實作）
3. **允許導航** (`next()`)

**關鍵型別**:

```typescript
type GameMode = 'backend' | 'local' | 'mock';

interface GameModeConfig {
  mode: GameMode;
  baseURL?: string;  // backend 模式需要
}
```

---

## 8. Mock 模式

### MockApiClient

**職責**: 模擬 `SendCommandPort` 行為，用於開發測試。

**類別定義**:

```typescript
class MockApiClient implements SendCommandPort {
  async playHandCard(cardId: string, matchTargetId?: string): Promise<void> {
    console.log('[Mock] playHandCard', { cardId, matchTargetId });
    await sleep(100);  // 模擬網路延遲
  }

  async selectTarget(sourceCardId: string, targetCardId: string): Promise<void> {
    console.log('[Mock] selectTarget', { sourceCardId, targetCardId });
    await sleep(100);
  }

  async makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void> {
    console.log('[Mock] makeDecision', { decision });
    await sleep(100);
  }

  async joinGame(sessionToken?: string): Promise<JoinGameResponse> {
    console.log('[Mock] joinGame', { sessionToken });
    await sleep(200);
    return {
      game_id: 'mock-game-123',
      session_token: 'mock-token-456',
      player_id: 'mock-player-1',
    };
  }
}
```

---

### MockEventEmitter

**職責**: 模擬 SSE 事件推送，播放內建遊戲事件腳本。

**類別定義**:

```typescript
class MockEventEmitter {
  private eventRouter: EventRouter;
  private isPlaying: boolean;

  constructor(eventRouter: EventRouter);

  async playScript(script: MockEvent[]): Promise<void>;
  stop(): void;
}

interface MockEvent {
  type: string;        // 事件類型（例如 'GameStarted'）
  delay: number;       // 延遲時間（ms）
  payload: any;        // 事件 payload
}
```

**內建遊戲腳本**:

```typescript
// mock/mockEventScript.ts
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
  {
    type: 'RoundDealt',
    delay: 1000,
    payload: {
      round_number: 1,
      hand_cards: ['0111', '0211', '0311', /* ... */],
      field_cards: ['0112', '0212', '0312', /* ... */],
      starting_player_id: 'mock-player-1'
    }
  },
  // ... 約 20-30 個事件（完整一局遊戲）
];
```

---

## 9. Vue 組件

### 組件層級結構

```
GamePage.vue (容器組件)
├── TopInfoBar.vue (資訊顯示組件)
├── OpponentDepositoryZone.vue (對手獲得區)
├── FieldZone.vue (場牌區)
│   └── CardComponent.vue (卡片組件，複用)
├── PlayerDepositoryZone.vue (玩家獲得區)
│   └── CardComponent.vue
├── PlayerHandZone.vue (玩家手牌區)
│   └── CardComponent.vue
├── SelectionOverlay.vue (配對選擇 UI，條件渲染)
├── DecisionModal.vue (Koi-Koi 決策 Modal，條件渲染)
├── ErrorToast.vue (錯誤提示，條件渲染)
├── ReconnectionBanner.vue (重連提示，條件渲染)
└── GameFinishedModal.vue (遊戲結束 Modal，條件渲染)
```

---

### GamePage.vue

**職責**: 遊戲頁面容器組件，管理整體佈局。

**Props**: 無

**Emits**: 無

**使用的 Stores**:
- `GameStateStore`（讀取遊戲狀態）
- `UIStateStore`（讀取 UI 狀態）

**佈局結構**:
- Flexbox 垂直排列
- 固定 Viewport（100vh × 100vw，無垂直滾動）
- 各區塊高度比例固定

---

### TopInfoBar.vue

**職責**: 顯示頂部資訊列（分數、月份、回合提示、操作按鈕）。

**Props**:

```typescript
interface TopInfoBarProps {
  // 無 Props（直接從 Store 讀取）
}
```

**顯示內容**:
- 對手分數
- 當前月份（round_number）
- 玩家分數
- 回合提示（「您的回合」 / 「對手回合」）
- 操作按鈕（「新遊戲」、「放棄」、「規則」、「遊戲記錄」）

---

### CardComponent.vue

**職責**: 單張卡片組件（可複用）。

**Props**:

```typescript
interface CardComponentProps {
  cardId: string;              // 卡片 ID（例如 '0111'）
  isSelectable?: boolean;      // 是否可選擇
  isSelected?: boolean;        // 是否已選中
  isHighlighted?: boolean;     // 是否高亮（可配對提示）
  size?: 'small' | 'medium' | 'large';  // 卡片尺寸
}
```

**Emits**:

```typescript
interface CardComponentEmits {
  (e: 'click', cardId: string): void;
  (e: 'hover', cardId: string): void;
}
```

**視覺狀態**:
- `isSelectable && hover`: 輕微放大 + 陰影
- `isSelected`: 邊框發光
- `isHighlighted`: 邊框顏色變化（可配對提示）

---

### PlayerHandZone.vue

**職責**: 玩家手牌區組件。

**Props**: 無

**Emits**: 無

**使用的 Stores**:
- `GameStateStore.myHandCards`（手牌列表）
- `GameStateStore.flowStage`（是否可操作）

**使用的 Input Ports**:
- `PlayHandCardPort`（點擊手牌時調用）

**佈局**:
- 橫向排列（Flexbox）
- 允許橫向滾動（overflow-x: auto）
- 手牌 hover 時顯示配對提示（高亮場上可配對牌）

---

### FieldZone.vue

**職責**: 場中央牌區組件。

**Props**: 無

**Emits**: 無

**使用的 Stores**:
- `GameStateStore.fieldCards`（場牌列表）
- `UIStateStore.selectionPossibleTargets`（可配對牌列表）

**佈局**:
- 2 行 4 列網格（Grid）
- 最多 8 張牌
- 可配對牌自動高亮

---

### SelectionOverlay.vue

**職責**: 配對選擇 UI（浮層或 Modal）。

**Props**: 無

**Emits**: 無

**使用的 Stores**:
- `UIStateStore.selectionMode`（是否顯示）
- `UIStateStore.selectionPossibleTargets`（可選目標）

**使用的 Input Ports**:
- `SelectMatchTargetPort`（選擇配對目標時調用）

**UI 設計**:
- 半透明遮罩
- 列出可選目標（卡片圖像 + 點擊選擇）
- 高亮對應的場牌

---

### DecisionModal.vue

**職責**: Koi-Koi 決策 Modal。

**Props**: 無

**Emits**: 無

**使用的 Stores**:
- `UIStateStore.decisionModalVisible`（是否顯示）
- `UIStateStore.decisionModalData`（決策資料）

**使用的 Input Ports**:
- `MakeKoiKoiDecisionPort`（做出決策時調用）

**UI 設計**:
- 居中 Modal
- 顯示當前役種、得分、Koi-Koi 倍率
- 顯示潛在分數（可選）
- 兩個按鈕：「繼續遊戲」(KOI_KOI) / 「結束本局」(END_ROUND)

---

### ErrorToast.vue

**職責**: 錯誤提示 Toast。

**Props**: 無

**Emits**: 無

**使用的 Stores**:
- `UIStateStore.errorMessage`（錯誤訊息）

**UI 設計**:
- 右上角 Toast
- 自動消失（3 秒）或手動關閉
- 紅色背景 + 錯誤圖示

---

### ReconnectionBanner.vue

**職責**: 重連提示 Banner。

**Props**: 無

**Emits**: 無

**使用的 Stores**:
- `UIStateStore.reconnecting`（是否重連中）
- `UIStateStore.infoMessage`（提示訊息）

**UI 設計**:
- 頂部 Banner
- 顯示「連線中斷，正在嘗試重連...」或「連線已恢復」
- 自動消失（3 秒）

---

## 10. 型別定義

### 錯誤型別

```typescript
// api/errors.ts
export class NetworkError extends Error {
  constructor(message = '網路連線失敗') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ServerError extends Error {
  constructor(public status: number, message?: string) {
    super(message || `伺服器錯誤 (${status})`);
    this.name = 'ServerError';
  }
}

export class TimeoutError extends Error {
  constructor(message = '請求超時') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

---

### 其他共用型別

```typescript
// adapter/types.ts
export interface DecisionModalData {
  currentYaku: YakuScore[];
  currentScore: number;
  potentialScore?: number;
}

export interface GameFinishedData {
  winner: string | null;  // null 表示平局
  finalScores: Record<string, number>;
}

export type GameMode = 'backend' | 'local' | 'mock';

export interface GameModeConfig {
  mode: GameMode;
  baseURL?: string;
}
```

---

## 總結

本文檔定義了 Adapter Layer 的所有關鍵實體，包含：

✅ **2 個 Pinia Stores**（GameStateStore、UIStateStore）
✅ **3 個 API/SSE 客戶端**（GameApiClient、GameEventClient、EventRouter）
✅ **3 個 Output Ports 實作**（SendCommandPortAdapter、UIStatePortAdapter、TriggerUIEffectPortAdapter）
✅ **2 個動畫系統組件**（AnimationService、AnimationQueue）
✅ **1 個 DI Container**（DIContainer + Tokens + Registry）
✅ **1 個路由守衛**（gamePageGuard）
✅ **2 個 Mock Adapters**（MockApiClient、MockEventEmitter）
✅ **10+ Vue 組件**（GamePage + 5 區域 + 5 互動組件）

所有實體設計遵循：
- ✅ Clean Architecture 分層原則
- ✅ 依賴反轉原則（DIP）
- ✅ 單一職責原則（SRP）
- ✅ 開放封閉原則（OCP）

接下來進入 contracts/ 契約文件生成階段。
