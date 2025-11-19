# Research & Technical Decisions: UI Adapter Layer

**Feature**: User Interface BC - Adapter Layer
**Date**: 2025-01-19
**Status**: Phase 0 Complete

本文檔記錄 UI Adapter Layer 實作前的技術研究與決策過程，包含所有關鍵技術選型、替代方案評估、以及決策理由。

---

## 目錄

1. [DI Container 技術選型](#1-di-container-技術選型)
2. [動畫系統技術選型](#2-動畫系統技術選型)
3. [SSE 重連策略](#3-sse-重連策略)
4. [Mock 模式設計](#4-mock-模式設計)
5. [Pinia Store 架構設計](#5-pinia-store-架構設計)
6. [Vue 組件架構設計](#6-vue-組件架構設計)
7. [REST API 客戶端設計](#7-rest-api-客戶端設計)
8. [SSE 客戶端設計](#8-sse-客戶端設計)
9. [路由守衛設計](#9-路由守衛設計)

---

## 1. DI Container 技術選型

### 決策結果

**✅ 選擇：自訂輕量級 DI Container**

### 問題背景

Application Layer 已定義 18 個 Use Cases 和 21 個 Ports，需要一個 DI Container 來管理依賴注入，確保：
- Use Cases 可注入 Output Ports（不依賴具體實作）
- Adapter 可替換（Backend / Local / Mock 模式切換）
- 依賴反轉原則（依賴抽象而非具體）
- 單例管理（Stores、API 客戶端等）

### 候選方案評估

#### 方案 A：tsyringe (Microsoft)

**優點**:
- 裝飾器語法簡潔（`@injectable()`、`@inject()`）
- Microsoft 維護，穩定性高
- 廣泛使用，社群支援良好
- 支援自動解析依賴樹

**缺點**:
- 需要 `reflect-metadata` polyfill（~5KB gzipped）
- tsyringe 本體 ~10KB gzipped
- 總打包體積增加 ~15KB
- 需要配置 TypeScript `experimentalDecorators: true`

**評估**:
- ❌ 打包體積過大（對前端專案來說 15KB 不算小）
- ❌ 引入外部依賴增加專案複雜度
- ✅ API 設計優雅，開發體驗好

---

#### 方案 B：inversify

**優點**:
- 功能最豐富（多實例、條件綁定、中間件）
- 文檔完善，範例豐富
- 社群主流選擇

**缺點**:
- 打包體積 ~15KB gzipped（比 tsyringe 更大）
- 學習曲線較陡
- 功能過於複雜（我們不需要進階功能）

**評估**:
- ❌ 打包體積過大
- ❌ 功能過剩（YAGNI 原則）
- ❌ 學習成本高

---

#### 方案 C：自訂輕量級 DI Container ✅

**優點**:
- 零外部依賴
- 完全可控，符合專案需求
- 打包體積極小（~1KB，約 100 行程式碼）
- 無需 reflect-metadata polyfill
- 實作簡單，易於理解與維護

**缺點**:
- 需要自行實作基礎功能
- 缺少進階功能（但我們不需要）
- 需要編寫測試

**評估**:
- ✅ 完全符合 Clean Architecture 簡單性原則
- ✅ 零外部依賴，降低專案複雜度
- ✅ 功能足夠（註冊、解析、單例管理）
- ✅ 打包體積最小

---

### 最終決策

選擇 **自訂輕量級 DI Container**。

**理由**:
1. **簡單性優先**: 我們只需要基本的依賴注入功能（註冊、解析、單例），不需要 tsyringe/inversify 的進階功能
2. **零外部依賴**: 符合專案「最小化依賴」的原則
3. **打包體積**: 15KB vs 1KB 的差異對前端專案有意義
4. **可控性**: 完全掌握實作細節，未來擴展更靈活
5. **學習價值**: 展示對依賴注入原理的深入理解

**實作重點**:
- 使用 `Map<Symbol, any>` 儲存依賴（Symbol 避免命名衝突）
- 提供 `register(token, factory)` 方法註冊依賴
- 提供 `resolve<T>(token)` 方法解析依賴
- 支援單例模式（`singleton: true`）
- 提供 `clear()` 方法用於測試清理

**預期程式碼量**: ~100 行（container.ts）+ ~50 行（registry.ts）+ ~30 行（tokens.ts）

---

## 2. 動畫系統技術選型

### 決策結果

**✅ P1 階段（MVP）：Vue Transition + CSS**
**✅ P3 階段（後續優化）：延後決定（GSAP / Anime.js / 純 CSS）**

### 問題背景

spec.md 定義了 5 種動畫類型：
1. **DEAL_CARDS**: 發牌動畫（卡片從牌堆飛向各區域）
2. **CARD_MOVE**: 卡片移動（手牌 → 場牌 → 獲得區）
3. **MATCH_HIGHLIGHT**: 配對高亮閃爍
4. **YAKU_FORMED**: 役種形成發光特效
5. **SCORE_UPDATE**: 分數滾動動畫

**約束條件**:
- 第三方動畫庫打包體積 < 50KB gzipped
- 動畫幀率 > 50 FPS（目標 60 FPS）
- P1 階段僅需基礎卡片移動（DEAL_CARDS、CARD_MOVE）
- P3 階段才實作複雜特效（MATCH_HIGHLIGHT、YAKU_FORMED、SCORE_UPDATE）

### 候選方案評估

#### 方案 A：純 Vue Transition + CSS ✅

**優點**:
- 零依賴，Vue 原生支援
- 打包體積 0
- 性能最優（GPU 加速的 CSS transform/opacity）
- 與 Vue 組件生命週期完美整合

**缺點**:
- 複雜動畫（粒子效果、路徑動畫）實作困難
- 缺少時間軸控制（sequential animations 需手動編排）
- 數字滾動動畫需自行實作 requestAnimationFrame

**評估**:
- ✅ P1 基礎動畫（DEAL_CARDS、CARD_MOVE）完全足夠
- ❓ P3 複雜特效可能需要大量 CSS 代碼
- ✅ 性能最優，無額外依賴

---

#### 方案 B：GSAP Core

**優點**:
- 動畫控制強大（時間軸、緩動函數、路徑動畫）
- 性能優異（比 CSS 更流暢的複雜動畫）
- API 簡潔，學習曲線平緩
- 業界標準，文檔豐富

**缺點**:
- 打包體積 ~30KB gzipped（僅 Core，接近 50KB 限制）
- 引入外部依賴
- 需要 Tree-shaking 配置（避免引入完整庫）

**評估**:
- ✅ P3 複雜特效最佳選擇
- ⚠️ 打包體積接近限制，需謹慎評估
- ❌ P1 階段不需要

---

#### 方案 C：Anime.js

**優點**:
- 輕量（~6KB gzipped）
- API 簡潔，易於上手
- 支援時間軸與序列動畫
- 足夠應對中等複雜度動畫

**缺點**:
- 功能較 GSAP 少（無進階路徑動畫）
- 社群較小，文檔較少
- 性能略遜於 GSAP

**評估**:
- ✅ 打包體積合理
- ✅ P3 複雜特效的中等選擇
- ❌ P1 階段不需要

---

### 最終決策

**分階段實作策略**：

#### P1 階段（MVP）：✅ 純 Vue Transition + CSS

**理由**:
1. **簡單性優先**: 基礎卡片移動不需要複雜動畫庫
2. **零依賴**: 符合 MVP 最小化範圍
3. **性能最優**: GPU 加速的 CSS transform
4. **快速實作**: 無需學習第三方 API

**實作範圍**:
- `DEAL_CARDS`: 使用 Vue `<TransitionGroup>` + CSS `transform`
- `CARD_MOVE`: 使用 Vue `<Transition>` + CSS `translate`

**技術細節**:
```vue
<TransitionGroup name="card-move" tag="div">
  <CardComponent v-for="card in cards" :key="card.id" />
</TransitionGroup>
```

```css
.card-move-enter-active,
.card-move-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-move-enter-from {
  opacity: 0;
  transform: translateY(-50px);
}
.card-move-leave-to {
  opacity: 0;
  transform: translateY(50px);
}
```

---

#### P3 階段（後續優化）：延後決定

**理由**:
1. **需求不明確**: 複雜特效的具體視覺設計尚未確定
2. **避免過度設計**: 先實作基礎功能，根據實際需求選擇工具
3. **打包體積控制**: 若 Vue Transition 足夠，無需引入第三方庫

**決策流程**（P3 開始時）:
1. 評估 Vue Transition 是否能實作 MATCH_HIGHLIGHT（閃爍 3 次）
2. 若不足，比較 GSAP Core 與 Anime.js 的打包體積（使用 Vite build --report）
3. 若體積超限，退回純 CSS 實作（降低特效複雜度）

**候選方案優先級**:
1. 純 Vue Transition + CSS（若能滿足需求）
2. Anime.js（體積小，功能足夠）
3. GSAP Core（功能強大但體積大）

---

### 動畫隊列管理設計

**無論使用哪種技術，都需要統一的動畫隊列管理**：

**需求**:
- FIFO 順序執行動畫（避免視覺混亂）
- 支援動畫中斷（快照恢復時清空隊列）
- 提供回調機制（動畫完成後通知上層）

**實作方案**:
```typescript
// AnimationQueue.ts
class AnimationQueue {
  private queue: Animation[] = [];
  private isPlaying = false;

  enqueue(animation: Animation): void {
    this.queue.push(animation);
    if (!this.isPlaying) this.playNext();
  }

  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const animation = this.queue.shift()!;
    await this.play(animation);
    this.playNext();
  }

  interrupt(): void {
    this.queue = [];
    this.isPlaying = false;
  }
}
```

---

## 3. SSE 重連策略

### 決策結果

**✅ MVP 階段：僅實作指數退避重連機制（1s → 2s → 4s → 8s → 16s，最多 5 次）**
**✅ Post-MVP：Fallback 短輪詢機制延後實作**

### 問題背景

spec.md FR-006 至 FR-008 定義了 SSE 重連需求：
- 連線中斷時自動重連（指數退避策略）
- 連續失敗 5 次後切換到 Fallback 短輪詢模式（每 2 秒請求快照）
- 重連成功後發送 joinGame 獲取快照恢復狀態

**約束條件**:
- 最大重連等待時間 30 秒
- 重連成功後必須恢復完整遊戲狀態
- Fallback 短輪詢需要後端提供 `GET /api/v1/games/{gameId}/snapshot` 端點

### 指數退避重連機制（✅ MVP 必要）

**設計**:
```typescript
class GameEventClient {
  private reconnectAttempts = 0;
  private maxAttempts = 5;
  private reconnectDelays = [1000, 2000, 4000, 8000, 16000]; // ms

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxAttempts) {
      console.error('SSE 重連失敗，達到最大嘗試次數');
      // MVP: 顯示錯誤訊息，不實作 Fallback
      this.onConnectionFailed();
      return;
    }

    const delay = this.reconnectDelays[this.reconnectAttempts];
    this.reconnectAttempts++;

    console.info(`SSE 重連中... (嘗試 ${this.reconnectAttempts}/${this.maxAttempts})，等待 ${delay}ms`);

    await sleep(delay);
    this.connect();
  }

  private onConnectionFailed(): void {
    // MVP: 顯示「無法連線到伺服器，請檢查網路」
    // Post-MVP: 切換到 Fallback 短輪詢模式
  }
}
```

**重連成功後的狀態恢復**:
```typescript
private onConnectionEstablished(): void {
  this.reconnectAttempts = 0; // 重置計數器

  // 發送 joinGame 請求獲取快照
  this.apiClient.joinGame(this.sessionToken).then(snapshot => {
    // 觸發 HandleReconnectionUseCase
    this.handleReconnectionUseCase.execute(snapshot);
  });
}
```

---

### Fallback 短輪詢機制（❌ Post-MVP）

**為何延後**:
1. **後端依賴**: 需要後端實作 `GET /api/v1/games/{gameId}/snapshot` 端點（目前未確認）
2. **複雜度**: 需要設計短輪詢的啟動/停止邏輯、錯誤處理、與 SSE 的切換機制
3. **實際需求**: MVP 階段網路穩定性假設較高，重連機制足夠

**Post-MVP 實作設計**（供未來參考）:
```typescript
class FallbackPollingService {
  private pollingInterval: NodeJS.Timer | null = null;
  private pollingDelay = 2000; // 2 秒

  start(gameId: string, sessionToken: string): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const snapshot = await this.apiClient.getSnapshot(gameId, sessionToken);
        this.handleReconnectionUseCase.execute(snapshot);
      } catch (error) {
        console.error('短輪詢失敗', error);
        // 若短輪詢也失敗，顯示「無法連線」錯誤
      }
    }, this.pollingDelay);
  }

  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
```

**切換邏輯**:
- SSE 連續失敗 5 次 → 啟動短輪詢
- 短輪詢期間嘗試重建 SSE 連線（每 10 秒一次）
- SSE 重連成功 → 停止短輪詢，切回 SSE 模式

---

### 最終決策

**MVP 階段**:
- ✅ 實作指數退避重連機制（完全符合 FR-006、FR-008）
- ✅ 重連失敗 5 次後顯示友善錯誤訊息
- ❌ 不實作 Fallback 短輪詢（標記為 Post-MVP）

**理由**:
1. **簡單性優先**: 避免 MVP 階段過度設計
2. **後端依賴**: 快照 API 端點可用性未確認
3. **實際需求**: 指數退避重連機制已能應對大部分網路中斷場景
4. **開發效率**: 節省 ~4 小時開發時間，專注於核心功能

---

## 4. Mock 模式設計

### 決策結果

**✅ 選擇：內建固定事件腳本（最小實作）**

### 問題背景

spec.md FR-038 至 FR-039 定義了 Mock 模式需求：
- 提供 Mock API Client 模擬所有 REST API 端點
- 提供 Mock Event Emitter 可程式化觸發 13 種 SSE 事件
- 用於開發測試，無需後端伺服器

**約束條件**:
- 不增加生產環境打包體積（Mock 代碼僅在開發模式載入）
- 事件序列必須合法（符合遊戲邏輯）
- 開發者可快速切換到 Mock 模式測試 UI

### 候選方案評估

#### 方案 A：內建固定事件腳本 ✅

**設計**:
```typescript
// mockEventScript.ts
export const FULL_GAME_SCRIPT: MockEvent[] = [
  { type: 'GameStarted', delay: 0, payload: { ... } },
  { type: 'RoundDealt', delay: 1000, payload: { ... } },
  { type: 'TurnCompleted', delay: 2000, payload: { ... } },
  // ... 完整一局遊戲的事件序列（約 20-30 個事件）
];

// MockEventEmitter.ts
class MockEventEmitter {
  async playScript(script: MockEvent[]): Promise<void> {
    for (const event of script) {
      await sleep(event.delay);
      this.emit(event.type, event.payload);
    }
  }
}
```

**優點**:
- 實作最簡單（~2 小時）
- 事件序列保證合法（手動編寫，經過驗證）
- 足夠應對基本 UI 測試
- 無額外依賴

**缺點**:
- 缺乏彈性（無法自訂事件序列）
- 無法測試特定邊緣情況

**評估**:
- ✅ 符合 MVP 最小化範圍
- ✅ 開發效率高
- ✅ 足夠應對 80% 的 UI 測試場景

---

#### 方案 B：URL 參數控制事件序列

**設計**:
```typescript
// /game?mode=mock&events=GameStarted,RoundDealt,TurnCompleted
const urlParams = new URLSearchParams(window.location.search);
const events = urlParams.get('events')?.split(',') || DEFAULT_EVENTS;

mockEventEmitter.playEvents(events);
```

**優點**:
- 彈性較高（可透過 URL 觸發特定序列）
- 無需 UI 控制面板
- 分享測試場景方便（複製 URL）

**缺點**:
- 需要解析 URL 參數並驗證
- 需要設計事件參數生成邏輯（如何生成合法的 payload）
- 增加實作複雜度（+2 小時）

**評估**:
- ⚠️ 實作成本增加
- ❓ 實際使用頻率未知
- ✅ 未來可擴展

---

#### 方案 C：開發工具 UI 控制面板

**設計**:
- 在開發模式顯示浮動控制面板
- 提供按鈕手動觸發各種事件
- 類似 Chrome DevTools

**優點**:
- 開發體驗最佳
- 可測試任意事件組合

**缺點**:
- 實作成本高（+4 小時）
- 需要設計 UI 介面
- 僅用於開發，投資報酬率低

**評估**:
- ❌ 過度設計
- ❌ 開發成本過高
- ❌ MVP 不需要

---

### 最終決策

選擇 **方案 A：內建固定事件腳本**。

**理由**:
1. **簡單性優先**: 最小實作成本（~2 小時）
2. **足夠好**: 覆蓋 80% 的 UI 測試需求
3. **未來可擴展**: 若需要，可在 Post-MVP 增加方案 B（URL 參數）

**實作重點**:
- 編寫一局完整遊戲的事件腳本（約 20-30 個事件）
- 包含常見場景：發牌、打牌、配對、役種形成、Koi-Koi 決策、局結束
- 事件延遲設定合理（模擬真實遊戲節奏）
- 所有事件 payload 經過驗證（符合 protocol.md 規範）

**內建腳本範例**:
```typescript
export const FULL_GAME_SCRIPT: MockEvent[] = [
  {
    type: 'GameStarted',
    delay: 0,
    payload: {
      game_id: 'mock-game-123',
      players: [
        { player_id: 'player-1', is_dealer: true },
        { player_id: 'player-2', is_dealer: false }
      ],
      ruleset: { /* ... */ }
    }
  },
  {
    type: 'RoundDealt',
    delay: 1000,
    payload: {
      round_number: 1,
      hand_cards: ['0111', '0211', '0311', /* ... */],
      field_cards: ['0112', '0212', '0312', /* ... */],
      starting_player_id: 'player-1'
    }
  },
  // ... 更多事件
];
```

---

## 5. Pinia Store 架構設計

### 決策結果

**✅ 兩個獨立 Stores**:
- **GameStateStore**: 實作 UIStatePort（遊戲核心狀態）
- **UIStateStore**: 實作 TriggerUIEffectPort 部分（UI 互動狀態）

### 設計原則

#### 職責劃分

**GameStateStore**（遊戲核心狀態）:
- 管理後端同步的遊戲狀態（gameId、flowStage、cards、scores、yaku）
- 實作 `UIStatePort` 介面的 10 個方法
- 參與快照恢復（狀態完全覆蓋）
- **不持久化**（所有狀態從 SSE 事件恢復）

**UIStateStore**（UI 互動狀態）:
- 管理前端臨時 UI 狀態（selectionMode、modals、messages、connectionStatus）
- 實作 `TriggerUIEffectPort` 介面的非動畫部分（6 個方法中的 5 個）
- **不參與快照恢復**（重連後重置為初始狀態）
- **不持久化**

**AnimationService**（動畫執行）:
- 實作 `TriggerUIEffectPort.triggerAnimation` 方法
- 管理動畫隊列（AnimationQueue）
- 不使用 Pinia Store（直接操作 DOM 或 CSS 變數）

---

### GameStateStore 設計

```typescript
// stores/gameState.ts
import { defineStore } from 'pinia';
import type { UIStatePort } from '@/user-interface/application/ports/output';

export const useGameStateStore = defineStore('gameState', {
  state: () => ({
    // 遊戲上下文
    gameId: null as string | null,
    localPlayerId: null as string | null,
    opponentPlayerId: null as string | null,
    ruleset: null as Ruleset | null,

    // 流程狀態
    flowStage: 'GAME_NOT_STARTED' as FlowStage,
    activePlayerId: null as string | null,

    // 牌面狀態
    fieldCards: [] as string[],
    myHandCards: [] as string[],
    opponentHandCount: 0,
    myDepository: [] as string[],
    opponentDepository: [] as string[],
    deckRemaining: 24,

    // 分數與役種
    myScore: 0,
    opponentScore: 0,
    myYaku: [] as YakuScore[],
    opponentYaku: [] as YakuScore[],
    koiKoiMultipliers: {} as Record<string, number>,
  }),

  getters: {
    isMyTurn: (state) => state.activePlayerId === state.localPlayerId,
    currentFlowStage: (state) => state.flowStage,
  },

  actions: {
    // 實作 UIStatePort 介面
    initializeGameContext(gameId: string, players, ruleset) {
      this.gameId = gameId;
      this.localPlayerId = players[0].player_id;
      this.opponentPlayerId = players[1].player_id;
      this.ruleset = ruleset;
    },

    restoreGameState(snapshot) {
      // 快照恢復：完全覆蓋所有狀態
      this.gameId = snapshot.game_id;
      this.flowStage = snapshot.current_flow_stage;
      this.fieldCards = snapshot.field_cards;
      // ... 更多欄位
    },

    setFlowStage(stage: FlowStage) {
      this.flowStage = stage;
    },

    updateFieldCards(cards: string[]) {
      this.fieldCards = cards;
    },

    updateHandCards(cards: string[]) {
      this.myHandCards = cards;
    },

    updateDepositoryCards(playerCards: string[], opponentCards: string[]) {
      this.myDepository = playerCards;
      this.opponentDepository = opponentCards;
    },

    updateScores(playerScore: number, opponentScore: number) {
      this.myScore = playerScore;
      this.opponentScore = opponentScore;
    },

    updateDeckRemaining(count: number) {
      this.deckRemaining = count;
    },

    updateKoiKoiMultiplier(playerId: string, multiplier: number) {
      this.koiKoiMultipliers[playerId] = multiplier;
    },

    getLocalPlayerId(): string {
      if (!this.localPlayerId) throw new Error('LocalPlayerId not initialized');
      return this.localPlayerId;
    },
  },
});

// Adapter 實作（在 di/registry.ts 註冊）
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

### UIStateStore 設計

```typescript
// stores/uiState.ts
import { defineStore } from 'pinia';
import type { TriggerUIEffectPort } from '@/user-interface/application/ports/output';

export const useUIStateStore = defineStore('uiState', {
  state: () => ({
    // 配對選擇
    selectionMode: false,
    selectionSourceCard: null as string | null,
    selectionPossibleTargets: [] as string[],

    // Koi-Koi 決策 Modal
    decisionModalVisible: false,
    decisionModalData: null as DecisionModalData | null,

    // 訊息提示
    errorMessage: null as string | null,
    infoMessage: null as string | null,

    // 連線狀態
    connectionStatus: 'disconnected' as 'connected' | 'connecting' | 'disconnected',
    reconnecting: false,
  }),

  actions: {
    // 實作 TriggerUIEffectPort 介面（非動畫部分）
    showSelectionUI(possibleTargets: string[]) {
      this.selectionMode = true;
      this.selectionPossibleTargets = possibleTargets;
    },

    hideSelectionUI() {
      this.selectionMode = false;
      this.selectionSourceCard = null;
      this.selectionPossibleTargets = [];
    },

    showDecisionModal(currentYaku, currentScore, potentialScore?) {
      this.decisionModalVisible = true;
      this.decisionModalData = { currentYaku, currentScore, potentialScore };
    },

    hideDecisionModal() {
      this.decisionModalVisible = false;
      this.decisionModalData = null;
    },

    showErrorMessage(message: string) {
      this.errorMessage = message;
      // 自動消失（3 秒後）
      setTimeout(() => { this.errorMessage = null; }, 3000);
    },

    showReconnectionMessage() {
      this.reconnecting = true;
      this.infoMessage = '連線中斷，正在嘗試重連...';
    },

    hideReconnectionMessage() {
      this.reconnecting = false;
      this.infoMessage = '連線已恢復';
      setTimeout(() => { this.infoMessage = null; }, 3000);
    },

    showGameFinishedUI(winner, finalScores) {
      // 顯示遊戲結束畫面（可使用 Modal 或跳轉到結算頁面）
      console.log('Game Finished', winner, finalScores);
    },

    setConnectionStatus(status: 'connected' | 'connecting' | 'disconnected') {
      this.connectionStatus = status;
    },
  },
});

// Adapter 實作（部分，triggerAnimation 由 AnimationService 實作）
export function createTriggerUIEffectPortAdapter(animationService): TriggerUIEffectPort {
  const store = useUIStateStore();
  return {
    showSelectionUI: store.showSelectionUI.bind(store),
    showDecisionModal: store.showDecisionModal.bind(store),
    showErrorMessage: store.showErrorMessage.bind(store),
    showReconnectionMessage: store.showReconnectionMessage.bind(store),
    triggerAnimation: animationService.trigger.bind(animationService), // 委派給 AnimationService
    showGameFinishedUI: store.showGameFinishedUI.bind(store),
  };
}
```

---

### Store 測試策略

```typescript
// tests/adapter/stores/gameState.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState';

describe('GameStateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize game context', () => {
    const store = useGameStateStore();
    store.initializeGameContext('game-123', players, ruleset);

    expect(store.gameId).toBe('game-123');
    expect(store.localPlayerId).toBe('player-1');
  });

  it('should restore game state from snapshot', () => {
    const store = useGameStateStore();
    store.restoreGameState(mockSnapshot);

    expect(store.flowStage).toBe('AWAITING_HAND_PLAY');
    expect(store.fieldCards).toHaveLength(8);
  });

  // ... 更多測試
});
```

---

## 6. Vue 組件架構設計

### 組件層級結構

```
GamePage.vue (容器組件)
├── TopInfoBar.vue (資訊顯示)
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
└── ReconnectionBanner.vue (重連提示，條件渲染)
```

### GamePage.vue 設計

```vue
<template>
  <div class="game-page h-screen w-screen flex flex-col overflow-hidden">
    <!-- 頂部資訊列 (10-12% viewport) -->
    <TopInfoBar class="flex-[0_0_12%]" />

    <!-- 對手已獲得牌區 (15% viewport) -->
    <OpponentDepositoryZone class="flex-[0_0_15%]" />

    <!-- 場中央牌區 (30% viewport) -->
    <FieldZone class="flex-[0_0_30%]" />

    <!-- 玩家已獲得牌區 (15% viewport) -->
    <PlayerDepositoryZone class="flex-[0_0_15%]" />

    <!-- 玩家手牌區 (25% viewport) -->
    <PlayerHandZone class="flex-[0_0_25%]" />

    <!-- 互動 UI（條件渲染） -->
    <SelectionOverlay v-if="uiState.selectionMode" />
    <DecisionModal v-if="uiState.decisionModalVisible" />
    <ErrorToast v-if="uiState.errorMessage" />
    <ReconnectionBanner v-if="uiState.reconnecting" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState';
import { useUIStateStore } from '@/user-interface/adapter/stores/uiState';

const gameState = useGameStateStore();
const uiState = useUIStateStore();

// 使用 storeToRefs 保持響應性
const { flowStage, myHandCards, fieldCards } = storeToRefs(gameState);
</script>
```

### 組件與 Input Ports 整合

**正確設計：組件依賴 Input Ports（不是 Use Cases）**

```vue
<!-- PlayerHandZone.vue -->
<template>
  <div class="player-hand-zone">
    <CardComponent
      v-for="card in handCards"
      :key="card"
      :cardId="card"
      :isSelectable="isMyTurn"
      @click="onCardClick(card)"
    />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState';
import type { PlayHandCardPort } from '@/user-interface/application/ports/input';

// 從 DI Container 注入 Input Port（不是 Use Case）
const playHandCardPort = inject<PlayHandCardPort>('PlayHandCardPort')!;

const gameState = useGameStateStore();
const { myHandCards, flowStage } = storeToRefs(gameState);

const isMyTurn = computed(() => flowStage.value === 'AWAITING_HAND_PLAY');

function onCardClick(cardId: string) {
  // 調用 Input Port（Application Layer 定義的介面）
  playHandCardPort.execute({ cardId });
  // Use Case 的具體實作由 DI Container 提供
}
</script>
```

**DI Container 註冊範例**:
```typescript
// di/registry.ts
export function registerUseCases(container: DIContainer): void {
  // 註冊 Use Cases 為 Input Ports 的實作
  container.register(
    'PlayHandCardPort',
    () => new PlayHandCardUseCase(
      container.resolve('SendCommandPort'),
      container.resolve('UIStatePort')
    ),
    { singleton: true }
  );

  container.register(
    'SelectMatchTargetPort',
    () => new SelectMatchTargetUseCase(
      container.resolve('SendCommandPort')
    ),
    { singleton: true }
  );

  // ... 註冊所有 18 個 Input Ports
}
```

**關鍵原則**:
- ✅ Vue 組件依賴 `Input Ports`（Application Layer 定義的介面）
- ✅ **不直接依賴 Use Cases**（具體實作）
- ✅ 透過 `inject('PlayHandCardPort')` 獲取實作（由 DI Container 提供）
- ✅ 符合依賴反轉原則（DIP）
- ✅ Adapter Layer（組件）→ Application Layer（Input Ports）→ Domain Layer

**錯誤示範**（違反 CA）:
```typescript
// ❌ 錯誤：直接依賴 Use Case
import { PlayHandCardUseCase } from '@/application/use-cases';
const useCase = inject<PlayHandCardUseCase>('PlayHandCardUseCase');

// ✅ 正確：依賴 Input Port
import type { PlayHandCardPort } from '@/application/ports/input';
const port = inject<PlayHandCardPort>('PlayHandCardPort');
```

---

## 7. REST API 客戶端設計

### GameApiClient 設計

```typescript
// api/GameApiClient.ts
import type { SendCommandPort } from '@/user-interface/application/ports/output';

export class GameApiClient implements SendCommandPort {
  private baseURL: string;
  private timeout: number = 5000; // 5 秒

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async playHandCard(cardId: string, matchTargetId?: string): Promise<void> {
    const gameState = useGameStateStore();
    const gameId = gameState.gameId;

    await this.post(`/api/v1/games/${gameId}/commands/play-hand-card`, {
      card_id: cardId,
      match_target_id: matchTargetId,
    });
  }

  async selectTarget(sourceCardId: string, targetCardId: string): Promise<void> {
    const gameState = useGameStateStore();
    const gameId = gameState.gameId;

    await this.post(`/api/v1/games/${gameId}/commands/select-target`, {
      source_card_id: sourceCardId,
      target_card_id: targetCardId,
    });
  }

  async makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void> {
    const gameState = useGameStateStore();
    const gameId = gameState.gameId;

    await this.post(`/api/v1/games/${gameId}/commands/make-decision`, {
      decision,
    });
  }

  // 內部方法：通用 POST 請求（含重試機制）
  private async post(path: string, body: any, retries = 3): Promise<any> {
    const url = `${this.baseURL}${path}`;
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

      // 重試邏輯（指數退避）
      if (retries > 0 && this.isRetryableError(error)) {
        const delay = (4 - retries) * 1000; // 1s, 2s, 3s
        await sleep(delay);
        return this.post(path, body, retries - 1);
      }

      throw this.wrapError(error);
    }
  }

  private isRetryableError(error: any): boolean {
    // 網路錯誤或 5xx 伺服器錯誤可重試
    return error instanceof TypeError || (error instanceof ServerError && error.status >= 500);
  }

  private wrapError(error: any): Error {
    if (error.name === 'AbortError') {
      return new TimeoutError();
    }
    if (error instanceof TypeError) {
      return new NetworkError();
    }
    return error;
  }
}
```

---

## 8. SSE 客戶端設計

### GameEventClient 設計

```typescript
// sse/GameEventClient.ts
export class GameEventClient {
  private eventSource: EventSource | null = null;
  private eventRouter: EventRouter;
  private reconnectAttempts = 0;
  private maxAttempts = 5;
  private reconnectDelays = [1000, 2000, 4000, 8000, 16000];

  constructor(private baseURL: string, eventRouter: EventRouter) {
    this.eventRouter = eventRouter;
  }

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

    // 註冊所有 SSE 事件監聽器
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    const eventTypes = [
      'GameStarted', 'RoundDealt', 'TurnCompleted', 'SelectionRequired',
      'TurnProgressAfterSelection', 'DecisionRequired', 'DecisionMade',
      'YakuFormed', 'RoundScored', 'RoundEndedInstantly', 'RoundDrawn',
      'GameFinished', 'TurnError', 'GameSnapshotRestore'
    ];

    eventTypes.forEach(type => {
      this.eventSource!.addEventListener(type, (event: MessageEvent) => {
        const payload = JSON.parse(event.data);
        this.eventRouter.route(type, payload);
      });
    });
  }

  private async reconnect(gameId: string, sessionToken: string): Promise<void> {
    if (this.reconnectAttempts >= this.maxAttempts) {
      console.error('SSE 重連失敗，達到最大嘗試次數');
      this.onConnectionFailed();
      return;
    }

    const delay = this.reconnectDelays[this.reconnectAttempts];
    this.reconnectAttempts++;

    console.info(`SSE 重連中... (${this.reconnectAttempts}/${this.maxAttempts})，等待 ${delay}ms`);

    await sleep(delay);
    this.connect(gameId, sessionToken);
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }

  private onConnectionEstablished(): void {
    const uiState = useUIStateStore();
    uiState.setConnectionStatus('connected');
    uiState.hideReconnectionMessage();
  }

  private onConnectionLost(): void {
    const uiState = useUIStateStore();
    uiState.setConnectionStatus('disconnected');
    uiState.showReconnectionMessage();
  }

  private onConnectionFailed(): void {
    const uiState = useUIStateStore();
    uiState.setConnectionStatus('disconnected');
    uiState.showErrorMessage('無法連線到伺服器，請檢查網路');
  }
}
```

### EventRouter 設計

```typescript
// sse/EventRouter.ts
import type { InputPort } from '@/user-interface/application/ports/input';

export class EventRouter {
  private handlers = new Map<string, InputPort<any>>();

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
}

// 在 DI Container 註冊時綁定（注意：依賴 Input Ports，不是 Use Cases）
function setupEventRouter(container: DIContainer): EventRouter {
  const router = new EventRouter();

  // 註冊 Input Ports（Use Cases 已在 DI Container 註冊為 Input Ports 的實作）
  router.register('GameStarted',
    container.resolve<HandleGameStartedPort>('HandleGameStartedPort')
  );

  router.register('RoundDealt',
    container.resolve<HandleRoundDealtPort>('HandleRoundDealtPort')
  );

  router.register('TurnCompleted',
    container.resolve<HandleTurnCompletedPort>('HandleTurnCompletedPort')
  );

  router.register('SelectionRequired',
    container.resolve<HandleSelectionRequiredPort>('HandleSelectionRequiredPort')
  );

  // ... 註冊所有 15 種事件處理 Input Ports

  return router;
}
```

**關鍵修正**:
- ✅ EventRouter 依賴 `InputPort<T>` 介面（Application Layer 定義）
- ✅ 不直接依賴 Use Cases（具體實作）
- ✅ 符合依賴反轉原則（DIP）
- ✅ DI Container 負責將 Use Cases 註冊為 Input Ports 的實作

---

## 9. 路由守衛設計

### gamePageGuard 設計

```typescript
// router/guards.ts
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { container } from '@/user-interface/adapter/di/container';

export async function gamePageGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  // 1. 讀取遊戲模式配置（優先級：URL > localStorage > 環境變數）
  const mode = getGameMode(to);

  // 2. 根據模式初始化對應的 Adapter
  if (mode === 'backend') {
    await initBackendMode();
  } else if (mode === 'mock') {
    await initMockMode();
  } else if (mode === 'local') {
    await initLocalMode(); // 架構預留，暫時空實作
  }

  next();
}

function getGameMode(route: RouteLocationNormalized): 'backend' | 'local' | 'mock' {
  // URL 參數優先（/game?mode=mock）
  const urlMode = route.query.mode as string;
  if (urlMode && ['backend', 'local', 'mock'].includes(urlMode)) {
    return urlMode as any;
  }

  // localStorage 次之
  const storageMode = localStorage.getItem('gameMode');
  if (storageMode && ['backend', 'local', 'mock'].includes(storageMode)) {
    return storageMode as any;
  }

  // 環境變數最後（預設 backend）
  return import.meta.env.VITE_GAME_MODE || 'backend';
}

async function initBackendMode(): Promise<void> {
  // 檢查 sessionToken
  const sessionToken = sessionStorage.getItem('sessionToken');

  if (!sessionToken) {
    // 發送 joinGame 請求
    const apiClient = container.resolve('GameApiClient');
    const response = await apiClient.joinGame();

    sessionStorage.setItem('sessionToken', response.session_token);
    sessionStorage.setItem('gameId', response.game_id);
  }

  // 建立 SSE 連線
  const gameId = sessionStorage.getItem('gameId')!;
  const token = sessionStorage.getItem('sessionToken')!;

  const eventClient = container.resolve('GameEventClient');
  eventClient.connect(gameId, token);
}

async function initMockMode(): Promise<void> {
  // 使用 Mock Adapter
  const mockEventEmitter = container.resolve('MockEventEmitter');
  mockEventEmitter.playScript(FULL_GAME_SCRIPT);
}

async function initLocalMode(): Promise<void> {
  // 架構預留：等待 Local Game BC 完成後實作
  console.warn('Local 模式尚未實作，使用 Mock 模式替代');
  await initMockMode();
}
```

---

## 總結

本研究文檔記錄了 UI Adapter Layer 實作前的所有技術決策，確保：

✅ **所有技術選型都有明確理由**
✅ **替代方案經過充分評估**
✅ **決策符合專案憲法原則（Clean Architecture、簡單性優先）**
✅ **實作範圍清晰（MVP vs Post-MVP）**
✅ **技術細節完整記錄（供 Phase 1 設計參考）**

接下來進入 Phase 1：生成 data-model.md、contracts/、quickstart.md。
