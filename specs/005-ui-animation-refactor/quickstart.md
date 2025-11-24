# Quickstart: UI Animation Refactor

**Feature**: 005-ui-animation-refactor
**Date**: 2025-11-21

本文檔提供快速開始實作的指南，包含開發環境設置、關鍵路徑和實作順序。

---

## Prerequisites

### 開發環境
- Node.js 18+
- npm 9+
- VS Code（推薦）

### 專案設置
```bash
cd front-end
npm install
```

### 確認依賴
```bash
# 確認 @vueuse/motion 已安裝
npm list @vueuse/motion
```

---

## Quick Start by Priority

### P1: 獲得區分組（1-2 小時）

**目標**: 在獲得區按卡片類型分組顯示

**關鍵檔案**:
- `src/user-interface/adapter/stores/gameState.ts` - 新增 computed
- `src/views/GamePage/components/DepositoryZone.vue` - 重構組件

**步驟**:
1. 在 gameState.ts 新增 `groupedMyDepository` computed
2. 重構 DepositoryZone.vue 使用分組資料
3. 測試四種類型分組顯示

```typescript
// gameState.ts
const groupedMyDepository = computed(() => ({
  BRIGHT: myDepository.value.filter(id => getCardType(id) === 'BRIGHT'),
  ANIMAL: myDepository.value.filter(id => getCardType(id) === 'ANIMAL'),
  RIBBON: myDepository.value.filter(id => getCardType(id) === 'RIBBON'),
  PLAIN: myDepository.value.filter(id => getCardType(id) === 'PLAIN'),
}))
```

---

### P2: Output Ports 重構（3-4 小時）

**目標**: 拆分 TriggerUIEffectPort 為 AnimationPort + NotificationPort

**關鍵檔案**:
- `src/user-interface/application/ports/output/` - 新增 Port 定義
- `src/user-interface/adapter/di/tokens.ts` - 新增 tokens
- `src/user-interface/adapter/di/registry.ts` - 註冊新 adapters

**步驟**:
1. 定義新 Port 介面
   ```typescript
   // animation.port.ts
   // ⚠️ 注意：Port 介面不包含 Zone 註冊（那是 Adapter 層職責）
   export interface AnimationPort {
     // 動畫方法（可 await，純語意化）
     playDealAnimation(params: DealAnimationParams): Promise<void>  // 回合開始批量發牌
     playCardToFieldAnimation(cardId: string, fromHand: boolean): Promise<void>  // 手牌打到場上
     playMatchAnimation(handCardId: string, fieldCardId: string): Promise<void>  // 配對合併
     playToDepositoryAnimation(cardIds: string[], targetType: CardType): Promise<void>  // 移至獲得區
     playFlipFromDeckAnimation(cardId: string): Promise<void>  // 翻牌階段單張翻牌

     // 控制
     interrupt(): void
     isAnimating(): boolean

     // Zone 註冊不在此 Port 中，由 Adapter 層內部 ZoneRegistry 處理
   }

   // notification.port.ts
   export interface NotificationPort {
     showSelectionUI(possibleTargets: string[]): void
     hideSelectionUI(): void
     showDecisionModal(currentYaku: YakuScore[], currentScore: number): void
     showGameFinishedUI(winnerId: string, finalScores: PlayerScore[], isPlayerWinner: boolean): void
     showRoundDrawnUI(currentTotalScores: PlayerScore[]): void
     showErrorMessage(message: string): void
     showReconnectionMessage(): void
   }
   ```

2. 新增 DI tokens
   ```typescript
   // tokens.ts
   export const TOKENS = {
     // ... existing
     AnimationPort: Symbol('AnimationPort'),
     NotificationPort: Symbol('NotificationPort'),
   }
   ```

3. 實作 Adapters（暫時包裝現有實作）
4. 更新 Use Cases 注入
5. 標記 TriggerUIEffectPort 為 @deprecated

---

### P3: 牌堆視圖（1-2 小時）

**目標**: 顯示牌堆組件和剩餘牌數

**關鍵檔案**:
- `src/views/GamePage/components/DeckZone.vue` - 新增組件
- `src/views/GamePage/GamePage.vue` - 整合組件

**步驟**:
1. 創建 DeckZone.vue 組件
2. 從 gameState 讀取 deckRemaining
3. 實作視覺堆疊效果
4. 整合到 GamePage

```vue
<!-- DeckZone.vue -->
<template>
  <div class="deck-zone">
    <div class="deck-stack">
      <div v-for="i in visualLayers" :key="i" class="deck-card" />
    </div>
    <span class="deck-count">{{ remaining }}</span>
  </div>
</template>
```

---

### P4: 動畫系統重構（4-6 小時）

**目標**: 實作 AnimationPort，支援位置追蹤和實際動畫

**關鍵檔案**:
- `src/user-interface/adapter/animation/ZoneRegistry.ts` - 新增
- `src/user-interface/adapter/animation/AnimationService.ts` - 重構
- `src/user-interface/adapter/animation/AnimationPortAdapter.ts` - 新增

**步驟**:
1. 實作 ZoneRegistry
   ```typescript
   export class ZoneRegistry {
     private zones = new Map<string, ZoneData>()

     register(zoneName: string, element: HTMLElement) {
       const observer = new ResizeObserver(() => this.updatePosition(zoneName))
       observer.observe(element)
       // ...
     }
   }
   ```

2. 重構 AnimationService 使用 ZoneRegistry
3. 實作 AnimationPortAdapter
4. 在組件 onMounted 中註冊區域

---

### P5: 配對動畫（2-3 小時）

**目標**: 配對成功時的卡片移動動畫

**關鍵檔案**:
- `src/user-interface/adapter/animation/AnimationPortAdapter.ts`
- Use Cases 整合

**步驟**:
1. 實作 playMatchAnimation
2. 實作 playToDepositoryAnimation

---

### P6: 發牌動畫（2-3 小時）

**目標**: 回合開始時的發牌動畫

**步驟**:
1. 實作 playDealAnimation
2. 更新 HandleRoundDealtUseCase
3. 測試時序控制

---

### P7: 拖曳配對（3-4 小時）

**目標**: 支援拖曳手牌配對

**關鍵檔案**:
- `src/views/GamePage/components/CardComponent.vue`
- `src/views/GamePage/components/FieldZone.vue`

**步驟**:
1. 在 CardComponent 加入 draggable
2. 在 FieldZone 加入 drop target
3. 實作拖曳視覺效果
4. 整合 PlayHandCardUseCase

---

## Testing Commands

```bash
# 執行所有測試
npm run test:unit

# 執行動畫相關測試
npm run test:unit -- --run tests/adapter/animation/

# 執行特定測試檔案
npm run test:unit -- --run tests/adapter/animation/ZoneRegistry.spec.ts

# 型別檢查
npm run type-check
```

---

## Key Integration Points

### 1. DI Container
```typescript
// registry.ts - 新增註冊
container.register(TOKENS.AnimationPort, () => new AnimationPortAdapter(
  container.get(TOKENS.AnimationService),
  container.get(TOKENS.ZoneRegistry)
))
```

### 2. Use Case 更新模式
```typescript
// 舊
class SomeUseCase {
  constructor(private triggerEffect: TriggerUIEffectPort) {}
}

// 新
class SomeUseCase {
  constructor(
    private animation: AnimationPort,
    private notification: NotificationPort
  ) {}
}
```

### 3. 組件區域註冊（Adapter 層專用）

> ⚠️ **注意**：Zone 註冊是 Adapter 層的內部機制，不經過 AnimationPort。
> 使用 Adapter 層提供的 composable 或直接注入 ZoneRegistry。

```typescript
// 方式 1：使用 composable（推薦）
import { useZoneRegistration } from '@/user-interface/adapter/composables/useZoneRegistration'

// 在區域組件中
const fieldRef = ref<HTMLElement | null>(null)
useZoneRegistration('field', fieldRef)  // 自動處理 register/unregister

// 方式 2：直接使用 ZoneRegistry（進階）
import { zoneRegistry } from '@/user-interface/adapter/animation/ZoneRegistry'

onMounted(() => {
  zoneRegistry.register('field', fieldRef.value!)
})

onUnmounted(() => {
  zoneRegistry.unregister('field')
})
```

---

## Common Pitfalls

1. **忘記 unregister zone**: 組件卸載時必須 unregister，否則會有 memory leak
2. **動畫未 await**: Use Case 中必須 await 動畫完成後再更新狀態
3. **位置計算錯誤**: 使用 getBoundingClientRect 要注意 scroll offset
4. **拖曳事件冒泡**: 注意 stopPropagation 避免意外觸發

---

## Verification Checklist

### P1 完成標準
- [x] 獲得區顯示四個分組
- [x] 每個分組顯示數量
- [x] 空分組保持佔位

### P2 完成標準
- [x] AnimationPort 介面定義完成
- [x] NotificationPort 介面定義完成
- [x] DI Container 更新完成
- [x] 編譯無錯誤

### P3 完成標準
- [x] 牌堆組件顯示
- [x] 剩餘牌數正確
- [x] 視覺堆疊效果

### P4 完成標準
- [x] ZoneRegistry 運作正常
- [x] 區域位置可查詢
- [x] 動畫使用實際座標

### P5 完成標準
- [x] 配對動畫流暢
- [x] 移動至獲得區動畫
- [x] 動畫完成後狀態更新

### P6 完成標準
- [x] 發牌動畫依序播放
- [x] 總時長 < 2 秒
- [x] 支援中斷

### P7 完成標準
- [ ] 可拖曳手牌
- [ ] 高亮可配對目標
- [ ] 放置觸發配對
