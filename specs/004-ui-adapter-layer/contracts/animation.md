# Contract: Animation Service

**Contract Type**: Implementation Contract
**Component**: `AnimationService` + `AnimationQueue`
**Implements**: `TriggerUIEffectPort.triggerAnimation`
**Date**: 2025-01-19

本契約定義動畫系統的實作規範，包含動畫類型、參數結構、隊列管理、中斷機制、測試要求等。

---

## 1. AnimationService 契約

### 1.1 職責定義

**契約要求**:
- ✅ 實作 `TriggerUIEffectPort.triggerAnimation` 方法
- ✅ 管理動畫隊列（FIFO 順序執行）
- ✅ 支援動畫中斷（快照恢復時清空隊列）
- ✅ P1 階段僅實作基礎動畫（DEAL_CARDS、CARD_MOVE）
- ✅ P3 階段擴展複雜動畫（MATCH_HIGHLIGHT、YAKU_FORMED、SCORE_UPDATE）

---

### 1.2 介面契約

**實作方法**:

```typescript
class AnimationService {
  trigger(type: AnimationType, params: AnimationParams): Promise<void>;
  interrupt(): void;
}
```

**契約要求**:
- ✅ `trigger` 方法必須為 `async`（返回 Promise）
- ✅ `trigger` 將動畫加入隊列（不立即執行）
- ✅ Promise 在動畫完成後 resolve
- ✅ `interrupt` 立即清空隊列並停止當前動畫

---

### 1.3 支援的動畫類型（P1 階段）

**契約要求**:
- ✅ P1 階段僅實作 2 種基礎動畫
- ✅ 使用 Vue Transition + CSS 實作（零外部依賴）
- ✅ P3 階段擴展 3 種複雜動畫（延後決定技術方案）

**AnimationType 定義**:

```typescript
type AnimationType =
  // P1 階段（MVP）
  | 'DEAL_CARDS'      // 發牌動畫
  | 'CARD_MOVE'       // 卡片移動動畫
  // P3 階段（Post-MVP）
  | 'MATCH_HIGHLIGHT' // 配對高亮閃爍
  | 'YAKU_FORMED'     // 役種形成發光
  | 'SCORE_UPDATE';   // 分數滾動動畫
```

---

### 1.4 動畫參數契約

#### 1.4.1 DEAL_CARDS 參數

**用途**: 發牌時卡片從牌堆飛向各區域。

```typescript
interface DealCardsParams {
  cards: {
    cardId: string;
    targetZone: Zone;
  }[];
  delay: number;       // 每張卡片延遲（ms，例如 100）
  duration: number;    // 單張卡片動畫時長（ms，例如 500）
}

type Zone =
  | 'player-hand'
  | 'opponent-hand'
  | 'field'
  | 'player-depository'
  | 'opponent-depository'
  | 'deck';
```

**契約要求**:
- ✅ `cards` 陣列長度 <= 16（最多發 16 張牌）
- ✅ `delay` 為正整數（建議 50-200ms）
- ✅ `duration` 為正整數（建議 300-800ms）
- ✅ 所有卡片依序飛行（第 N 張延遲 N * delay）

**視覺效果**:
```
牌堆 → (延遲 0ms) → 玩家手牌第 1 張
牌堆 → (延遲 100ms) → 玩家手牌第 2 張
牌堆 → (延遲 200ms) → 場牌第 1 張
...
```

---

#### 1.4.2 CARD_MOVE 參數

**用途**: 單張卡片從 A 點移動到 B 點（打牌、配對）。

```typescript
interface CardMoveParams {
  cardId: string;
  from: Zone;
  to: Zone;
  duration: number;    // 動畫時長（ms，例如 500）
}
```

**契約要求**:
- ✅ `cardId` 必須為 4 位數字字串
- ✅ `from` 與 `to` 必須為不同的 Zone
- ✅ `duration` 為正整數（建議 300-800ms）

**視覺效果**:
```
玩家手牌 (from) → 場牌 (to)：卡片平滑移動
場牌 (from) → 玩家獲得區 (to)：卡片平滑移動
```

---

#### 1.4.3 MATCH_HIGHLIGHT 參數（P3 階段）

**用途**: 配對成功時兩張牌同時閃爍。

```typescript
interface MatchHighlightParams {
  cardIds: [string, string];  // 必須為 2 張牌
  flashCount: number;          // 閃爍次數（例如 3）
  flashDuration: number;       // 單次閃爍時長（ms，例如 200）
}
```

**契約要求**:
- ✅ `cardIds` 長度必須為 2
- ✅ `flashCount` 為正整數（建議 2-5 次）
- ✅ 總時長 = `flashCount * flashDuration * 2`

---

#### 1.4.4 YAKU_FORMED 參數（P3 階段）

**用途**: 役種形成時相關牌發光。

```typescript
interface YakuFormedParams {
  yakuName: string;            // 役種名稱（顯示文字）
  cardIds: string[];           // 相關卡片 ID 列表
  duration: number;            // 發光持續時間（ms，例如 1000）
}
```

**契約要求**:
- ✅ `cardIds` 長度 >= 2
- ✅ `duration` 為正整數（建議 800-1500ms）
- ✅ 同時顯示役種名稱浮動文字

---

#### 1.4.5 SCORE_UPDATE 參數（P3 階段）

**用途**: 分數從舊值滾動到新值。

```typescript
interface ScoreUpdateParams {
  playerId: string;
  fromScore: number;
  toScore: number;
  duration: number;            // 滾動時長（ms，例如 800）
}
```

**契約要求**:
- ✅ `fromScore` 與 `toScore` 必須為非負整數
- ✅ `toScore > fromScore`（分數增加）
- ✅ `duration` 為正整數（建議 600-1000ms）
- ✅ 使用 CountUp 效果（逐步遞增）

---

### 1.5 動畫執行契約

#### 1.5.1 trigger 方法實作

**契約要求**:
- ✅ 將動畫加入 `AnimationQueue`（不立即執行）
- ✅ 返回 Promise（動畫完成後 resolve）
- ✅ 若動畫被中斷，Promise reject（`InterruptedError`）

**實作範例**:
```typescript
async trigger(type: AnimationType, params: AnimationParams): Promise<void> {
  const animation: Animation = {
    id: crypto.randomUUID(),
    type,
    params,
    status: 'pending',
  };

  return new Promise((resolve, reject) => {
    animation.callback = () => {
      if (animation.status === 'completed') {
        resolve();
      } else if (animation.status === 'interrupted') {
        reject(new InterruptedError());
      }
    };

    this.queue.enqueue(animation);
  });
}
```

---

#### 1.5.2 interrupt 方法實作

**契約要求**:
- ✅ 立即清空 `AnimationQueue`
- ✅ 停止當前執行的動畫（設定 `status = 'interrupted'`）
- ✅ 調用所有動畫的 callback（觸發 reject）

**實作範例**:
```typescript
interrupt(): void {
  this.queue.interrupt();
}
```

---

### 1.6 動畫實作方式（P1 階段）

#### 1.6.1 使用 Vue Transition

**契約要求**:
- ✅ 使用 `<Transition>` 或 `<TransitionGroup>` 組件
- ✅ 定義 CSS transition 類名（`.card-move-enter-active`、`.card-move-leave-active`）
- ✅ 使用 CSS `transform` 與 `opacity` 屬性（GPU 加速）

**範例**:

```vue
<template>
  <TransitionGroup name="card-move" tag="div">
    <CardComponent
      v-for="card in visibleCards"
      :key="card.id"
      :cardId="card.id"
    />
  </TransitionGroup>
</template>

<style scoped>
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

/* Move 動畫 */
.card-move-move {
  transition: transform 0.5s;
}
</style>
```

---

#### 1.6.2 手動觸發動畫

**契約要求**:
- ✅ 動畫由 `AnimationService` 觸發（不依賴組件內狀態變化）
- ✅ 使用 `ref` + 響應式狀態控制動畫執行
- ✅ 動畫完成後調用 `callback`

**實作範例**:
```typescript
private async executeAnimation(animation: Animation): Promise<void> {
  animation.status = 'running';

  if (animation.type === 'CARD_MOVE') {
    const params = animation.params as CardMoveParams;

    // 設定卡片初始位置（from Zone）
    const cardElement = document.querySelector(`[data-card-id="${params.cardId}"]`);
    if (!cardElement) {
      animation.status = 'completed';
      animation.callback?.();
      return;
    }

    // 觸發 CSS transition
    cardElement.classList.add('moving');
    cardElement.style.transition = `transform ${params.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    cardElement.style.transform = `translate(${targetX}px, ${targetY}px)`;

    // 等待動畫完成
    await sleep(params.duration);

    // 清理
    cardElement.classList.remove('moving');
    animation.status = 'completed';
    animation.callback?.();
  }
}
```

---

## 2. AnimationQueue 契約

### 2.1 職責定義

**契約要求**:
- ✅ FIFO 佇列管理（先進先出）
- ✅ 同時只執行一個動畫
- ✅ 前一個完成後自動執行下一個
- ✅ 支援中斷（清空隊列並停止當前動畫）

---

### 2.2 類別定義

```typescript
class AnimationQueue {
  private queue: Animation[];
  private isPlaying: boolean;
  private currentAnimation: Animation | null;

  constructor();

  enqueue(animation: Animation): void;
  interrupt(): void;
  isEmpty(): boolean;
  size(): number;

  private async playNext(): Promise<void>;
  private async play(animation: Animation): Promise<void>;
}
```

---

### 2.3 Animation 實體契約

```typescript
interface Animation {
  id: string;                  // UUID
  type: AnimationType;
  params: AnimationParams;
  status: 'pending' | 'running' | 'completed' | 'interrupted';
  callback?: () => void;       // 完成或中斷時調用
}
```

**契約要求**:
- ✅ `id` 使用 `crypto.randomUUID()` 生成
- ✅ `status` 初始值為 `'pending'`
- ✅ `callback` 在動畫完成或中斷時調用（觸發 Promise resolve/reject）

---

### 2.4 enqueue 方法契約

**契約要求**:
- ✅ 將動畫加入隊列尾部
- ✅ 若隊列為空且無動畫執行中，立即執行
- ✅ 否則等待前面的動畫完成

**實作範例**:
```typescript
enqueue(animation: Animation): void {
  this.queue.push(animation);
  if (!this.isPlaying) {
    this.playNext();
  }
}
```

---

### 2.5 playNext 方法契約

**契約要求**:
- ✅ 從隊列頭部取出動畫
- ✅ 執行動畫（調用 `play`）
- ✅ 動畫完成後遞迴調用 `playNext`（處理下一個）
- ✅ 隊列為空時設定 `isPlaying = false`

**實作範例**:
```typescript
private async playNext(): Promise<void> {
  if (this.queue.length === 0) {
    this.isPlaying = false;
    this.currentAnimation = null;
    return;
  }

  this.isPlaying = true;
  this.currentAnimation = this.queue.shift()!;

  await this.play(this.currentAnimation);

  this.playNext();  // 遞迴處理下一個
}
```

---

### 2.6 interrupt 方法契約

**契約要求**:
- ✅ 設定當前動畫的 `status = 'interrupted'`
- ✅ 調用當前動畫的 `callback`（觸發 reject）
- ✅ 清空隊列（設定所有動畫 `status = 'interrupted'`並調用 callback）
- ✅ 設定 `isPlaying = false`

**實作範例**:
```typescript
interrupt(): void {
  // 中斷當前動畫
  if (this.currentAnimation) {
    this.currentAnimation.status = 'interrupted';
    this.currentAnimation.callback?.();
    this.currentAnimation = null;
  }

  // 中斷隊列中的所有動畫
  this.queue.forEach(animation => {
    animation.status = 'interrupted';
    animation.callback?.();
  });

  this.queue = [];
  this.isPlaying = false;
}
```

---

## 3. 測試契約

### 3.1 單元測試要求

**必須測試的場景**（AnimationService）:
1. ✅ `trigger` 將動畫加入隊列
2. ✅ 動畫依序執行（FIFO）
3. ✅ `interrupt` 停止當前動畫並清空隊列
4. ✅ Promise 在動畫完成後 resolve
5. ✅ Promise 在動畫中斷後 reject

**必須測試的場景**（AnimationQueue）:
1. ✅ `enqueue` 加入隊列
2. ✅ `playNext` 依序執行動畫
3. ✅ `interrupt` 清空隊列
4. ✅ `isEmpty` 與 `size` 正確

**測試覆蓋率目標**: > 70%

**測試範例**:
```typescript
describe('AnimationQueue', () => {
  it('should execute animations in FIFO order', async () => {
    const queue = new AnimationQueue();
    const executionOrder: string[] = [];

    const animation1 = {
      id: '1',
      type: 'CARD_MOVE',
      params: {},
      status: 'pending',
      callback: () => executionOrder.push('1'),
    };

    const animation2 = {
      id: '2',
      type: 'CARD_MOVE',
      params: {},
      status: 'pending',
      callback: () => executionOrder.push('2'),
    };

    queue.enqueue(animation1);
    queue.enqueue(animation2);

    await waitFor(() => expect(executionOrder).toEqual(['1', '2']));
  });

  it('should interrupt all animations', async () => {
    const queue = new AnimationQueue();
    const callbacks = [vi.fn(), vi.fn(), vi.fn()];

    callbacks.forEach((callback, i) => {
      queue.enqueue({
        id: `${i}`,
        type: 'CARD_MOVE',
        params: {},
        status: 'pending',
        callback,
      });
    });

    queue.interrupt();

    expect(queue.isEmpty()).toBe(true);
    callbacks.forEach(callback => expect(callback).toHaveBeenCalled());
  });
});
```

---

## 4. 效能契約

### 4.1 動畫幀率

**契約要求**:
- ✅ 動畫執行時保持 > 50 FPS（目標 60 FPS）
- ✅ 使用 GPU 加速的 CSS 屬性（`transform`、`opacity`）
- ✅ 避免觸發 Layout/Reflow（不使用 `width`、`height`、`top`、`left`）

**測量方法**:
- 使用 Chrome DevTools Performance 工具
- 記錄動畫執行期間的 FPS
- 檢查是否有掉幀（Frame Drops）

---

### 4.2 記憶體管理

**契約要求**:
- ✅ 動畫完成後清理 DOM 狀態（移除 class、重置 style）
- ✅ 中斷時正確釋放所有動畫對象
- ✅ 不累積歷史動畫（隊列僅保留待執行動畫）

---

## 5. 錯誤處理契約

### 5.1 動畫執行失敗

**契約要求**:
- ✅ 若目標元素不存在（`querySelector` 返回 `null`），跳過動畫並標記為 `completed`
- ✅ 若 CSS transition 失敗，捕獲錯誤並標記為 `completed`
- ✅ 記錄錯誤到 Console（`console.error`）但不中斷隊列

**實作範例**:
```typescript
private async play(animation: Animation): Promise<void> {
  try {
    await this.executeAnimation(animation);
    animation.status = 'completed';
  } catch (error) {
    console.error('動畫執行失敗', { animation, error });
    animation.status = 'completed';  // 標記為完成（避免卡住）
  } finally {
    animation.callback?.();
  }
}
```

---

### 5.2 InterruptedError

**契約要求**:
- ✅ 定義自訂錯誤類別 `InterruptedError`
- ✅ Promise reject 時使用此錯誤

```typescript
export class InterruptedError extends Error {
  constructor() {
    super('Animation interrupted');
    this.name = 'InterruptedError';
  }
}
```

---

## 6. 日誌記錄契約

### 6.1 日誌層級

**契約要求**:
- ✅ 動畫開始：`console.info`（開發模式，生產環境可關閉）
- ✅ 動畫完成：`console.info`（開發模式）
- ✅ 動畫中斷：`console.warn`
- ✅ 動畫失敗：`console.error`

**範例**:
```typescript
console.info('[Animation] Start', { type: animation.type, params: animation.params });
console.info('[Animation] Complete', { id: animation.id, duration: elapsed });
console.warn('[Animation] Interrupted', { id: animation.id });
console.error('[Animation] Failed', { animation, error });
```

---

## 總結

本契約定義了動畫系統的完整實作規範，確保：

✅ 正確實作 `TriggerUIEffectPort.triggerAnimation` 方法
✅ FIFO 隊列管理（依序執行動畫）
✅ 支援動畫中斷（快照恢復時清空隊列）
✅ P1 階段使用 Vue Transition + CSS（零外部依賴）
✅ 動畫幀率 > 50 FPS（目標 60 FPS）
✅ 達到 70% 以上的測試覆蓋率

所有實作必須通過契約測試後才能整合到系統中。
