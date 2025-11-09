# Opponent BC - Domain Layer

## 職責

實作對手決策邏輯，提供策略模式介面。

---

## 核心介面

### OpponentStrategy（對手策略介面）

```java
public interface OpponentStrategy {
  // 選擇手牌
  String selectHandCard(
    List<String> hand,
    List<String> field,
    List<String> depository
  );

  // 選擇配對目標
  String selectMatchTarget(List<String> possibleTargets);

  // Koi-Koi 決策
  KoiKoiDecision makeKoiKoiDecision(
    List<Yaku> currentYaku,
    int baseScore,
    int opponentScore
  );
}
```

---

## MVP 實作：RandomStrategy

### 簡易隨機策略

```java
public class RandomStrategy implements OpponentStrategy {

  @Override
  public String selectHandCard(
    List<String> hand,
    List<String> field,
    List<String> depository
  ) {
    // 優先選擇能配對的牌，否則隨機選擇
    List<String> matchableCards = hand.stream()
      .filter(card -> hasMatch(card, field))
      .collect(Collectors.toList());

    if (!matchableCards.isEmpty()) {
      return randomSelect(matchableCards);
    }

    return randomSelect(hand);
  }

  @Override
  public String selectMatchTarget(List<String> possibleTargets) {
    return randomSelect(possibleTargets);
  }

  @Override
  public KoiKoiDecision makeKoiKoiDecision(
    List<Yaku> currentYaku,
    int baseScore,
    int opponentScore
  ) {
    // 簡單策略：基礎分數 < 5 繼續，>= 5 結束
    return baseScore < 5 ? KoiKoiDecision.KOI_KOI : KoiKoiDecision.END_ROUND;
  }

  private String randomSelect(List<String> cards) {
    int index = ThreadLocalRandom.current().nextInt(cards.size());
    return cards.get(index);
  }

  private boolean hasMatch(String card, List<String> field) {
    int month = getMonth(card);
    return field.stream().anyMatch(f -> getMonth(f) == month);
  }

  private int getMonth(String cardId) {
    return Integer.parseInt(cardId.substring(0, 2));
  }
}
```

---

## Post-MVP 擴展：AdvancedStrategy

### 進階策略（未來實作）

```java
public class AdvancedStrategy implements OpponentStrategy {

  @Override
  public String selectHandCard(...) {
    // 1. 計算每張牌的潛在價值（能否形成役種）
    // 2. 評估風險與收益
    // 3. 選擇價值最高的牌
  }

  @Override
  public KoiKoiDecision makeKoiKoiDecision(...) {
    // 1. 分析對手分數差距
    // 2. 評估當前役種進度
    // 3. 計算繼續遊戲的期望值
    // 4. 做出決策
  }
}
```

---

## 測試要求

- ✅ **RandomStrategy**: 測試隨機選擇的正確性
- ✅ **AdvancedStrategy**: 測試進階策略的正確性（Post-MVP）

---

## 參考文檔

- [Application Layer](./application.md)
- [Adapter Layer](./adapter.md)
- [後端架構總覽](../architecture.md)
