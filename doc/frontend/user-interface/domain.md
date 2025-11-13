# User Interface BC - Domain Layer

## 職責

封裝前端遊戲業務邏輯，提供純函數運算，不依賴任何框架或外部狀態。

**核心原則**:
- ✅ **純函數設計**: 無副作用，同樣輸入保證同樣輸出
- ✅ **框架無關**: 不依賴 Vue、Pinia、UI 組件等任何框架
- ✅ **可獨立測試**: 可通過單元測試驗證，無需 UI 環境
- ✅ **100% 測試覆蓋**: 所有邊界情況必須有測試用例
- ✅ **伺服器權威**: 前端邏輯僅用於即時反饋，伺服器擁有最終驗證權

---

## 核心功能模組

### 1. 卡片核心邏輯（P1 - 必須實作）

#### 卡片識別與查詢
- 使用語義化常數識別卡片（定義於 card-database.ts）
- Card Value Object 僅包含業務屬性（month, type, index）

**功能**:
```typescript
// 使用語義化常數
import { MATSU_HIKARI, HAGI_INO, MATSU_AKATAN, ALL_CARDS } from './card-database'

// 驗證卡片是否在標準牌組中
isValidCard(card: Card): boolean
// 實作範例：return ALL_CARDS.some(c => cardsEqual(c, card))
```

---

### 2. 配對驗證邏輯（P1 - 必須實作）

#### 識別可配對的牌
- 判斷手牌與場牌的配對關係（相同月份）
- 快速檢查是否存在可配對的牌

**功能**:
```typescript
// 檢查兩張牌是否可配對（相同月份）
canMatch(card1: Card, card2: Card): boolean
// 實作範例：return card1.month === card2.month

// 從場牌中找出可配對的牌
findMatchableCards(handCard: Card, fieldCards: Card[]): Card[]
```

#### 多目標判斷
- 當手牌可與場上多張牌配對時，返回所有可選目標列表
- 直接返回可配對目標陣列（空陣列 = 無配對、1個元素 = 單一配對、2+個元素 = 多重配對）

**功能**:
```typescript
// 分析配對目標（直接返回目標陣列）
findMatchableCards(handCard: Card, fieldCards: Card[]): Card[]
// 返回值：
// [] - 無配對
// [card1] - 單一配對
// [card1, card2, card3] - 多重配對
```

#### 客戶端預驗證
- 在發送命令前檢查操作合法性（例如：卡片不存在）
- 提供即時 UI 反饋，避免發送明顯無效的命令

**功能**:
```typescript
// 基本驗證：檢查卡片是否在手牌中
validateCardExists(card: Card, handCards: Card[]): boolean

// 基本驗證：檢查目標是否在可配對列表中
validateTargetInList(target: Card, possibleTargets: Card[]): boolean
```

---

### 3. 役種進度計算（P2 - 輔助功能）

#### 役種需求映射
- 定義 12 種常用役種所需的卡片列表（詳見 [game-rules.md](../../shared/game-rules.md)）
- 提供語義化常數

**功能**:
```typescript
// 役種需求常數映射
YAKU_REQUIREMENTS: Record<YakuType, Card[]>

// 範例：
// YAKU_REQUIREMENTS['赤短'] = [MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN]
```

#### 役種進度計算
- 顯示「距離赤短還差 1 張」、「已收集豬鹿蝶中的豬和鹿」等資訊
- 使用簡單的集合運算（差集）

**功能**:
```typescript
// 計算特定役種的進度（集合運算）
calculateYakuProgress(yakuType: YakuType, depositoryCards: Card[]): {
  required: Card[],      // 需要的卡片
  obtained: Card[],      // 已獲得的卡片
  missing: Card[],       // 缺少的卡片
  progress: number       // 0-100%
}

// 計算缺少的卡片（差集運算）
getMissingCards(required: Card[], obtained: Card[]): Card[]
```


---

## 測試要求

### 單元測試覆蓋率（MVP 簡化版）

- ✅ **卡片邏輯**: 100% 覆蓋
  - 所有月份、類型、索引組合
  - 基本屬性查詢功能
  - 邊界值測試（無效資料、空值）

- ✅ **配對驗證**: 100% 覆蓋
  - 無配對、單一配對、多重配對
  - 基本驗證功能
  - 邊界情況（空場牌、空手牌）

- ✅ **役種進度計算**: > 90% 覆蓋
  - 役種需求映射正確性
  - 進度計算（集合運算）
  - 邊界值（空牌組、完整牌組）

### 測試框架

- **工具**: Vitest
- **斷言庫**: expect (Vitest 內建)
- **覆蓋率報告**: c8 / istanbul

---

## 參考文檔

- [共用數據契約](../../shared/data-contracts.md)
- [通訊協議](../../shared/protocol.md)
- [遊戲規則](../../shared/game-rules.md)
- [Application Layer](./application.md)
- [Adapter Layer](./adapter.md)
