# Opponent BC - Application Layer

## 職責

協調 Opponent BC 的 Domain Layer，實作 Core Game BC 定義的 `OpponentStrategyPort`。

**核心原則**:
- ✅ **實作 Output Port**: 提供 Core Game BC 調用的介面
- ✅ **協調 Domain**: 調用 OpponentStrategy 執行決策

---

## OpponentStrategyPort 實作

```typescript
// server/application/opponent/OpponentStrategyAdapter.ts
class OpponentStrategyAdapter extends OpponentStrategyPort {
  constructor(private strategy: OpponentStrategy) {}

  selectHandCard(round: Round): string {
    const opponentId = this.getOpponentId(round)

    return this.strategy.selectHandCard({
      handCards: round.hands[opponentId],
      fieldCards: round.field,
      depositoryCards: round.depositories[opponentId]
    })
  }

  selectMatchTarget(options: string[]): string {
    return this.strategy.selectMatchTarget({
      sourceCard: '', // 由 Core Game BC 提供上下文
      possibleTargets: options,
      depositoryCards: []
    })
  }

  makeKoiKoiDecision(yakus: Yaku[], baseScore: number): 'KOI_KOI' | 'STOP' {
    return this.strategy.makeKoiKoiDecision({
      currentYakus: yakus,
      baseScore,
      opponentKoiKoiCount: 0,
      remainingCards: 0
    })
  }

  private getOpponentId(round: Round): string {
    // 返回 AI 玩家 ID
  }
}
```

---

## 與 Core Game BC 的整合

Core Game BC 通過 `OpponentStrategyPort` 調用 Opponent BC：

```typescript
// Core Game BC 的 ExecuteOpponentTurnUseCase
class ExecuteOpponentTurnUseCase {
  constructor(
    private opponentStrategy: OpponentStrategyPort,
    // ...
  ) {}

  async execute(gameId: string): Promise<void> {
    // 1. 選擇手牌
    const cardId = this.opponentStrategy.selectHandCard(round)

    // 2. 執行操作...

    // 3. 若需要選擇配對目標
    const targetId = this.opponentStrategy.selectMatchTarget(options)

    // 4. 若有役種，做決策
    const decision = this.opponentStrategy.makeKoiKoiDecision(yakus, baseScore)
  }
}
```

---

## 策略切換

透過依賴注入切換不同策略：

```typescript
// server/utils/di.ts
function registerOpponentStrategy() {
  const strategy = new SimpleAIStrategy()
  return new OpponentStrategyAdapter(strategy)
}

// 未來可擴展
function registerOpponentStrategy(difficulty: 'easy' | 'normal' | 'hard') {
  const strategy = difficulty === 'hard'
    ? new AdvancedAIStrategy()
    : new SimpleAIStrategy()

  return new OpponentStrategyAdapter(strategy)
}
```

---

## 測試要求

### 整合測試

- ✅ **OpponentStrategyAdapter**: 測試與 Domain 的協調
- ✅ 測試策略切換

### 測試框架

- **工具**: Vitest

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Adapter Layer](./adapter.md)
- [Core Game BC - Application Layer](../core-game/application.md)
- [後端架構總覽](../architecture.md)
