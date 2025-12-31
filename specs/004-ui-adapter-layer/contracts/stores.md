# Contract: Pinia Stores

**Contract Type**: Implementation Contract
**Components**: `GameStateStore` + `UIStateStore`
**Implements**: `UIStatePort` + `TriggerUIEffectPort` (部分)
**Date**: 2025-01-19

本契約定義 Pinia Stores 的實作規範，包含狀態結構、Actions 簽名、Getters 定義、測試要求等。

---

## 1. GameStateStore 契約

### 1.1 職責定義

**契約要求**:
- ✅ 管理遊戲核心狀態（與後端同步的狀態）
- ✅ 實作 `UIStatePort` 介面的所有 10 個方法
- ✅ 提供 Getters 供 Vue 組件讀取狀態
- ✅ 參與快照恢復（`restoreGameState` 完全覆蓋狀態）
- ✅ **不持久化**（所有狀態從 SSE 事件恢復）

---

### 1.2 State 結構契約

**完整 State 定義**:

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
  fieldCards: string[];           // 場上卡片 ID 列表（最多 8 張）
  myHandCards: string[];          // 玩家手牌 ID 列表（最多 8 張）
  opponentHandCount: number;      // 對手手牌數量（0-8）
  myDepository: string[];         // 玩家已獲得牌列表
  opponentDepository: string[];   // 對手已獲得牌列表
  deckRemaining: number;          // 牌堆剩餘數量（0-24）

  // 分數與役種
  myScore: number;
  opponentScore: number;
  myYaku: YakuScore[];
  opponentYaku: YakuScore[];
  koiKoiMultipliers: Record<string, number>;  // playerId → multiplier
}
```

**契約要求**:
- ✅ 所有屬性必須有明確的型別（不使用 `any`）
- ✅ 所有陣列必須初始化為空陣列 `[]`
- ✅ 所有數字必須初始化為 `0`
- ✅ 所有可空屬性使用 `null`（不使用 `undefined`）
- ✅ `flowStage` 初始值為 `'GAME_NOT_STARTED'`

---

### 1.3 Getters 契約

**必須提供的 Getters**:

```typescript
interface GameStateStoreGetters {
  isMyTurn: boolean;                    // 當前是否為玩家回合
  currentFlowStage: FlowStage;          // 當前流程階段（別名）
  myKoiKoiMultiplier: number;           // 玩家 Koi-Koi 倍率
  opponentKoiKoiMultiplier: number;     // 對手 Koi-Koi 倍率
}
```

**實作範例**:
```typescript
getters: {
  isMyTurn: (state): boolean => {
    return state.activePlayerId === state.localPlayerId;
  },

  currentFlowStage: (state): FlowStage => {
    return state.flowStage;
  },

  myKoiKoiMultiplier: (state): number => {
    return state.localPlayerId ? state.koiKoiMultipliers[state.localPlayerId] ?? 1 : 1;
  },

  opponentKoiKoiMultiplier: (state): number => {
    return state.opponentPlayerId ? state.koiKoiMultipliers[state.opponentPlayerId] ?? 1 : 1;
  },
}
```

---

### 1.4 Actions 契約（UIStatePort 實作）

**必須實作的 10 個方法**:

#### 1.4.1 initializeGameContext

```typescript
initializeGameContext(
  gameId: string,
  players: Player[],
  ruleset: Ruleset
): void
```

**契約要求**:
- ✅ 設定 `gameId`、`ruleset`
- ✅ 識別本地玩家（`players[0]`）與對手（`players[1]`）
- ✅ 設定 `localPlayerId`、`opponentPlayerId`
- ✅ 初始化所有 `koiKoiMultipliers` 為 1

**實作範例**:
```typescript
initializeGameContext(gameId: string, players: Player[], ruleset: Ruleset): void {
  this.gameId = gameId;
  this.ruleset = ruleset;
  this.localPlayerId = players[0].player_id;
  this.opponentPlayerId = players[1].player_id;

  // 初始化 Koi-Koi 倍率
  this.koiKoiMultipliers = {
    [this.localPlayerId]: 1,
    [this.opponentPlayerId]: 1,
  };
}
```

---

#### 1.4.2 restoreGameState

```typescript
restoreGameState(snapshot: GameSnapshot): void
```

**契約要求**:
- ✅ **完全覆蓋**所有狀態（強制同步模式）
- ✅ 不保留任何舊狀態
- ✅ 覆蓋順序：gameId → flowStage → cards → scores → yaku

**實作範例**:
```typescript
restoreGameState(snapshot: GameSnapshot): void {
  this.gameId = snapshot.game_id;
  this.flowStage = snapshot.current_flow_stage;
  this.activePlayerId = snapshot.active_player_id;
  this.fieldCards = snapshot.field_cards;
  this.deckRemaining = snapshot.deck_remaining;

  // 識別本地玩家與對手
  const localPlayerData = snapshot.players.find(p => p.player_id === this.localPlayerId);
  const opponentPlayerData = snapshot.players.find(p => p.player_id !== this.localPlayerId);

  if (localPlayerData) {
    this.myHandCards = localPlayerData.hand_cards;
    this.myDepository = localPlayerData.depository_cards;
    this.myScore = localPlayerData.score;
    this.myYaku = localPlayerData.yaku;
  }

  if (opponentPlayerData) {
    this.opponentHandCount = opponentPlayerData.hand_count;
    this.opponentDepository = opponentPlayerData.depository_cards;
    this.opponentScore = opponentPlayerData.score;
    this.opponentYaku = opponentPlayerData.yaku;
  }

  this.koiKoiMultipliers = snapshot.koi_koi_multipliers;
}
```

---

#### 1.4.3 setFlowStage

```typescript
setFlowStage(stage: FlowStage): void
```

**契約要求**:
- ✅ 直接設定 `flowStage`
- ✅ 不驗證狀態轉換（由 Use Cases 負責）

---

#### 1.4.4 updateFieldCards

```typescript
updateFieldCards(cards: string[]): void
```

**契約要求**:
- ✅ 完全替換 `fieldCards` 陣列
- ✅ 不保留舊陣列（直接賦值）

---

#### 1.4.5 updateHandCards

```typescript
updateHandCards(cards: string[]): void
```

**契約要求**:
- ✅ 完全替換 `myHandCards` 陣列
- ✅ 不保留舊陣列

---

#### 1.4.6 updateDepositoryCards

```typescript
updateDepositoryCards(
  playerCards: string[],
  opponentCards: string[]
): void
```

**契約要求**:
- ✅ 同時更新玩家與對手的已獲得牌
- ✅ 完全替換陣列（不使用 `push`）

---

#### 1.4.7 updateScores

```typescript
updateScores(
  playerScore: number,
  opponentScore: number
): void
```

**契約要求**:
- ✅ 同時更新玩家與對手的分數
- ✅ 分數必須為非負整數

---

#### 1.4.8 updateDeckRemaining

```typescript
updateDeckRemaining(count: number): void
```

**契約要求**:
- ✅ 更新牌堆剩餘數量
- ✅ 必須為 0-24 之間的整數

---

#### 1.4.9 updateKoiKoiMultiplier

```typescript
updateKoiKoiMultiplier(
  playerId: string,
  multiplier: number
): void
```

**契約要求**:
- ✅ 更新指定玩家的 Koi-Koi 倍率
- ✅ 倍率必須為正整數（1, 2, 4, 8, ...）

---

#### 1.4.10 getLocalPlayerId

```typescript
getLocalPlayerId(): string
```

**契約要求**:
- ✅ 返回本地玩家 ID
- ✅ 若未初始化（`localPlayerId === null`），拋出錯誤

**實作範例**:
```typescript
getLocalPlayerId(): string {
  if (!this.localPlayerId) {
    throw new Error('LocalPlayerId not initialized');
  }
  return this.localPlayerId;
}
```

---

### 1.5 額外輔助方法

**契約要求**:
- ✅ 提供 `reset()` 方法重置所有狀態（用於離開遊戲）

```typescript
reset(): void {
  this.gameId = null;
  this.localPlayerId = null;
  this.opponentPlayerId = null;
  this.ruleset = null;
  this.flowStage = 'GAME_NOT_STARTED';
  this.activePlayerId = null;
  this.fieldCards = [];
  this.myHandCards = [];
  this.opponentHandCount = 0;
  this.myDepository = [];
  this.opponentDepository = [];
  this.deckRemaining = 24;
  this.myScore = 0;
  this.opponentScore = 0;
  this.myYaku = [];
  this.opponentYaku = [];
  this.koiKoiMultipliers = {};
}
```

---

## 2. UIStateStore 契約

### 2.1 職責定義

**契約要求**:
- ✅ 管理 UI 互動狀態（前端臨時狀態）
- ✅ 實作 `TriggerUIEffectPort` 介面的 5 個方法（不含 `triggerAnimation`）
- ✅ 提供狀態供 Vue 組件控制 Modal/Toast 顯示
- ✅ **不參與快照恢復**（重連後重置為初始狀態）
- ✅ **不持久化**

---

### 2.2 State 結構契約

**完整 State 定義**:

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

**契約要求**:
- ✅ 所有 boolean 初始化為 `false`
- ✅ 所有可空屬性初始化為 `null`
- ✅ 所有陣列初始化為 `[]`
- ✅ `connectionStatus` 初始值為 `'disconnected'`

---

### 2.3 Actions 契約（TriggerUIEffectPort 部分實作）

#### 2.3.1 showSelectionUI

```typescript
showSelectionUI(possibleTargets: string[]): void
```

**契約要求**:
- ✅ 設定 `selectionMode = true`
- ✅ 設定 `selectionPossibleTargets = possibleTargets`
- ✅ 不自動設定 `selectionSourceCard`（由組件設定）

---

#### 2.3.2 showDecisionModal

```typescript
showDecisionModal(
  currentYaku: YakuScore[],
  currentScore: number,
  potentialScore?: number
): void
```

**契約要求**:
- ✅ 設定 `decisionModalVisible = true`
- ✅ 設定 `decisionModalData = { currentYaku, currentScore, potentialScore }`
- ✅ 若 `potentialScore` 未提供，設為 `undefined`

---

#### 2.3.3 showErrorMessage

```typescript
showErrorMessage(message: string): void
```

**契約要求**:
- ✅ 設定 `errorMessage = message`
- ✅ 自動在 3 秒後清除（`setTimeout`）

**實作範例**:
```typescript
showErrorMessage(message: string): void {
  this.errorMessage = message;
  setTimeout(() => {
    this.errorMessage = null;
  }, 3000);
}
```

---

#### 2.3.4 showReconnectionMessage

```typescript
showReconnectionMessage(): void
```

**契約要求**:
- ✅ 設定 `reconnecting = true`
- ✅ 設定 `infoMessage = '連線中斷，正在嘗試重連...'`
- ✅ **不自動清除**（等待 `hideReconnectionMessage` 調用）

---

#### 2.3.5 showGameFinishedUI

```typescript
showGameFinishedUI(
  winner: string | null,
  finalScores: Record<string, number>
): void
```

**契約要求**:
- ✅ 設定 `gameFinishedVisible = true`
- ✅ 設定 `gameFinishedData = { winner, finalScores }`
- ✅ `winner` 為 `null` 表示平局

---

### 2.4 輔助方法契約

**必須提供的輔助方法**:

```typescript
hideSelectionUI(): void;
hideDecisionModal(): void;
hideGameFinishedUI(): void;
hideReconnectionMessage(): void;
setConnectionStatus(status: 'connected' | 'connecting' | 'disconnected'): void;
reset(): void;
```

**hideReconnectionMessage 實作**:
```typescript
hideReconnectionMessage(): void {
  this.reconnecting = false;
  this.infoMessage = '連線已恢復';
  setTimeout(() => {
    this.infoMessage = null;
  }, 3000);
}
```

---

## 3. 通用契約要求

### 3.1 Pinia 使用規範

**契約要求**:
- ✅ 使用 `defineStore` 定義 Stores
- ✅ Store ID 使用字串（`'gameState'`、`'uiState'`）
- ✅ 使用 Options API 語法（`state`、`getters`、`actions`）
- ✅ 不使用 Setup Store 語法（保持一致性）

**定義範例**:
```typescript
export const useGameStateStore = defineStore('gameState', {
  state: (): GameStateStoreState => ({
    gameId: null,
    // ...
  }),

  getters: {
    isMyTurn: (state) => state.activePlayerId === state.localPlayerId,
    // ...
  },

  actions: {
    initializeGameContext(gameId, players, ruleset) {
      this.gameId = gameId;
      // ...
    },
    // ...
  },
});
```

---

### 3.2 狀態響應性

**契約要求**:
- ✅ 所有 State 屬性必須為響應式（Pinia 自動處理）
- ✅ Vue 組件使用 `storeToRefs` 保持響應性
- ✅ 不直接解構 Store（會失去響應性）

**組件使用範例**:
```vue
<script setup>
import { storeToRefs } from 'pinia';
import { useGameStateStore } from '@/stores/gameState';

const gameState = useGameStateStore();
const { flowStage, myHandCards } = storeToRefs(gameState);  // ✅ 保持響應性

// ❌ 錯誤：失去響應性
// const { flowStage, myHandCards } = gameState;
</script>
```

---

### 3.3 Actions 中的 this 綁定

**契約要求**:
- ✅ Actions 使用普通函數（不使用箭頭函數）
- ✅ Actions 中的 `this` 指向 Store 實例
- ✅ 可直接修改 State（`this.gameId = ...`）

---

## 4. Output Ports 適配器契約

### 4.1 UIStatePortAdapter

**契約要求**:
- ✅ 將 `GameStateStore` 的 Actions 綁定為 `UIStatePort` 方法
- ✅ 使用 `.bind(store)` 確保 `this` 正確綁定

**實作範例**:
```typescript
export function createUIStatePortAdapter(): UIStatePort {
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

### 4.2 TriggerUIEffectPortAdapter

**契約要求**:
- ✅ 組合 `UIStateStore` 與 `AnimationService`
- ✅ `triggerAnimation` 委派給 `AnimationService`
- ✅ 其他 5 個方法綁定 `UIStateStore`

**實作範例**:
```typescript
export function createTriggerUIEffectPortAdapter(
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

## 5. 測試契約

### 5.1 單元測試要求

**必須測試的場景**（GameStateStore）:
1. ✅ `initializeGameContext` 正確設定所有屬性
2. ✅ `restoreGameState` 完全覆蓋狀態
3. ✅ `setFlowStage` 更新流程階段
4. ✅ `updateFieldCards` 更新場牌
5. ✅ `updateHandCards` 更新手牌
6. ✅ `updateDepositoryCards` 更新已獲得牌
7. ✅ `updateScores` 更新分數
8. ✅ `updateKoiKoiMultiplier` 更新倍率
9. ✅ `getLocalPlayerId` 拋出錯誤（未初始化）
10. ✅ Getters 計算正確（`isMyTurn`、`myKoiKoiMultiplier`）

**必須測試的場景**（UIStateStore）:
1. ✅ `showSelectionUI` 顯示選擇介面
2. ✅ `showDecisionModal` 顯示決策 Modal
3. ✅ `showErrorMessage` 自動消失（3 秒）
4. ✅ `showReconnectionMessage` 不自動消失
5. ✅ `hideReconnectionMessage` 顯示恢復訊息（3 秒後消失）
6. ✅ `showGameFinishedUI` 顯示遊戲結束畫面
7. ✅ `setConnectionStatus` 更新連線狀態

**測試覆蓋率目標**: > 80%

**測試範例**:
```typescript
import { setActivePinia, createPinia } from 'pinia';
import { useGameStateStore } from '@/adapter/stores/gameState';

describe('GameStateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize game context', () => {
    const store = useGameStateStore();
    const players = [
      { player_id: 'player-1', is_dealer: true },
      { player_id: 'player-2', is_dealer: false },
    ];
    const ruleset = { /* ... */ };

    store.initializeGameContext('game-123', players, ruleset);

    expect(store.gameId).toBe('game-123');
    expect(store.localPlayerId).toBe('player-1');
    expect(store.opponentPlayerId).toBe('player-2');
    expect(store.koiKoiMultipliers['player-1']).toBe(1);
  });

  it('should restore game state from snapshot', () => {
    const store = useGameStateStore();
    const snapshot = {
      game_id: 'game-456',
      current_flow_stage: 'AWAITING_HAND_PLAY',
      field_cards: ['0111', '0211'],
      // ...
    };

    store.restoreGameState(snapshot);

    expect(store.gameId).toBe('game-456');
    expect(store.flowStage).toBe('AWAITING_HAND_PLAY');
    expect(store.fieldCards).toEqual(['0111', '0211']);
  });

  it('should throw error when getLocalPlayerId is called before initialization', () => {
    const store = useGameStateStore();
    expect(() => store.getLocalPlayerId()).toThrow('LocalPlayerId not initialized');
  });
});
```

---

## 6. 效能契約

### 6.1 狀態更新效能

**契約要求**:
- ✅ 單次 Action 調用時間 < 5ms
- ✅ Getter 計算時間 < 1ms
- ✅ 避免在 Actions 中執行重計算（應使用 Getters）

---

### 6.2 記憶體管理

**契約要求**:
- ✅ `reset()` 方法正確釋放所有陣列引用
- ✅ 不累積歷史狀態（僅保留當前狀態）
- ✅ Modal/Toast 數據在關閉後設為 `null`

---

## 總結

本契約定義了 Pinia Stores 的完整實作規範，確保：

✅ 正確實作 Output Ports 介面（`UIStatePort` + `TriggerUIEffectPort` 部分）
✅ State 結構清晰明確（所有屬性有型別）
✅ Actions 行為規範一致（直接設定，不驗證）
✅ Getters 提供計算屬性（避免在組件中重複計算）
✅ 正確使用 Pinia API（`defineStore`、`storeToRefs`）
✅ 達到 80% 以上的測試覆蓋率

所有實作必須通過契約測試後才能整合到系統中。
