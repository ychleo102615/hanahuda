# Opponent BC - Domain Layer

## 職責

實作 AI 對手的決策邏輯，提供純 TypeScript 函數，不依賴任何框架。

**核心原則**:
- ✅ **純業務邏輯**: 不依賴 Nuxt、外部服務等
- ✅ **策略模式**: 可擴展不同難度的 AI 策略
- ✅ **純函數設計**: 所有決策邏輯為純函數

---

## 核心領域模型

### OpponentStrategy（對手策略介面）

```typescript
// server/domain/opponent/opponent-strategy.ts
interface OpponentStrategy {
  // 選擇要打出的手牌
  selectHandCard(params: SelectHandCardParams): string

  // 當有多張可配對牌時，選擇目標
  selectMatchTarget(params: SelectMatchTargetParams): string

  // 做 Koi-Koi 決策
  makeKoiKoiDecision(params: MakeDecisionParams): 'KOI_KOI' | 'STOP'
}

interface SelectHandCardParams {
  handCards: readonly string[]
  fieldCards: readonly string[]
  depositoryCards: readonly string[]
}

interface SelectMatchTargetParams {
  sourceCard: string
  possibleTargets: readonly string[]
  depositoryCards: readonly string[]
}

interface MakeDecisionParams {
  currentYakus: readonly Yaku[]
  baseScore: number
  opponentKoiKoiCount: number
  remainingCards: number
}
```

---

## 策略實作

### SimpleAIStrategy（簡易 AI 策略）

目前實作的簡易 AI，採用隨機策略：

```typescript
// server/domain/opponent/simple-ai-strategy.ts
class SimpleAIStrategy implements OpponentStrategy {
  selectHandCard(params: SelectHandCardParams): string {
    const { handCards, fieldCards } = params

    // 優先選擇可配對的牌
    for (const cardId of handCards) {
      const matches = findMatchableCards(cardId, fieldCards)
      if (matches.length > 0) {
        return cardId
      }
    }

    // 若無可配對牌，隨機選擇
    return handCards[Math.floor(Math.random() * handCards.length)]
  }

  selectMatchTarget(params: SelectMatchTargetParams): string {
    const { possibleTargets } = params

    // 隨機選擇配對目標
    return possibleTargets[Math.floor(Math.random() * possibleTargets.length)]
  }

  makeKoiKoiDecision(params: MakeDecisionParams): 'KOI_KOI' | 'STOP' {
    const { baseScore, remainingCards } = params

    // 簡單策略：
    // - 若分數 >= 7，結束（已達倍增門檻）
    // - 若剩餘牌數 <= 4，結束
    // - 其他情況，50% 機率繼續

    if (baseScore >= 7) return 'STOP'
    if (remainingCards <= 4) return 'STOP'

    return Math.random() < 0.5 ? 'KOI_KOI' : 'STOP'
  }
}
```

---

## 未來擴展

### AdvancedAIStrategy（進階 AI 策略）

Post-MVP 可實作的進階策略：

- 優先收集高價值卡牌
- 考慮役種形成機率
- 評估風險/收益比
- 阻擋對手役種形成

```typescript
// 未來擴展
class AdvancedAIStrategy implements OpponentStrategy {
  selectHandCard(params: SelectHandCardParams): string {
    // 評估每張牌的價值
    // 考慮役種形成機率
    // 選擇最優解
  }

  makeKoiKoiDecision(params: MakeDecisionParams): 'KOI_KOI' | 'STOP' {
    // 計算繼續的期望值
    // 評估對手可能的役種
    // 基於機率做決策
  }
}
```

---

## 測試要求

### 單元測試

- ✅ **SimpleAIStrategy.selectHandCard**: 測試優先配對邏輯
- ✅ **SimpleAIStrategy.selectMatchTarget**: 測試目標選擇
- ✅ **SimpleAIStrategy.makeKoiKoiDecision**: 測試決策邏輯邊界值

### 測試框架

- **工具**: Vitest
- **斷言**: Vitest built-in assertions

---

## 參考文檔

- [Application Layer](./application.md)
- [Adapter Layer](./adapter.md)
- [後端架構總覽](../architecture.md)
