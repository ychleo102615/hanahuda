# Quick Start: User Interface BC - Domain Layer

**Feature**: User Interface BC - Domain Layer
**Branch**: `002-user-interface-bc`
**Date**: 2025-11-09

## 概述

本指南幫助開發者快速開始實作 User Interface BC 的 Domain Layer。

---

## 前置條件

1. **環境需求**:
   - Node.js 18+
   - npm 或 pnpm
   - TypeScript 5.x

2. **已完成**:
   - 專案基礎設定（Vue 3 + Vite + Vitest）
   - 專案憲法理解（`.specify/memory/constitution.md`）
   - 功能規格理解（`specs/002-user-interface-bc/spec.md`）

---

## 專案結構

根據 `plan.md` 定義的結構，建立以下目錄：

```bash
# 在專案根目錄執行
cd front-end

# 建立 Domain Layer 目錄結構
mkdir -p src/user-interface/domain/card
mkdir -p src/user-interface/domain/matching
mkdir -p src/user-interface/domain/yaku
mkdir -p src/user-interface/domain/opponent
mkdir -p src/user-interface/domain/progress
mkdir -p src/user-interface/domain/types

# 建立測試目錄結構
mkdir -p src/__tests__/user-interface/domain/card
mkdir -p src/__tests__/user-interface/domain/matching
mkdir -p src/__tests__/user-interface/domain/yaku
mkdir -p src/__tests__/user-interface/domain/opponent
mkdir -p src/__tests__/user-interface/domain/progress
```

---

## 開發流程（TDD）

本專案遵循 **測試優先開發（TDD）** 原則。

### 標準開發循環

1. **編寫測試** → 2. **測試失敗（Red）** → 3. **實作功能** → 4. **測試通過（Green）** → 5. **重構（Refactor）**

### 範例：實作卡片 ID 解析功能

#### Step 1: 複製型別定義

```bash
# 從 specs/002-user-interface-bc/contracts/ 複製型別定義到專案
cp specs/002-user-interface-bc/contracts/*.ts front-end/src/user-interface/domain/types/
```

#### Step 2: 編寫測試（Red）

**檔案**: `src/__tests__/user-interface/domain/card/card-parser.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseCardId } from '@/user-interface/domain/card/card-parser'

describe('parseCardId', () => {
  it('should parse valid MMTI format card ID', () => {
    const result = parseCardId('0111')

    expect(result).toEqual({
      month: 1,
      type: 'BRIGHT',
      index: 1
    })
  })

  it('should throw error for invalid card ID', () => {
    expect(() => parseCardId('9999')).toThrow('無效的卡片 ID')
  })
})
```

#### Step 3: 執行測試（確認失敗）

```bash
npm run test:unit -- card-parser
```

預期結果：測試失敗（函數尚未實作）

#### Step 4: 實作功能（Green）

**檔案**: `src/user-interface/domain/card/card-parser.ts`

```typescript
import type { CardType } from '../types/card.types'

export interface ParsedCard {
  month: number
  type: CardType
  index: number
}

export function parseCardId(cardId: string): ParsedCard {
  // 驗證格式
  if (!/^\d{4}$/.test(cardId)) {
    throw new Error('無效的卡片 ID: 格式必須為 4 位數字')
  }

  const month = parseInt(cardId.substring(0, 2), 10)
  const typeCode = cardId[2]
  const index = parseInt(cardId[3], 10)

  // 驗證月份
  if (month < 1 || month > 12) {
    throw new Error(`無效的卡片 ID: 月份超出範圍 (${month})`)
  }

  // 驗證類型
  const type = mapTypeCodeToCardType(typeCode)
  if (!type) {
    throw new Error(`無效的卡片 ID: 類型代碼無效 (${typeCode})`)
  }

  // 驗證索引
  if (index < 1 || index > 4) {
    throw new Error(`無效的卡片 ID: 索引超出範圍 (${index})`)
  }

  return { month, type, index }
}

function mapTypeCodeToCardType(code: string): CardType | null {
  switch (code) {
    case '1': return 'BRIGHT'
    case '2': return 'ANIMAL'
    case '3': return 'RIBBON'
    case '4': return 'PLAIN'
    default: return null
  }
}
```

#### Step 5: 執行測試（確認通過）

```bash
npm run test:unit -- card-parser
```

預期結果：✅ All tests passed

#### Step 6: 重構（Refactor）

檢視程式碼，優化邏輯、提取常數、改善可讀性。

---

## 開發順序建議

根據功能優先級（spec.md）：

### Phase 1: 卡片核心邏輯（P1）
1. ✅ 複製型別定義到專案
2. 🔄 實作卡片 ID 解析（`card-parser.ts`）
3. 🔄 實作卡片屬性查詢（`card-attributes.ts`）
4. 🔄 實作卡片分組排序（`card-grouping.ts`）

### Phase 2: 配對驗證邏輯（P1）
5. 🔄 實作配對檢測（`match-detector.ts`）
6. 🔄 實作配對驗證（`match-validator.ts`）

### Phase 3: 役種檢測邏輯（P2）
7. 🔄 實作役種檢測（`yaku-detector.ts`）
8. 🔄 實作役種進度計算（`yaku-progress.ts`）
9. 🔄 實作分數計算（`score-calculator.ts`）

### Phase 4: 對手分析邏輯（P2）
10. 🔄 實作對手分析（`opponent-analyzer.ts`）
11. 🔄 實作威脅評估（`threat-evaluator.ts`）

### Phase 5: 遊戲進度計算（P3）
12. 🔄 實作回合計算（`turn-calculator.ts`）
13. 🔄 實作分數差距分析（`score-gap-analyzer.ts`）

---

## 測試執行

### 執行所有 Domain Layer 測試

```bash
npm run test:unit -- user-interface/domain
```

### 執行特定模組測試

```bash
# 卡片邏輯測試
npm run test:unit -- card

# 配對驗證測試
npm run test:unit -- matching

# 役種檢測測試
npm run test:unit -- yaku
```

### 測試覆蓋率報告

```bash
npm run test:coverage -- user-interface/domain
```

**目標覆蓋率**:
- 卡片邏輯與配對驗證：100%
- 役種檢測：90%+
- 整體 Domain Layer：90%+

---

## 常見問題

### Q: Domain Layer 可以 import Vue 嗎？
**A**: ❌ **不可以**。Domain Layer 必須完全框架無關，不得依賴 Vue、Pinia 或任何 UI 組件。

### Q: Domain Layer 可以使用 localStorage 嗎？
**A**: ❌ **不可以**。Domain Layer 不應涉及任何外部 I/O 操作（localStorage、API 呼叫等）。

### Q: 如何測試 Domain Layer？
**A**: ✅ 使用 Vitest 編寫純單元測試。所有函數為純函數，無需 Mock，直接測試輸入輸出。

### Q: 前端的驗證邏輯與後端衝突怎麼辦？
**A**: ✅ 前端驗證僅用於即時 UI 反饋，**伺服器擁有最終驗證權**。如果前後端邏輯不一致，以後端為準，前端需更新。

---

## 參考文檔

- **功能規格**: `specs/002-user-interface-bc/spec.md`
- **實作計畫**: `specs/002-user-interface-bc/plan.md`
- **數據模型**: `specs/002-user-interface-bc/data-model.md`
- **型別定義**: `specs/002-user-interface-bc/contracts/`
- **專案憲法**: `.specify/memory/constitution.md`
- **測試策略**: `doc/quality/testing-strategy.md`

---

## 下一步

✅ 完成 Phase 1 規劃
➡️ 執行 `/speckit.tasks` 生成 `tasks.md`
➡️ 開始實作（遵循 TDD 流程）
