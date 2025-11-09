# Opponent BC - Application Layer

## 職責

提供對手策略調用介面，協調 Domain Layer 策略實作。

---

## Use Case

### ExecuteOpponentActionUseCase

#### Input Port
```java
public interface ExecuteOpponentActionCommand {
  String getGameId();
  String getOpponentId();
  OpponentActionType getActionType();  // SELECT_HAND, SELECT_TARGET, MAKE_DECISION
  Map<String, Object> getContext();    // 根據 actionType 提供不同的上下文
}
```

#### 流程
1. 根據 `actionType` 調用對應的策略方法
2. 返回結果

---

## Port 定義

### Output Port
```java
public interface OpponentStrategyPort {
  String selectHandCard(String gameId, String opponentId);
  String selectMatchTarget(String gameId, List<String> possibleTargets);
  KoiKoiDecision makeKoiKoiDecision(String gameId, List<Yaku> currentYaku, int baseScore);
}
```

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Adapter Layer](./adapter.md)
- [後端架構總覽](../architecture.md)
