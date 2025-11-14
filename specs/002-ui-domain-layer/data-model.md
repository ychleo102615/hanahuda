# Data Model: User Interface BC - Domain Layer

**Feature**: 002-ui-domain-layer
**Date**: 2025-11-13
**Status**: Complete

## 概述

此文件定義 User Interface BC Domain Layer 的所有資料結構，包括 Value Objects、型別定義、常數映射。所有定義均為不可變（immutable）純資料結構，符合 Clean Architecture 原則。

---

## 核心型別定義

### Card（卡片 - Value Object）

**描述**: 花札卡片的核心表示，使用 MMTI 格式 ID。

```typescript
export interface Card {
  readonly card_id: string;        // MMTI 格式：MMTI (MM=月份, T=類型, I=索引)
  readonly month: number;           // 月份 (1-12)
  readonly type: CardType;          // 卡片類型
  readonly display_name: string;    // 顯示名稱（如「松鶴」）
}
```

**屬性說明**:

| 屬性 | 型別 | 範圍/格式 | 說明 | 範例 |
|-----|------|----------|------|------|
| `card_id` | `string` | MMTI (4位) | 唯一識別碼 | `"0111"` (松上鶴) |
| `month` | `number` | 1-12 | 月份 | `1` (1月-松) |
| `type` | `CardType` | 枚舉 | 卡片類型 | `"BRIGHT"` (光牌) |
| `display_name` | `string` | 自由文字 | UI 顯示名稱 | `"松鶴"` |

**不變性規則**:
- 所有屬性為 `readonly`
- 一旦創建，不可修改
- 比較使用 `card_id`（唯一鍵）

---

### CardType（卡片類型 - 枚舉）

**描述**: 花札卡片的四種類型，對應分數和役種分類。

```typescript
export type CardType = "BRIGHT" | "ANIMAL" | "RIBBON" | "PLAIN";
```

**類型映射**:

| 類型 | 日文 | 中文 | 分數 | 數量 | MMTI T值 |
|-----|------|------|------|------|---------|
| `BRIGHT` | 光札 | 光牌 | 20 | 5 | 1 |
| `ANIMAL` | タネ札 | 種牌 | 10 | 9 | 2 |
| `RIBBON` | 短札 | 短冊 | 5 | 10 | 3 |
| `PLAIN` | かす札 | かす | 1 | 24 | 4 |

---

### YakuType（役種類型 - 字串枚舉）

**描述**: 12 種標準「こいこい」役種的識別碼。

```typescript
export type YakuType =
  // 光牌系 (5種)
  | "GOKO"        // 五光
  | "SHIKO"       // 四光
  | "AMESHIKO"    // 雨四光
  | "SANKO"       // 三光

  // 短冊系 (3種)
  | "AKATAN"      // 赤短
  | "AOTAN"       // 青短
  | "TAN"         // 短冊 (5張以上)

  // 種牌系 (3種)
  | "INOSHIKACHO" // 豬鹿蝶
  | "TSUKIMI"     // 月見酒
  | "HANAMI"      // 花見酒

  // かす系 (1種)
  | "KASU"        // かす (10張以上)

  // 特殊役種
  | "TANE";       // 種 (5張以上)
```

**役種分類**:

| 役種 | 日文 | 中文 | 基礎分數 | 類型 | 特殊規則 |
|-----|------|------|---------|------|---------|
| `GOKO` | 五光 | 五光 | 15 | 光牌系 | 收集全部5張光牌 |
| `SHIKO` | 四光 | 四光 | 10 | 光牌系 | 4張光牌（不含雨） |
| `AMESHIKO` | 雨四光 | 雨四光 | 8 | 光牌系 | 4張光牌（包含雨） |
| `SANKO` | 三光 | 三光 | 6 | 光牌系 | 3張光牌（不含雨） |
| `AKATAN` | 赤短 | 赤短 | 5 | 短冊系 | 松、梅、櫻短冊 |
| `AOTAN` | 青短 | 青短 | 5 | 短冊系 | 牡丹、菊、紅葉短冊 |
| `TAN` | 短冊 | 短冊 | 1 | 短冊系 | 5張以上短冊，每多1張+1分 |
| `INOSHIKACHO` | 猪鹿蝶 | 豬鹿蝶 | 5 | 種牌系 | 萩豬、紅葉鹿、牡丹蝶 |
| `TSUKIMI` | 月見酒 | 月見酒 | 5 | 種牌系 | 芒月+菊盃 |
| `HANAMI` | 花見酒 | 花見酒 | 5 | 種牌系 | 櫻幕+菊盃 |
| `KASU` | かす | かす | 1 | かす系 | 10張以上かす，每多1張+1分 |
| `TANE` | 種 | 種 | 1 | 種牌系 | 5張以上種牌，每多1張+1分 |

---

### YakuProgress（役種進度 - Value Object）

**描述**: 追蹤用戶距離達成特定役種的進度資訊。

```typescript
export interface YakuProgress {
  readonly required: readonly Card[];      // 所需卡片列表
  readonly obtained: readonly Card[];      // 已獲得卡片列表
  readonly missing: readonly Card[];       // 缺少卡片列表
  readonly progress: number;               // 完成百分比 (0-100)
}
```

**屬性說明**:

| 屬性 | 型別 | 說明 | 範例 |
|-----|------|------|------|
| `required` | `readonly Card[]` | 達成該役種所需的卡片 | `[MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN]` (赤短) |
| `obtained` | `readonly Card[]` | 用戶已獲得的相關卡片 | `[MATSU_AKATAN, UME_AKATAN]` (已有2張) |
| `missing` | `readonly Card[]` | 仍缺少的卡片 | `[SAKURA_AKATAN]` (還差1張) |
| `progress` | `number` | 完成百分比 | `66.67` (2/3 * 100) |

**計算邏輯**:
```
progress = (obtained.length / required.length) * 100
```

---

## 常數映射

### YAKU_REQUIREMENTS（役種需求映射）

**描述**: 每種役種所需的卡片列表。

```typescript
export const YAKU_REQUIREMENTS: Record<YakuType, readonly Card[]> = {
  // 短冊系
  AKATAN: [MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN],
  AOTAN: [BOTAN_AOTAN, KIKU_AOTAN, MOMIJI_AOTAN],

  // 光牌系
  GOKO: [
    MATSU_HIKARI,    // 松上鶴
    SAKURA_HIKARI,   // 櫻上幕
    SUSUKI_HIKARI,   // 芒上月
    YANAGI_HIKARI,   // 柳上小野道風（雨）
    KIRI_HIKARI      // 桐上鳳凰
  ],

  SHIKO: [
    MATSU_HIKARI,    // 四光：不含雨光
    SAKURA_HIKARI,
    SUSUKI_HIKARI,
    KIRI_HIKARI
  ],

  AMESHIKO: [
    MATSU_HIKARI,    // 雨四光：包含雨光，任選4張
    SAKURA_HIKARI,
    SUSUKI_HIKARI,
    YANAGI_HIKARI
  ],

  SANKO: [
    MATSU_HIKARI,    // 三光：從這4張中任選3張（排除雨光）
    SAKURA_HIKARI,
    SUSUKI_HIKARI,
    KIRI_HIKARI
  ],

  // 種牌系
  INOSHIKACHO: [HAGI_INO, MOMIJI_SHIKA, BOTAN_CHOU],
  TSUKIMI: [SUSUKI_TSUKI, KIKU_SAKAZUKI],
  HANAMI: [SAKURA_MAKU, KIKU_SAKAZUKI],

  // 動態役種（TAN, KASU, TANE）使用專門函數計算
};
```

**特殊役種處理**:

| 役種 | 處理方式 | 函數 |
|-----|---------|------|
| `SANKO` (三光) | 從4張非雨光中任選3張 | `calculateSankoProgress()` |
| `TAN` (短冊) | 任意5張以上短冊 | `calculateDynamicYakuProgress("TAN", ...)` |
| `KASU` (かす) | 任意10張以上かす | `calculateDynamicYakuProgress("KASU", ...)` |
| `TANE` (種) | 任意5張以上種牌 | `calculateDynamicYakuProgress("TANE", ...)` |

---

## 卡片資料庫結構

### ALL_CARDS（全部48張卡片）

**描述**: 標準花札牌組的完整定義，按月份排序。

**資料結構**:
```typescript
export const ALL_CARDS: readonly Card[] = [
  // 1月 - 松 (4張)
  MATSU_HIKARI,     // 0111 - 松上鶴 (光牌)
  MATSU_AKATAN,     // 0131 - 松赤短 (短冊)
  MATSU_KASU_1,     // 0141 - 松かす1 (かす)
  MATSU_KASU_2,     // 0142 - 松かす2 (かす)

  // 2月 - 梅 (4張)
  UME_UGUISU,       // 0221 - 梅上鶯 (種牌)
  UME_AKATAN,       // 0231 - 梅赤短 (短冊)
  UME_KASU_1,       // 0241 - 梅かす1 (かす)
  UME_KASU_2,       // 0242 - 梅かす2 (かす)

  // ... 依此類推至12月
];
```

**統計資訊**:
- 總卡片數: 48 張
- 光牌 (BRIGHT): 5 張
- 種牌 (ANIMAL): 9 張
- 短冊 (RIBBON): 10 張
- かす (PLAIN): 24 張

---

## 資料驗證規則

### Card 驗證

```typescript
export function isValidCard(card: Readonly<Card>): boolean {
  // 1. card_id 必須符合 MMTI 格式
  if (!/^\d{4}$/.test(card.card_id)) return false;

  // 2. month 必須在 1-12 範圍內
  if (card.month < 1 || card.month > 12) return false;

  // 3. type 必須為合法類型
  const validTypes: CardType[] = ["BRIGHT", "ANIMAL", "RIBBON", "PLAIN"];
  if (!validTypes.includes(card.type)) return false;

  // 4. 必須存在於 ALL_CARDS 中
  return ALL_CARDS.some(c => c.card_id === card.card_id);
}
```

### YakuProgress 驗證

```typescript
export function isValidYakuProgress(progress: YakuProgress): boolean {
  // 1. progress 必須在 0-100 範圍內
  if (progress.progress < 0 || progress.progress > 100) return false;

  // 2. obtained 必須是 required 的子集
  const allObtainedValid = progress.obtained.every(obtained =>
    progress.required.some(req => areCardsEqual(req, obtained))
  );
  if (!allObtainedValid) return false;

  // 3. missing + obtained = required
  const totalCount = progress.obtained.length + progress.missing.length;
  if (totalCount !== progress.required.length) return false;

  return true;
}
```

---

## 型別守衛（Type Guards）

### isCardType

```typescript
export function isCardType(value: unknown): value is CardType {
  return (
    typeof value === "string" &&
    ["BRIGHT", "ANIMAL", "RIBBON", "PLAIN"].includes(value)
  );
}
```

### isYakuType

```typescript
export function isYakuType(value: unknown): value is YakuType {
  const validYakuTypes: YakuType[] = [
    "GOKO", "SHIKO", "AMESHIKO", "SANKO",
    "AKATAN", "AOTAN", "TAN",
    "INOSHIKACHO", "TSUKIMI", "HANAMI",
    "KASU", "TANE"
  ];
  return typeof value === "string" && validYakuTypes.includes(value as YakuType);
}
```

---

## 資料不變性保證

### 深度唯讀（Deep Readonly）

所有陣列和物件使用 TypeScript `readonly` 修飾符：

```typescript
// ✅ 正確：深度唯讀
export const MATSU_HIKARI: Readonly<Card> = {
  card_id: "0111",
  month: 1,
  type: "BRIGHT",
  display_name: "松鶴"
} as const;

export const ALL_CARDS: readonly Card[] = [/* ... */];

// ❌ 錯誤：可變
export let mutableCard: Card = { /* ... */ };
ALL_CARDS.push(mutableCard); // TypeScript 編譯錯誤
```

### Object.freeze（執行時保護）

```typescript
export const MATSU_HIKARI: Card = Object.freeze({
  card_id: "0111",
  month: 1,
  type: "BRIGHT",
  display_name: "松鶴"
});

export const ALL_CARDS: readonly Card[] = Object.freeze([
  MATSU_HIKARI,
  // ...
]);
```

---

## 與共用契約的對應關係

### Card ↔ protocol.md Card

| Domain Model | Data Contract | 說明 |
|--------------|---------------|------|
| `Card.card_id` | `Card.card_id` | MMTI 格式，完全一致 |
| `Card.month` | `Card.month` | 月份 (1-12) |
| `Card.type` | `Card.type` | 枚舉值完全一致 |
| `Card.display_name` | `Card.display_name` | 顯示名稱 |

**映射函數**（未來 Adapter Layer 實作）:
```typescript
// Domain Model → DTO
export function toCardDTO(card: Readonly<Card>): CardDTO {
  return {
    card_id: card.card_id,
    month: card.month,
    type: card.type,
    display_name: card.display_name
  };
}

// DTO → Domain Model
export function fromCardDTO(dto: CardDTO): Card {
  return {
    card_id: dto.card_id,
    month: dto.month,
    type: dto.type as CardType,
    display_name: dto.display_name
  };
}
```

---

## 總結

### 資料模型特性

1. ✅ **不可變性**: 所有資料結構使用 `readonly`
2. ✅ **型別安全**: 嚴格型別定義 + 型別守衛
3. ✅ **契約一致**: 與 `doc/shared/data-contracts.md` 完全對應
4. ✅ **驗證完整**: 提供資料驗證函數
5. ✅ **框架無關**: 純 TypeScript 介面，零外部依賴

### 檔案映射

| 資料模型 | 實作檔案 | 說明 |
|---------|---------|------|
| `Card`, `CardType` | `types.ts` | 核心型別定義 |
| 語義化常數 (如 `MATSU_HIKARI`) | `card-database.ts` | 48 張卡片定義 |
| `ALL_CARDS` | `card-database.ts` | 卡片陣列 |
| `YakuType`, `YakuProgress` | `types.ts` | 役種型別定義 |
| `YAKU_REQUIREMENTS` | `yaku-progress.ts` | 役種映射 |
| 驗證函數 | `card-logic.ts` | 資料驗證邏輯 |
