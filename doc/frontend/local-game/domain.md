# Local Game BC - Domain Layer

## 職責

實作完整的花札遊戲規則引擎，提供離線單機遊戲邏輯。此層為純業務邏輯，不依賴任何框架或外部狀態。

**核心原則**:
- ✅ **純函數設計**: 無副作用，同樣輸入保證同樣輸出
- ✅ **框架無關**: 不依賴 Vue、Pinia、UI 組件等任何框架
- ✅ **可獨立測試**: 可通過單元測試驗證，無需 UI 環境
- ✅ **100% 測試覆蓋**: 所有邊界情況必須有測試用例
- ✅ **完整遊戲引擎**: 實作所有遊戲規則，相當於前端版的後端

**與 User Interface BC 的關係**:
- User Interface BC 負責 UI 呈現與伺服器通訊
- Local Game BC 負責完整的離線遊戲邏輯
- 離線模式下，User Interface BC 調用 Local Game BC 替代伺服器

---

## 核心功能模組

### 1. 遊戲規則引擎（P1 - 必須實作）

#### 發牌邏輯
- 初始化 48 張牌（12 個月份，每月 4 張）
- 洗牌演算法（Fisher-Yates Shuffle）
- 發牌順序（玩家 8 張、對手 8 張、場中央 8 張、剩餘牌堆）

**功能**:
```typescript
// 初始化完整牌組
initializeDeck(): string[]

// 洗牌
shuffleDeck(deck: string[]): string[]

// 發牌
dealCards(deck: string[]): {
  playerHand: string[],
  opponentHand: string[],
  field: string[],
  remaining: string[]
}
```

#### 配對邏輯
- 手牌配對：檢查手牌與場牌的月份是否相同
- 牌堆配對：翻開牌堆牌時自動配對
- 多重配對處理：當有多張可配對牌時的選擇機制

**功能**:
```typescript
// 檢查手牌與場牌配對
findHandMatches(handCard: string, fieldCards: string[]): string[]

// 執行配對（移除場牌、加入已獲得牌區）
executeMatch(handCard: string, fieldCard: string, fieldCards: string[]): {
  newField: string[],
  captured: string[]
}

// 處理無配對情況（手牌留在場上）
handleNoMatch(handCard: string, fieldCards: string[]): string[]
```

#### 回合流程控制
- 回合狀態管理（玩家回合、對手回合）
- 流程狀態轉換（AWAITING_HAND_PLAY → AWAITING_SELECTION → AWAITING_DECISION）
- 回合結束判定（手牌用罄、牌堆耗盡）

**功能**:
```typescript
// 執行玩家回合
executePlayerTurn(gameState: GameState, handCard: string, target?: string): TurnResult

// 執行對手回合
executeOpponentTurn(gameState: GameState, strategy: OpponentStrategy): TurnResult

// 判斷回合是否結束
isRoundOver(gameState: GameState): boolean
```

---

### 2. 牌組管理（P1 - 必須實作）

#### 牌組初始化
- 根據 MMTI 編碼生成 48 張牌
- 驗證牌組完整性（確保每月 4 張、每類型正確數量）

**功能**:
```typescript
// 生成完整牌組
generateFullDeck(): string[]

// 驗證牌組完整性
validateDeck(deck: string[]): {
  valid: boolean,
  missing?: string[],
  duplicates?: string[]
}
```

#### 洗牌與發牌
- 實作 Fisher-Yates 洗牌演算法
- 確保隨機性與公平性
- 檢測特殊開局（Teshi、場牌流局）

**功能**:
```typescript
// Fisher-Yates 洗牌
fisherYatesShuffle(deck: string[]): string[]

// 檢測 Teshi（手牌 4 張同月）
detectTeshi(hand: string[]): boolean

// 檢測場牌流局（場上 4 張同月）
detectFieldKuttsuki(field: string[]): boolean
```

---

### 3. 役種檢測服務（P1 - 必須實作）

#### MVP 實作 12 種常用役種

**光牌系（4 種）**:
- **五光 (15 點)**: 5 張光牌（0111, 0211, 0311, 0811, 1111）
- **四光 (10 點)**: 4 張光牌（不含雨）
- **雨四光 (8 點)**: 4 張光牌（含雨 1111）
- **三光 (6 點)**: 3 張光牌（不含雨）

**短冊系（3 種）**:
- **赤短 (5 點)**: 3 張紅色短冊（0131, 0231, 0331）
- **青短 (5 點)**: 3 張藍色短冊（0631, 0931, 1031）
- **短冊 (1 點)**: 5 張以上短冊（任意短冊）

**種牌系（4 種）**:
- **豬鹿蝶 (5 點)**: 0721（萩豬）, 1021（紅葉鹿）, 0621（牡丹蝶）
- **花見酒 (3 點)**: 0311（櫻幕）, 0921（菊盃）
- **月見酒 (3 點)**: 0811（芒月）, 0921（菊盃）
- **種 (1 點)**: 5 張以上種牌（任意種牌）

**かす系（1 種）**:
- **かす (1 點)**: 10 張以上かす牌

**功能**:
```typescript
// 檢測所有已形成的役種
detectAllYaku(depositoryCards: string[]): Yaku[]

// 檢測特定役種
detectGoko(cards: string[]): boolean      // 五光
detectShiko(cards: string[]): boolean     // 四光
detectAmeShiko(cards: string[]): boolean  // 雨四光
detectSanko(cards: string[]): boolean     // 三光
detectAkatan(cards: string[]): boolean    // 赤短
detectAotan(cards: string[]): boolean     // 青短
detectTanzaku(cards: string[]): boolean   // 短冊
detectInoshikacho(cards: string[]): boolean // 豬鹿蝶
detectHanami(cards: string[]): boolean    // 花見酒
detectTsukimi(cards: string[]): boolean   // 月見酒
detectTane(cards: string[]): boolean      // 種
detectKasu(cards: string[]): boolean      // かす
```

#### 役種衝突處理
- 識別互斥役種（例如四光與雨四光）
- 自動選擇最高分役種組合
- 計算累計基礎分數

**功能**:
```typescript
// 解決役種衝突，返回最優組合
resolveYakuConflicts(allYaku: Yaku[]): Yaku[]

// 計算累計基礎分數
calculateBaseScore(yakus: Yaku[]): number
```

---

### 4. 分數計算（P1 - 必須實作）

#### Koi-Koi 機制
- 玩家呼叫 Koi-Koi 時，倍率增加（通常為 2 倍）
- 對手後續成役時，對手的倍率也會疊加
- 最終得分 = 基礎分數 × 倍率

**功能**:
```typescript
// 計算 Koi-Koi 倍率
calculateKoiKoiMultiplier(koiKoiCount: number): number

// 計算最終得分（含倍率）
calculateFinalScore(baseScore: number, koiMultiplier: number, sevenPointDouble: boolean): number
```

#### 7 分倍增規則
- 基礎分數 ≥ 7 時，最終得分 × 2
- 此倍率與 Koi-Koi 倍率疊加

**功能**:
```typescript
// 判斷是否觸發 7 分倍增
shouldApplySevenPointDouble(baseScore: number): boolean
```

---

### 5. 遊戲狀態管理（P1 - 必須實作）

#### 遊戲狀態結構
- 當前局數、累計分數、玩家/對手手牌、場牌、已獲得牌、牌堆剩餘數量
- 流程狀態（FlowStage）、當前行動玩家、Koi-Koi 狀態

**數據結構**:
```typescript
interface LocalGameState {
  // 遊戲配置
  ruleset: {
    totalRounds: number,
    koiKoiMultiplier: number,
    sevenPointDouble: boolean
  },

  // 局狀態
  currentRound: number,
  dealerId: string,

  // 分數
  cumulativeScores: {
    playerId: string,
    score: number
  }[],

  // 卡牌狀態
  field: string[],
  playerHand: string[],
  opponentHand: string[],
  playerDepository: string[],
  opponentDepository: string[],
  deck: string[],

  // 流程狀態
  flowStage: FlowStage,
  activePlayerId: string,

  // Koi-Koi 狀態
  koiKoiStatus: {
    playerId: string,
    multiplier: number,
    calledCount: number
  }[]
}
```

#### 狀態轉換
- 回合開始 → 打手牌 → 翻牌 → 役種檢測 → Koi-Koi 決策 → 回合結束
- 處理狀態轉換的邊界情況（選擇配對、役種形成）

**功能**:
```typescript
// 初始化遊戲狀態
initializeGameState(ruleset: Ruleset): LocalGameState

// 更新遊戲狀態
updateGameState(state: LocalGameState, action: GameAction): LocalGameState

// 重置局狀態（新局開始）
resetRoundState(state: LocalGameState): LocalGameState
```

---

### 6. 對手策略邏輯（P2 - 重要）

#### 簡易隨機策略（MVP）
- 從手牌隨機選擇一張牌
- 若有多張可配對場牌，隨機選擇一張
- 牌堆翻牌的配對由系統自動處理

**功能**:
```typescript
// 簡易隨機策略：選擇手牌
selectHandCard(hand: string[], field: string[]): string

// 簡易隨機策略：選擇配對目標
selectMatchTarget(possibleTargets: string[]): string

// 簡易隨機策略：Koi-Koi 決策（低分繼續，高分停止）
makeKoiKoiDecision(currentYaku: Yaku[], baseScore: number): 'KOI_KOI' | 'END_ROUND'
```

#### 進階策略（Post-MVP）
- 根據當前役種進度決定策略
- 評估風險與收益（繼續 vs. 結束）
- 記憶對手已獲得牌，預測對手役種

---

## 測試要求

### 單元測試覆蓋率

- ✅ **發牌邏輯**: 100% 覆蓋
  - 洗牌隨機性測試
  - 發牌正確性測試
  - Teshi 檢測測試
  - 場牌流局檢測測試

- ✅ **配對邏輯**: 100% 覆蓋
  - 所有月份的配對測試
  - 無配對、單一配對、多重配對
  - 邊界情況（空場牌、空手牌）

- ✅ **役種檢測**: 100% 覆蓋
  - 所有 12 種常用役種
  - 役種衝突情況
  - 邊界值（恰好 5 張短冊、10 張かす）

- ✅ **分數計算**: 100% 覆蓋
  - Koi-Koi 倍率計算
  - 7 分倍增規則
  - 倍率疊加

- ✅ **遊戲流程**: > 90% 覆蓋
  - 完整遊戲流程（初始化 → 回合 → 結束）
  - 各種流程狀態轉換
  - 錯誤處理

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
- [前端架構總覽](../architecture.md)
