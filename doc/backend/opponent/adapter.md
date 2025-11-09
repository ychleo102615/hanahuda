# Opponent BC - Adapter Layer

## 職責

實作 `OpponentStrategyPort`，提供對手策略服務。

---

## OpponentStrategyAdapter

### 實作範例

```java
@Component
public class OpponentStrategyAdapter implements OpponentStrategyPort {

  private final OpponentStrategy strategy;
  private final LoadGamePort loadGamePort;

  public OpponentStrategyAdapter(
    OpponentStrategy strategy,
    LoadGamePort loadGamePort
  ) {
    this.strategy = strategy;
    this.loadGamePort = loadGamePort;
  }

  @Override
  public String selectHandCard(String gameId, String opponentId) {
    Game game = loadGamePort.findById(new GameId(gameId));
    Round round = game.getCurrentRound();

    List<String> hand = round.getHand(new PlayerId(opponentId));
    List<String> field = round.getField();
    List<String> depository = round.getDepository(new PlayerId(opponentId));

    return strategy.selectHandCard(hand, field, depository);
  }

  @Override
  public String selectMatchTarget(String gameId, List<String> possibleTargets) {
    return strategy.selectMatchTarget(possibleTargets);
  }

  @Override
  public KoiKoiDecision makeKoiKoiDecision(
    String gameId,
    List<Yaku> currentYaku,
    int baseScore
  ) {
    Game game = loadGamePort.findById(new GameId(gameId));
    Map<PlayerId, Integer> scores = game.getCumulativeScores();

    // 獲取對手分數（簡化示範）
    int opponentScore = scores.values().stream().findFirst().orElse(0);

    return strategy.makeKoiKoiDecision(currentYaku, baseScore, opponentScore);
  }
}
```

---

## DI 配置

```java
@Configuration
public class OpponentConfiguration {

  @Bean
  public OpponentStrategy opponentStrategy() {
    return new RandomStrategy();  // MVP 使用隨機策略
  }

  @Bean
  public OpponentStrategyPort opponentStrategyPort(
    OpponentStrategy strategy,
    LoadGamePort loadGamePort
  ) {
    return new OpponentStrategyAdapter(strategy, loadGamePort);
  }
}
```

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Application Layer](./application.md)
- [後端架構總覽](../architecture.md)
