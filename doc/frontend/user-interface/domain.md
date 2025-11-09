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

#### 卡片 ID 解析
- 解析 MMTI 格式（詳見 [protocol.md](../../shared/protocol.md)）
- 提取月份（01-12）、類型（1-4）、索引（1-4）
- 驗證 ID 格式合法性

**功能**:
```typescript
// 解析卡片 ID
parseCardId(cardId: string): { month: number, type: CardType, index: number }

// 驗證卡片 ID
isValidCardId(cardId: string): boolean
```

#### 卡片屬性查詢
- 根據 ID 返回月份、類型名稱、點數、顯示名稱
- 支援快速查詢卡片元數據

**功能**:
```typescript
// 獲取卡片屬性
getCardAttributes(cardId: string): {
  month: number,
  type: CardType,
  typeName: string,
  points: number,
  displayName: string
}

// 獲取卡片點數
getCardPoints(cardId: string): number
```

#### 卡片分組與排序
- 按月份、類型、點數分類（用於 UI 顯示）
- 支援自訂排序策略

**功能**:
```typescript
// 按月份分組
groupCardsByMonth(cards: string[]): Map<number, string[]>

// 按類型分組
groupCardsByType(cards: string[]): Map<CardType, string[]>

// 排序卡片（月份 > 類型 > 索引）
sortCards(cards: string[]): string[]
```

---

### 2. 配對驗證邏輯（P1 - 必須實作）

#### 識別可配對的牌
- 判斷手牌與場牌的配對關係（相同月份）
- 快速檢查是否存在可配對的牌

**功能**:
```typescript
// 檢查兩張牌是否可配對
canMatch(cardId1: string, cardId2: string): boolean

// 從場牌中找出可配對的牌
findMatchableCards(handCard: string, fieldCards: string[]): string[]
```

#### 多目標判斷
- 當手牌可與場上多張牌配對時，返回所有可選目標列表
- 區分「無配對」、「單一配對」、「雙重配對」三種情況

**功能**:
```typescript
// 配對狀態
type MatchStatus = 'NO_MATCH' | 'SINGLE_MATCH' | 'MULTIPLE_MATCHES'

// 分析配對狀態
analyzeMatchStatus(handCard: string, fieldCards: string[]): {
  status: MatchStatus,
  targets: string[]
}
```

#### 客戶端預驗證
- 在發送命令前檢查操作合法性（例如：月份不符、卡片不存在）
- 提供即時 UI 反饋

**功能**:
```typescript
// 驗證打出手牌的合法性
validatePlayCard(cardId: string, handCards: string[]): {
  valid: boolean,
  reason?: string
}

// 驗證選擇配對目標的合法性
validateSelectTarget(source: string, target: string, possibleTargets: string[]): {
  valid: boolean,
  reason?: string
}
```

---

### 3. 役種檢測邏輯（P2 - 重要）

#### 實時役種檢測
- 根據玩家已獲得牌，計算當前形成的役種
- 支援光牌系、短冊系、種牌系、かす系（詳見 [game-rules.md](../../shared/game-rules.md)）

**功能**:
```typescript
// 檢測已形成的役種
detectYaku(depositoryCards: string[]): YakuScore[]

// 檢查特定役種是否形成
hasYaku(depositoryCards: string[], yakuType: string): boolean
```

#### 役種進度計算
- 顯示「距離赤短還差 1 張」、「已收集豬鹿蝶中的豬和鹿」等資訊
- 提供 UI 提示與策略建議

**功能**:
```typescript
// 計算役種進度
calculateYakuProgress(depositoryCards: string[], yakuType: string): {
  required: string[],      // 需要的卡片
  obtained: string[],      // 已獲得的卡片
  missing: string[]        // 缺少的卡片
}

// 獲取所有可能形成的役種
getPossibleYaku(depositoryCards: string[]): {
  yakuType: string,
  progress: number,        // 0-100%
  missingCount: number
}[]
```

#### 分數預測
- 根據當前役種、Koi-Koi 次數計算潛在得分與倍率
- 支援決策建議

**功能**:
```typescript
// 計算當前分數（含倍率）
calculateScore(yakus: YakuScore[], koiKoiMultiplier: number): number

// 預測繼續遊戲的潛在分數
predictPotentialScore(currentYakus: YakuScore[], depositoryCards: string[]): {
  minScore: number,
  maxScore: number,
  likelyYaku: string[]
}
```

#### 役種衝突判斷
- 識別互斥役種（例如四光與雨四光）
- 自動選擇最高分役種組合

**功能**:
```typescript
// 檢查役種衝突
hasYakuConflict(yaku1: string, yaku2: string): boolean

// 選擇最優役種組合
selectOptimalYaku(allYakus: YakuScore[]): YakuScore[]
```

---

### 4. 對手分析邏輯（P2 - 重要）

#### 對手役種預測
- 根據對手已獲得牌，計算可能形成的役種
- 提供威脅度評估

**功能**:
```typescript
// 分析對手役種狀態
analyzeOpponentYaku(opponentDepository: string[]): {
  formedYaku: YakuScore[],
  possibleYaku: {
    yakuType: string,
    progress: number,
    threat: 'LOW' | 'MEDIUM' | 'HIGH'
  }[]
}
```

#### 威脅度評估
- 標示對手「距離五光還差 2 張」等警示資訊
- UI 顯示威脅指示器

**功能**:
```typescript
// 計算威脅等級
calculateThreatLevel(opponentDepository: string[]): {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  reasons: string[]
}
```

#### 卡片分布統計
- 分析對手收集的牌型（幾張光、幾張種、幾張短、幾張かす）
- 提供策略提示

**功能**:
```typescript
// 統計卡片類型分布
analyzeCardDistribution(cards: string[]): {
  bright: number,
  animal: number,
  ribbon: number,
  dreg: number
}
```

---

### 5. 遊戲進度計算（P3 - 輔助功能）

#### 剩餘回合計算
- 根據牌堆剩餘張數和手牌數，計算還能進行幾回合
- 用於 UI 進度顯示

**功能**:
```typescript
// 計算剩餘回合數
calculateRemainingTurns(deckRemaining: number, handSize: number): number

// 計算局進度百分比
calculateRoundProgress(deckRemaining: number): number  // 0-100
```

#### 分數差距分析
- 計算與對手的分數差，判斷策略傾向（激進/保守）
- 提供決策建議

**功能**:
```typescript
// 分析分數差距
analyzeScoreGap(myScore: number, opponentScore: number): {
  gap: number,
  advantage: 'LEADING' | 'TIED' | 'BEHIND',
  strategy: 'AGGRESSIVE' | 'BALANCED' | 'DEFENSIVE'
}
```

---

## 測試要求

### 單元測試覆蓋率

- ✅ **卡片邏輯**: 100% 覆蓋
  - 所有月份、類型、索引組合
  - 邊界值測試（無效 ID、空字串）

- ✅ **配對驗證**: 100% 覆蓋
  - 無配對、單一配對、多重配對
  - 邊界情況（空場牌、空手牌）

- ✅ **役種檢測**: 100% 覆蓋
  - 所有 12 種常用役種
  - 役種衝突情況
  - 進度計算邊界值

- ✅ **對手分析**: > 90% 覆蓋
  - 各種威脅等級情況
  - 卡片分布統計

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
