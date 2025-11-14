# Research: User Interface BC - Domain Layer

**Feature**: 002-ui-domain-layer
**Date**: 2025-11-13
**Status**: Complete

## 研究目標

為 User Interface BC 的 Domain Layer 實作建立技術基礎，解決以下問題：

1. 卡片 ID 編碼規則和語義化命名策略
2. TypeScript 純函數設計最佳實踐
3. Vitest 測試策略和覆蓋率要求
4. 配對規則實作模式
5. 役種進度計算演算法（含特殊役種：三光）

---

## 1. 卡片 ID 編碼規則（MMTI 格式）

### 決策：使用 MMTI 4 位字串格式

**格式**: `MMTI`
- `MM`: 月份（01-12）
- `T`: 類型（1=BRIGHT, 2=ANIMAL, 3=RIBBON, 4=PLAIN）
- `I`: 索引（1-4，該月該類型的第幾張）

**範例**:
```typescript
"0111" // 1月(01) 光牌(1) 第1張(1) = 松上鶴
"0131" // 1月(01) 短冊(3) 第1張(1) = 松赤短
"0841" // 8月(08) かす(4) 第1張(1) = 芒かす1
```

### 理由

1. **契約一致性**: 完全符合 `doc/shared/protocol.md` 和 `doc/shared/data-contracts.md` 定義
2. **人類可讀**: 4 位數字比 UUID 或哈希值更易於調試
3. **唯一性**: 每張牌的 MMTI 組合唯一
4. **排序友好**: 字串排序自然按月份分組

### 替代方案（已拒絕）

- **UUID**: 過於冗長，不利於調試和日誌記錄
- **數字 ID (1-48)**: 缺乏語義，無法從 ID 推斷卡片屬性
- **哈希值**: 不可讀，增加認知負擔

---

## 2. 語義化常數命名策略

### 決策：月份羅馬拼音 + 特徵描述

**命名模式**: `{MONTH_ROMAJI}_{CHARACTERISTIC}`

**範例**:
```typescript
export const MATSU_HIKARI: Card = {
  card_id: "0111",
  month: 1,
  type: "BRIGHT",
  display_name: "松鶴"
};

export const HAGI_INO: Card = {
  card_id: "0721",
  month: 7,
  type: "ANIMAL",
  display_name: "萩豬"
};

export const UME_AKATAN: Card = {
  card_id: "0231",
  month: 2,
  type: "RIBBON",
  display_name: "梅赤短"
};
```

### 理由

1. **語義清晰**: 開發者無需查文檔即可理解卡片
2. **自動完成友好**: IDE 可按月份或特徵篩選
3. **文化保留**: 使用日文羅馬拼音保留原始文化背景
4. **避免衝突**: 月份+特徵組合確保唯一性

### 月份羅馬拼音映射

| 月份 | 日文 | 羅馬拼音 | 中文 |
|-----|------|---------|------|
| 1 | まつ | MATSU | 松 |
| 2 | うめ | UME | 梅 |
| 3 | さくら | SAKURA | 櫻 |
| 4 | ふじ | FUJI | 藤 |
| 5 | あやめ | AYAME | 菖蒲 |
| 6 | ぼたん | BOTAN | 牡丹 |
| 7 | はぎ | HAGI | 萩 |
| 8 | すすき | SUSUKI | 芒 |
| 9 | きく | KIKU | 菊 |
| 10 | もみじ | MOMIJI | 紅葉 |
| 11 | やなぎ | YANAGI | 柳 |
| 12 | きり | KIRI | 桐 |

### 特徵描述詞彙

| 類型 | 特徵 | 範例 |
|-----|------|------|
| BRIGHT | HIKARI（光） | MATSU_HIKARI |
| ANIMAL | 動物名（INO/CHOU/SHIKA/TSURU等） | HAGI_INO, BOTAN_CHOU |
| RIBBON | AKATAN/AOTAN/TAN | UME_AKATAN, KIKU_AOTAN |
| PLAIN | KASU_1, KASU_2 | MATSU_KASU_1 |

---

## 3. TypeScript 純函數設計最佳實踐

### 決策：嚴格不可變性 + 函數式編程模式

**核心原則**:
1. 所有函數為純函數（無副作用、可預測）
2. 所有參數和返回值使用 `readonly` 修飾
3. 優先使用陣列方法（`map`, `filter`, `reduce`）而非循環
4. 使用型別守衛（Type Guard）確保型別安全

**範例**:
```typescript
// ✅ 正確：純函數，readonly 參數
export function findMatchableCards(
  handCard: Readonly<Card>,
  fieldCards: readonly Card[]
): readonly Card[] {
  return fieldCards.filter(fieldCard =>
    canMatch(handCard, fieldCard)
  );
}

// ❌ 錯誤：修改參數
export function removeCard(cards: Card[], cardToRemove: Card): Card[] {
  const index = cards.indexOf(cardToRemove);
  cards.splice(index, 1); // 副作用！
  return cards;
}

// ✅ 正確：返回新陣列
export function removeCard(
  cards: readonly Card[],
  cardToRemove: Readonly<Card>
): readonly Card[] {
  return cards.filter(card => !areCardsEqual(card, cardToRemove));
}
```

### 理由

1. **可測試性**: 純函數易於測試，無需 mock 外部狀態
2. **可預測性**: 相同輸入保證相同輸出
3. **並發安全**: 無副作用，天然支援並行計算
4. **框架無關**: 可在任何 JavaScript 環境運行

### 替代方案（已拒絕）

- **類別導向設計**: 增加複雜度，依賴 OOP 概念
- **可變狀態管理**: 增加測試難度，降低可預測性

---

## 4. 配對規則實作模式

### 決策：月份相等檢查 + 陣列過濾

**核心邏輯**:
```typescript
export function canMatch(
  card1: Readonly<Card>,
  card2: Readonly<Card>
): boolean {
  return card1.month === card2.month;
}

export function findMatchableCards(
  handCard: Readonly<Card>,
  fieldCards: readonly Card[]
): readonly Card[] {
  return fieldCards.filter(fieldCard =>
    canMatch(handCard, fieldCard)
  );
}
```

**處理多重配對**:
- 0 個配對: 返回空陣列 `[]`
- 1 個配對: 返回單元素陣列 `[card]`
- 2-3 個配對: 返回多元素陣列 `[card1, card2, ...]`

### 理由

1. **簡單性**: 配對規則僅基於月份，邏輯極簡
2. **效能**: `filter` 時間複雜度 O(n)，場牌最多 8 張
3. **可讀性**: 意圖清晰，易於維護

### 邊界情況處理

| 情況 | 處理方式 | 範例 |
|-----|---------|------|
| 空場牌 | 返回空陣列 | `findMatchableCards(card, []) => []` |
| 無配對 | 返回空陣列 | 手牌 1 月，場牌全 2 月 => `[]` |
| 多重配對 | 返回所有配對 | 手牌 1 月，場牌 3 張 1 月 => `[card1, card2, card3]` |

---

## 5. 役種進度計算演算法

### 決策：基於集合差集運算 + 特殊役種規則

**核心邏輯**:
```typescript
export interface YakuProgress {
  readonly required: readonly Card[];      // 所需卡片
  readonly obtained: readonly Card[];      // 已獲得卡片
  readonly missing: readonly Card[];       // 缺少卡片
  readonly progress: number;               // 完成百分比 (0-100)
}

export function calculateYakuProgress(
  yakuType: YakuType,
  depositoryCards: readonly Card[]
): YakuProgress {
  const required = YAKU_REQUIREMENTS[yakuType];
  const obtained = required.filter(reqCard =>
    depositoryCards.some(depCard =>
      areCardsEqual(reqCard, depCard)
    )
  );
  const missing = required.filter(reqCard =>
    !obtained.some(obtCard =>
      areCardsEqual(reqCard, obtCard)
    )
  );
  const progress = (obtained.length / required.length) * 100;

  return { required, obtained, missing, progress };
}
```

### 役種需求映射範例

```typescript
export const YAKU_REQUIREMENTS: Record<YakuType, readonly Card[]> = {
  // 短冊系
  AKATAN: [MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN],
  AOTAN: [BOTAN_AOTAN, KIKU_AOTAN, MOMIJI_AOTAN],

  // 光牌系
  GOKO: [MATSU_HIKARI, SAKURA_HIKARI, SUSUKI_HIKARI, YANAGI_HIKARI, KIRI_HIKARI],
  SHIKO: [MATSU_HIKARI, SAKURA_HIKARI, SUSUKI_HIKARI, KIRI_HIKARI], // 四光（不含雨）
  AMESHIKO: [MATSU_HIKARI, SAKURA_HIKARI, SUSUKI_HIKARI, YANAGI_HIKARI], // 雨四光（包含雨）
  SANKO: [MATSU_HIKARI, SAKURA_HIKARI, SUSUKI_HIKARI, KIRI_HIKARI], // 三光：任選3張，排除雨光

  // 種牌系
  INOSHIKACHO: [HAGI_INO, MOMIJI_SHIKA, BOTAN_CHOU],
  TSUKIMI_ZAKE: [SUSUKI_TSUKI, KIKU_SAKAZUKI],
  HANAMI_ZAKE: [SAKURA_MAKU, KIKU_SAKAZUKI],

  // ... 其他役種
};
```

### 特殊役種：三光（サンコウ）處理

三光有特殊規則：
- **需要**: 3 張光牌
- **排除**: 雨光（柳上小野道風 `YANAGI_HIKARI`）
- **邏輯**: 從 4 張非雨光牌中任選 3 張

**實作**:
```typescript
export function calculateSankoProgress(
  depositoryCards: readonly Card[]
): YakuProgress {
  const eligibleBrights = [
    MATSU_HIKARI,
    SAKURA_HIKARI,
    SUSUKI_HIKARI,
    KIRI_HIKARI
  ];

  const obtained = eligibleBrights.filter(reqCard =>
    depositoryCards.some(depCard =>
      areCardsEqual(reqCard, depCard)
    )
  );

  const required = eligibleBrights.slice(0, 3); // 需要任意 3 張
  const missing = obtained.length < 3
    ? eligibleBrights.slice(obtained.length, 3)
    : [];

  const progress = Math.min((obtained.length / 3) * 100, 100);

  return { required, obtained, missing, progress };
}
```

### 理由

1. **精確性**: 集合運算清晰表達「所需」、「已有」、「缺少」概念
2. **可擴展性**: 新增役種僅需增加映射條目
3. **效能**: 時間複雜度 O(n*m)，n、m 最多 10，可接受
4. **特殊規則**: 三光等特殊役種有專門處理函數

### 動態役種處理（短冊、かす）

```typescript
export function calculateDynamicYakuProgress(
  yakuType: "TAN" | "KASU",
  depositoryCards: readonly Card[]
): YakuProgress {
  const minRequired = yakuType === "TAN" ? 5 : 10;
  const typeFilter = yakuType === "TAN" ? "RIBBON" : "PLAIN";

  const obtained = depositoryCards.filter(card => card.type === typeFilter);
  const progress = Math.min((obtained.length / minRequired) * 100, 100);

  // 動態役種的 required 為任意該類型卡片
  const required = ALL_CARDS
    .filter(card => card.type === typeFilter)
    .slice(0, minRequired);

  const missing = obtained.length < minRequired
    ? required.slice(obtained.length, minRequired)
    : [];

  return { required, obtained, missing, progress };
}
```

---

## 6. Vitest 測試策略

### 決策：測試金字塔 + 100% 覆蓋率要求

**測試層級**:
1. **單元測試**: 每個純函數獨立測試
2. **整合測試**: N/A（Domain Layer 無外部依賴）
3. **E2E 測試**: N/A（由上層負責）

**覆蓋率目標**:
- 卡片邏輯: 100%（`card-database.ts`, `card-logic.ts`）
- 配對驗證: 100%（`matching.ts`）
- 客戶端驗證: 100%（`validation.ts`）
- 役種進度: > 90%（`yaku-progress.ts`）

**測試結構範例**:
```typescript
import { describe, it, expect } from 'vitest';
import { canMatch, findMatchableCards } from '@/user-interface/domain/matching';
import { MATSU_HIKARI, UME_AKATAN, MATSU_KASU_1 } from '@/user-interface/domain/card-database';

describe('matching.ts', () => {
  describe('canMatch()', () => {
    it('應返回 true 當兩張牌月份相同', () => {
      expect(canMatch(MATSU_HIKARI, MATSU_KASU_1)).toBe(true);
    });

    it('應返回 false 當兩張牌月份不同', () => {
      expect(canMatch(MATSU_HIKARI, UME_AKATAN)).toBe(false);
    });
  });

  describe('findMatchableCards()', () => {
    it('應返回空陣列當無配對', () => {
      const fieldCards = [UME_AKATAN];
      expect(findMatchableCards(MATSU_HIKARI, fieldCards)).toEqual([]);
    });

    it('應返回所有可配對的牌', () => {
      const fieldCards = [MATSU_KASU_1, UME_AKATAN, MATSU_AKATAN];
      const result = findMatchableCards(MATSU_HIKARI, fieldCards);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(MATSU_KASU_1);
      expect(result).toContainEqual(MATSU_AKATAN);
    });
  });
});
```

### 理由

1. **回歸防護**: 100% 覆蓋率防止未來修改破壞現有邏輯
2. **文檔作用**: 測試即文檔，展示函數預期行為
3. **快速反饋**: Vitest 提供即時測試反饋

### 邊界測試要求

每個函數必須測試:
- 正常路徑（Happy Path）
- 空輸入（`[]`, `null`, `undefined`）
- 邊界值（最小/最大）
- 錯誤輸入（無效卡片、超出範圍）

---

## 7. 卡片相等性判斷

### 決策：直接比較 card_id（唯一識別碼）

**實作**:
```typescript
export function areCardsEqual(
  card1: Readonly<Card>,
  card2: Readonly<Card>
): boolean {
  return card1.card_id === card2.card_id;
}
```

### 理由

1. **唯一性**: `card_id` 已包含 month、type、index 資訊，保證唯一
2. **簡單性**: 單一字串比較，效能最優
3. **契約一致性**: `card_id` 為 protocol.md 定義的主鍵

### 替代方案（已拒絕）

- **多屬性比較（month + type + index）**: 多餘，`card_id` 已足夠
- **引用比較（`===`）**: 無法比較不同物件實例
- **深度比較庫（lodash.isEqual）**: 增加外部依賴，過度設計

---

## 總結

所有技術決策基於以下原則：

1. ✅ **簡單性優先**: 避免過度設計（如卡片相等性直接用 card_id）
2. ✅ **契約一致性**: 嚴格遵循 `doc/shared/` 定義
3. ✅ **純函數**: 零副作用、零外部依賴
4. ✅ **可測試性**: 100% 單元測試覆蓋率
5. ✅ **效能目標**: 所有函數 < 5ms
6. ✅ **特殊規則**: 三光等特殊役種有明確處理策略

**下一步**: 進入 Phase 1 設計階段，生成 `data-model.md` 和 `contracts/`。
