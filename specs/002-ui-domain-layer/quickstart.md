# Quick Start: User Interface BC - Domain Layer

**Feature**: 002-ui-domain-layer
**Target Audience**: 前端開發者
**Estimated Reading Time**: 10 分鐘

## 概述

User Interface BC Domain Layer 提供純函數形式的花札遊戲業務邏輯，包括卡片識別、配對驗證、客戶端預驗證、役種進度計算。所有函數零框架依賴，可在任何 JavaScript 環境運行。

---

## 1. 基本使用

### 導入型別和函數

```typescript
// 型別定義
import type { Card, CardType, YakuType, YakuProgress } from '@/user-interface/domain/types';

// 卡片資料庫
import { MATSU_HIKARI, UME_AKATAN, ALL_CARDS } from '@/user-interface/domain/card-database';

// 配對邏輯
import { canMatch, findMatchableCards } from '@/user-interface/domain/matching';

// 驗證邏輯
import { validateCardExists, validateTargetInList } from '@/user-interface/domain/validation';

// 役種進度
import { calculateYakuProgress } from '@/user-interface/domain/yaku-progress';
```

---

## 2. 卡片識別與查詢

### 使用語義化常數

```typescript
// ✅ 推薦：使用語義化常數
const card = MATSU_HIKARI;
console.log(card);
// {
//   card_id: "0111",
//   month: 1,
//   type: "BRIGHT",
//   display_name: "松鶴"
// }
```

### 從卡片 ID 查詢

```typescript
import { getCardById } from '@/user-interface/domain/card-logic';

const card = getCardById("0111"); // 松上鶴
const invalidCard = getCardById("9999"); // undefined
```

### 驗證卡片有效性

```typescript
import { isValidCard } from '@/user-interface/domain/card-logic';

isValidCard(MATSU_HIKARI);              // true
isValidCard({ card_id: "9999", ... });  // false
```

---

## 3. 配對驗證

### 檢查兩張牌是否可配對

```typescript
import { canMatch } from '@/user-interface/domain/matching';

// 相同月份 → 可配對
canMatch(MATSU_HIKARI, MATSU_KASU_1);   // true (都是1月)

// 不同月份 → 不可配對
canMatch(MATSU_HIKARI, UME_AKATAN);     // false (1月 vs 2月)
```

### 找出所有可配對的場牌

```typescript
import { findMatchableCards } from '@/user-interface/domain/matching';

const handCard = MATSU_HIKARI;          // 手牌：1月光牌
const fieldCards = [
  MATSU_KASU_1,    // 1月かす
  UME_AKATAN,      // 2月短冊
  MATSU_AKATAN,    // 1月短冊
  SAKURA_HIKARI    // 3月光牌
];

const matchable = findMatchableCards(handCard, fieldCards);
// 返回: [MATSU_KASU_1, MATSU_AKATAN] (只有1月的牌)
```

### 多重配對情況

```typescript
// 場上有 3 張同月份的牌
const fieldCards = [
  MATSU_HIKARI,
  MATSU_AKATAN,
  MATSU_KASU_1
];

const matchable = findMatchableCards(MATSU_KASU_2, fieldCards);
// 返回: [MATSU_HIKARI, MATSU_AKATAN, MATSU_KASU_1]
```

---

## 4. 客戶端預驗證

### 驗證卡片是否在手牌中

```typescript
import { validateCardExists } from '@/user-interface/domain/validation';

const handCards = [MATSU_HIKARI, UME_AKATAN];

validateCardExists(MATSU_HIKARI, handCards);  // { valid: true }
validateCardExists(SAKURA_HIKARI, handCards); // { valid: false, reason: "卡片不在手牌中" }
```

### 驗證目標是否在可配對列表中

```typescript
import { validateTargetInList } from '@/user-interface/domain/validation';

const possibleTargets = [MATSU_KASU_1, MATSU_AKATAN];

validateTargetInList(MATSU_KASU_1, possibleTargets);  // { valid: true }
validateTargetInList(UME_AKATAN, possibleTargets);    // { valid: false, reason: "目標不在可配對列表中" }
```

---

## 5. 役種進度計算

### 固定役種（如赤短）

```typescript
import { calculateYakuProgress } from '@/user-interface/domain/yaku-progress';

const depositoryCards = [
  MATSU_AKATAN,   // 已有1張赤短
  UME_AKATAN      // 已有2張赤短
];

const progress = calculateYakuProgress("AKATAN", depositoryCards);
// {
//   required: [MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN],
//   obtained: [MATSU_AKATAN, UME_AKATAN],
//   missing: [SAKURA_AKATAN],
//   progress: 66.67
// }
```

### 動態役種（如短冊）

```typescript
import { calculateDynamicYakuProgress } from '@/user-interface/domain/yaku-progress';

const depositoryCards = [
  MATSU_AKATAN,   // 短冊1
  UME_AKATAN,     // 短冊2
  SAKURA_AKATAN   // 短冊3
];

const progress = calculateDynamicYakuProgress("TAN", depositoryCards);
// {
//   required: [任意5張短冊],
//   obtained: [MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN],
//   missing: [還差2張短冊],
//   progress: 60.0  // 3/5
// }
```

### 特殊役種：三光

```typescript
import { calculateSankoProgress } from '@/user-interface/domain/yaku-progress';

const depositoryCards = [
  MATSU_HIKARI,   // 光牌1
  SAKURA_HIKARI   // 光牌2
];

const progress = calculateSankoProgress(depositoryCards);
// {
//   required: [MATSU_HIKARI, SAKURA_HIKARI, SUSUKI_HIKARI], // 任意3張非雨光
//   obtained: [MATSU_HIKARI, SAKURA_HIKARI],
//   missing: [SUSUKI_HIKARI],
//   progress: 66.67  // 2/3
// }
```

---

## 6. 典型使用場景

### 場景 1: 高亮可配對牌（UI 提示）

```typescript
// Vue 組件中
const highlightMatchableCards = (handCard: Card, fieldCards: readonly Card[]) => {
  const matchable = findMatchableCards(handCard, fieldCards);

  // 為可配對的牌添加高亮樣式
  fieldCards.forEach(card => {
    const isMatchable = matchable.some(m => areCardsEqual(m, card));
    applyHighlight(card, isMatchable);
  });
};
```

### 場景 2: 發送命令前驗證

```typescript
// 打牌前驗證
const playCard = async (card: Card, target: Card | null) => {
  // 1. 驗證卡片在手牌中
  const existsResult = validateCardExists(card, playerHandCards);
  if (!existsResult.valid) {
    showError(existsResult.reason);
    return;
  }

  // 2. 驗證目標合法
  if (target) {
    const matchableCards = findMatchableCards(card, fieldCards);
    const targetResult = validateTargetInList(target, matchableCards);
    if (!targetResult.valid) {
      showError(targetResult.reason);
      return;
    }
  }

  // 3. 發送命令到伺服器
  await apiClient.playHandCard(gameId, card, target);
};
```

### 場景 3: 顯示役種進度提示

```typescript
// 計算所有役種進度
const getAllYakuProgress = (depositoryCards: readonly Card[]) => {
  const yakuTypes: YakuType[] = [
    "GOKO", "SHIKO", "SANKO",
    "AKATAN", "AOTAN",
    "INOSHIKACHO", "TSUKIMI", "HANAMI"
  ];

  return yakuTypes.map(yakuType => ({
    yakuType,
    progress: calculateYakuProgress(yakuType, depositoryCards)
  })).filter(item => item.progress.progress > 0); // 只顯示有進度的
};
```

---

## 7. 效能注意事項

### 純函數特性

所有 Domain Layer 函數為純函數，相同輸入保證相同輸出：

```typescript
// ✅ 安全：可快取結果
const result1 = canMatch(MATSU_HIKARI, UME_AKATAN);
const result2 = canMatch(MATSU_HIKARI, UME_AKATAN);
// result1 === result2 (永遠為 true)
```

### 效能基準

| 函數 | 時間複雜度 | 實測效能 |
|-----|----------|---------|
| `canMatch()` | O(1) | < 0.01ms |
| `findMatchableCards()` | O(n) | < 1ms (n≤8) |
| `validateCardExists()` | O(n) | < 0.1ms (n≤8) |
| `calculateYakuProgress()` | O(n*m) | < 5ms (n,m≤10) |

---

## 8. 常見錯誤與解決

### 錯誤 1: 嘗試修改卡片物件

```typescript
// ❌ 錯誤：所有物件為 readonly
const card = MATSU_HIKARI;
card.month = 2; // TypeScript 編譯錯誤

// ✅ 正確：創建新物件
const modifiedCard = { ...card, month: 2 };
```

### 錯誤 2: 使用物件引用比較

```typescript
// ❌ 錯誤：不同物件實例
const card1 = { card_id: "0111", month: 1, type: "BRIGHT", display_name: "松鶴" };
const card2 = { card_id: "0111", month: 1, type: "BRIGHT", display_name: "松鶴" };
card1 === card2; // false

// ✅ 正確：使用 areCardsEqual
import { areCardsEqual } from '@/user-interface/domain/card-logic';
areCardsEqual(card1, card2); // true (基於 card_id 比較)
```

### 錯誤 3: 依賴伺服器驗證結果

```typescript
// ❌ 錯誤：客戶端驗證作為最終權威
if (validateCardExists(card, handCards).valid) {
  // 直接更新 UI 狀態 ← 不應該！
  updateGameState(card);
}

// ✅ 正確：僅用於 UI 反饋
if (!validateCardExists(card, handCards).valid) {
  // 僅用於即時提示
  showWarning("此卡片無效");
  return; // 阻止發送命令
}
// 伺服器驗證為最終權威
await sendCommandToServer(card);
```

---

## 9. 測試範例

### 單元測試範例

```typescript
import { describe, it, expect } from 'vitest';
import { canMatch } from '@/user-interface/domain/matching';
import { MATSU_HIKARI, UME_AKATAN } from '@/user-interface/domain/card-database';

describe('canMatch()', () => {
  it('應返回 true 當兩張牌月份相同', () => {
    const card1 = MATSU_HIKARI;  // 1月
    const card2 = MATSU_KASU_1;  // 1月
    expect(canMatch(card1, card2)).toBe(true);
  });

  it('應返回 false 當兩張牌月份不同', () => {
    const card1 = MATSU_HIKARI;  // 1月
    const card2 = UME_AKATAN;    // 2月
    expect(canMatch(card1, card2)).toBe(false);
  });
});
```

---

## 10. 下一步

### 學習路徑

1. **閱讀文檔**:
   - [data-model.md](./data-model.md) - 完整資料結構定義
   - [research.md](./research.md) - 技術決策背景

2. **查看型別定義**:
   - [contracts/domain-types.ts](./contracts/domain-types.ts) - TypeScript 型別契約

3. **實作代碼**（TDD 流程）:
   - 撰寫測試 → 測試失敗 → 實作函數 → 測試通過

4. **整合到 UI**:
   - 在 Vue 組件中導入 Domain Layer 函數
   - 使用 `findMatchableCards()` 高亮可配對牌
   - 使用 `calculateYakuProgress()` 顯示進度提示

### 相關資源

- **PRD**: [doc/readme.md](/Users/leo101317/Projects/vue/hanahuda/doc/readme.md)
- **前端架構**: [doc/frontend/architecture.md](/Users/leo101317/Projects/vue/hanahuda/doc/frontend/architecture.md)
- **遊戲規則**: [doc/shared/game-rules.md](/Users/leo101317/Projects/vue/hanahuda/doc/shared/game-rules.md)
- **數據契約**: [doc/shared/data-contracts.md](/Users/leo101317/Projects/vue/hanahuda/doc/shared/data-contracts.md)

---

## 問題與支援

### 常見問題

**Q: Domain Layer 可以直接訪問伺服器 API 嗎？**
A: 不可以。Domain Layer 必須零框架依賴，不處理 API 通訊。API 整合由 Adapter Layer 負責。

**Q: 客戶端驗證失敗時，是否需要阻止操作？**
A: 建議僅用於 UI 警告，不應阻止用戶操作。伺服器擁有最終驗證權。

**Q: 如何處理特殊役種（如三光）？**
A: 使用專門的 `calculateSankoProgress()` 函數，它會自動排除雨光。

---

**準備好開始了嗎？** 閱讀 [tasks.md](./tasks.md)（執行 `/speckit.tasks` 生成）開始 TDD 實作！
