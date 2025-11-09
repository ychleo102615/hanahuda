# Data Model: User Interface BC - Domain Layer

**Feature**: User Interface BC - Domain Layer
**Branch**: `002-user-interface-bc`
**Date**: 2025-11-09

## 概述

本文檔定義 User Interface BC - Domain Layer 的核心數據模型。所有模型均為 **Value Objects**（值對象），遵循 DDD 原則，具備不可變性與值語義。

---

## Value Objects

### 1. Card

**描述**: 代表一張花札卡片

**用途**: 卡片解析、屬性查詢、分組排序

**屬性**:

| 欄位 | 型別 | 必填 | 說明 | 驗證規則 |
|-----|------|------|------|---------|
| `cardId` | `string` | ✅ | 卡片 ID（MMTI 格式） | 4 位字串，符合 MMTI 格式（MMTI = 月份 + 類型 + 索引） |
| `month` | `number` | ✅ | 月份（1-12） | 整數，範圍 1-12 |
| `type` | `CardType` | ✅ | 卡片類型 | `'BRIGHT'` \| `'ANIMAL'` \| `'RIBBON'` \| `'PLAIN'` |
| `displayName` | `string` | ✅ | 顯示名稱（如「松鶴」） | 非空字串，支援 Unicode（日文字符） |

**範例**:
```typescript
{
  cardId: '0111',
  month: 1,
  type: 'BRIGHT',
  displayName: '松鶴'
}
```

**關係**:
- 無（獨立 Value Object）

**不變性規則**:
- 建立後所有屬性不可修改
- 相同 `cardId` 的 Card 必須具有相同的其他屬性

**來源**: `doc/shared/protocol.md` - 卡片 ID 編碼規則、`doc/shared/data-contracts.md` - Card 結構

---

### 2. YakuScore

**描述**: 代表一個役種與其分數

**用途**: 役種檢測、分數計算

**屬性**:

| 欄位 | 型別 | 必填 | 說明 | 驗證規則 |
|-----|------|------|------|---------|
| `yakuType` | `YakuType` | ✅ | 役種類型 | 枚舉值（見下方 YakuType 定義） |
| `basePoints` | `number` | ✅ | 基礎得分 | 正整數，範圍 1-15 |

**範例**:
```typescript
{
  yakuType: 'GOKO',
  basePoints: 15
}
```

**關係**:
- 無（獨立 Value Object）

**不變性規則**:
- 建立後所有屬性不可修改
- 相同 `yakuType` 必須具有固定的 `basePoints`

**來源**: `doc/shared/data-contracts.md` - YakuScore 結構、`doc/shared/game-rules.md` - 役種列表

---

### 3. YakuProgress

**描述**: 代表役種進度

**用途**: 役種進度提示、策略建議

**屬性**:

| 欄位 | 型別 | 必填 | 說明 | 驗證規則 |
|-----|------|------|------|---------|
| `yakuType` | `YakuType` | ✅ | 役種類型 | 枚舉值 |
| `required` | `string[]` | ✅ | 需要的卡片列表 | 卡片 ID 陣列，非空 |
| `obtained` | `string[]` | ✅ | 已獲得的卡片列表 | 卡片 ID 陣列，可為空 |
| `missing` | `string[]` | ✅ | 缺少的卡片列表 | 卡片 ID 陣列，可為空 |
| `progress` | `number` | ✅ | 完成百分比（0-100） | 整數，範圍 0-100 |

**範例**:
```typescript
{
  yakuType: 'AKATAN',
  required: ['0131', '0231', '0331'],
  obtained: ['0131', '0231'],
  missing: ['0331'],
  progress: 66
}
```

**關係**:
- `required`、`obtained`、`missing` 欄位包含 Card ID（string）陣列

**不變性規則**:
- 建立後所有屬性不可修改
- `obtained` + `missing` = `required`（集合等價）
- `progress` = `obtained.length` / `required.length` * 100（向下取整）

**來源**: `doc/frontend/user-interface/domain.md` - 役種檢測邏輯

---

### 4. ThreatLevel

**描述**: 代表對手威脅等級

**用途**: 對手分析、威脅評估

**屬性**:

| 欄位 | 型別 | 必填 | 說明 | 驗證規則 |
|-----|------|------|------|---------|
| `level` | `'LOW'` \| `'MEDIUM'` \| `'HIGH'` \| `'CRITICAL'` | ✅ | 威脅等級 | 四種枚舉值之一 |
| `reasons` | `string[]` | ✅ | 威脅原因列表 | 字串陣列，可為空 |

**範例**:
```typescript
{
  level: 'CRITICAL',
  reasons: ['對手已形成四光（10點）', '距離五光僅差 1 張']
}
```

**關係**:
- 無（獨立 Value Object）

**不變性規則**:
- 建立後所有屬性不可修改
- `level` 為 `CRITICAL` 時，`reasons` 不應為空

**威脅等級判斷標準**（來自 spec.md FR-016）:
- **CRITICAL**: 已形成 10 分以上役種，或距離高分役種（五光、四光）僅差 1 張
- **HIGH**: 距離中等役種（赤短、青短、豬鹿蝶）僅差 1 張
- **MEDIUM**: 距離任何役種差 2 張
- **LOW**: 無明顯役種威脅

**來源**: `specs/002-user-interface-bc/spec.md` - FR-016

---

## 枚舉型別定義

### CardType

**描述**: 卡片類型

**值**:
- `'BRIGHT'` - 光札（20點）
- `'ANIMAL'` - 種札（10點）
- `'RIBBON'` - 短札（5點）
- `'PLAIN'` - かす札（1點）

**來源**: `doc/shared/protocol.md` - CardType 定義

---

### YakuType

**描述**: 役種類型

**值**（12 種常用役種，MVP 範圍）:

#### 光牌系
- `'GOKO'` - 五光（15點）
- `'SHIKO'` - 四光（10點）
- `'AMESHIKO'` - 雨四光（8點）
- `'SANKO'` - 三光（6點）

#### 短冊系
- `'AKATAN'` - 赤短（5點）
- `'AOTAN'` - 青短（5點）
- `'TAN'` - 短冊（5張起算 1點，每多 1 張加 1 點）

#### 種牌系
- `'INOSHIKACHO'` - 豬鹿蝶（5點）
- `'HANAMIZAKE'` - 花見酒（3點）
- `'TSUKIMIZAKE'` - 月見酒（3點）
- `'TANE'` - 種（5張起算 1點，每多 1 張加 1 點）

#### かす系
- `'KASU'` - かす（10張起算 1點，每多 1 張加 1 點）

**來源**: `doc/shared/game-rules.md` - 役種列表

---

## 驗證規則總結

### MMTI 格式驗證

**格式**: `MMTI`（4 位字串）
- `MM`: 月份 `01`-`12`
- `T`: 牌型 `1`（光）、`2`（種）、`3`（短）、`4`（かす/plain）
- `I`: 該月該類型的第幾張 `1`-`4`

**範例**:
- ✅ `'0111'` - 有效（1 月光札第 1 張）
- ✅ `'1241'` - 有效（12 月かす札第 1 張）
- ❌ `'1311'` - 無效（月份超出範圍）
- ❌ `'0151'` - 無效（類型無效）
- ❌ `'011'` - 無效（長度不足）

---

## 配對目標陣列（取代 MatchStatus）

**設計決策**: 配對驗證函數直接返回 `string[]`（可配對目標陣列），而非包裝在 MatchStatus 物件中。

**理由**: 配對狀態可從陣列長度直接推導，無需額外的 `status` 欄位：
- `[]` - 無配對（NO_MATCH）
- `['0141']` - 單一配對（SINGLE_MATCH）
- `['0841', '0842', '0843']` - 多重配對（MULTIPLE_MATCHES）

**函數簽名**:
```typescript
findMatchableCards(handCard: string, fieldCards: string[]): string[]
```

**來源**: 設計簡化決策（Phase 1）

---

## 狀態轉換

**無狀態轉換**。所有 Value Objects 為不可變物件，不存在狀態轉換。任何「變更」操作均返回新的 Value Object 實例。

---

## 資料來源

所有數據模型定義均基於以下文檔：
- `specs/002-user-interface-bc/spec.md` - Key Entities 與 Functional Requirements
- `doc/shared/protocol.md` - 卡片 ID 編碼規則、CardType 定義
- `doc/shared/data-contracts.md` - Card、YakuScore 結構
- `doc/shared/game-rules.md` - 役種列表與分數
- `doc/frontend/user-interface/domain.md` - Domain Layer 功能模組
