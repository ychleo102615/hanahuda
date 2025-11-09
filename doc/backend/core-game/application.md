# Core Game BC - Application Layer

## 職責

協調 Domain Layer 完成遊戲 Use Cases，定義 Input/Output Ports，不包含業務邏輯。

**核心原則**:
- ✅ **編排邏輯**: 協調 Domain Layer 的業務邏輯
- ✅ **Port 定義**: 定義輸入/輸出介面，由 Adapter Layer 實作
- ✅ **事務管理**: 確保操作的原子性
- ✅ **事件發布**: 通過 Output Ports 發布 SSE 事件

---

## Use Cases

### 1. JoinGameUseCase（加入遊戲/重連）

#### Input Port
```java
public interface JoinGameCommand {
  String getPlayerId();
  String getSessionToken();  // 重連時提供
}
```

#### Output Ports
```java
public interface LoadGamePort {
  Game findBySessionToken(String sessionToken);
}

public interface SaveGamePort {
  void save(Game game);
}

public interface PublishEventPort {
  void publishGameStarted(GameStartedEvent event);
  void publishGameSnapshotRestore(GameSnapshotRestoreEvent event);
}
```

#### 流程
1. 檢查 `session_token` 是否存在
2. 若存在且有效：發送 `GameSnapshotRestore` 事件（重連）
3. 若不存在：創建新遊戲，發送 `GameStarted` 事件
4. 調用 `StartNewRoundUseCase` 開始第一局

---

### 2. PlayHandCardUseCase（打出手牌）

#### Input Port
```java
public interface PlayHandCardCommand {
  String getGameId();
  String getPlayerId();
  String getCardId();
  String getTargetCardId();  // 可為 null
}
```

#### 流程
1. 載入 Game Aggregate
2. 驗證操作合法性（調用 GameRuleService）
3. 執行手牌配對（調用 Round.executeHandPlay）
4. 執行牌堆翻牌（調用 Round.executeDeckFlip）
5. 檢查是否需要選擇翻牌配對目標
   - 若需要：發送 `SelectionRequired` 事件，結束流程
6. 檢測役種（調用 YakuDetectionService）
   - 若有新役種：發送 `DecisionRequired` 事件，結束流程
7. 若無役種：發送 `TurnCompleted` 事件
8. 切換行動玩家
9. 若輪到對手：調用 `ExecuteOpponentTurnUseCase`

---

### 3. SelectMatchedCardUseCase（選擇配對目標）

#### Input Port
```java
public interface SelectMatchedCardCommand {
  String getGameId();
  String getPlayerId();
  String getSourceCardId();
  String getTargetCardId();
}
```

#### 流程
1. 載入 Game Aggregate
2. 驗證當前 FlowStage 是否為 `AWAITING_SELECTION`
3. 執行翻牌配對選擇（調用 Round.executeSelectionForDeckFlip）
4. 檢測役種
   - 若有新役種：發送 `DecisionRequired` 事件
   - 若無役種：發送 `TurnProgressAfterSelection` 事件
5. 切換行動玩家

---

### 4. MakeKoiKoiDecisionUseCase（Koi-Koi 決策）

#### Input Port
```java
public interface MakeKoiKoiDecisionCommand {
  String getGameId();
  String getPlayerId();
  KoiKoiDecision getDecision();  // KOI_KOI or END_ROUND
}
```

#### 流程
1. 載入 Game Aggregate
2. 驗證當前 FlowStage 是否為 `AWAITING_DECISION`
3. 若選擇 `END_ROUND`：
   - 計算最終得分（調用 ScoreCalculationService）
   - 更新累計分數
   - 發送 `RoundScored` 事件
   - 若達到總局數：發送 `GameFinished` 事件
   - 否則：調用 `StartNewRoundUseCase`
4. 若選擇 `KOI_KOI`：
   - 更新 Koi-Koi 倍率
   - 發送 `DecisionMade` 事件
   - 切換行動玩家

---

### 5. ExecuteOpponentTurnUseCase（執行對手回合）

#### Input Port
```java
public interface ExecuteOpponentTurnCommand {
  String getGameId();
}
```

#### 流程
1. 載入 Game Aggregate
2. 調用 Opponent BC 選擇手牌（通過 Port）
3. 自動選擇配對目標（若有多張可配對牌）
4. 執行手牌配對與翻牌
5. 處理翻牌選擇（若需要）
6. 檢測役種
7. 若有役種：調用 Opponent BC 做 Koi-Koi 決策
8. 發送對應事件
9. 切換行動玩家

---

### 6. DetectYakuUseCase（檢測役種）

#### Input Port
```java
public interface DetectYakuCommand {
  String getGameId();
  String getPlayerId();
}
```

#### 輸出
```java
public class YakuDetectionResult {
  private List<Yaku> newlyFormedYaku;
  private int baseScore;
}
```

#### 流程
1. 載入 Game Aggregate
2. 獲取玩家已獲得牌
3. 調用 YakuDetectionService 檢測所有役種
4. 返回結果

---

### 7. StartNewRoundUseCase（開始新局）

#### 流程
1. 載入 Game Aggregate
2. 創建新的 Deck 並洗牌
3. 創建新的 Round 並發牌
4. 檢測 Teshi（手四）
   - 若檢測到：發送 `RoundEndedInstantly` 事件，結算分數
5. 檢測場牌流局
   - 若檢測到：發送 `RoundEndedInstantly` 事件，重新發牌
6. 若無特殊情況：發送 `RoundDealt` 事件
7. 更新 FlowStage 為 `AWAITING_HAND_PLAY`

---

## Port 定義

### Input Ports（由 REST Controller 調用）

```java
public interface JoinGameUseCase {
  JoinGameResult execute(JoinGameCommand command);
}

public interface PlayHandCardUseCase {
  void execute(PlayHandCardCommand command);
}

public interface SelectMatchedCardUseCase {
  void execute(SelectMatchedCardCommand command);
}

public interface MakeKoiKoiDecisionUseCase {
  void execute(MakeKoiKoiDecisionCommand command);
}

public interface ExecuteOpponentTurnUseCase {
  void execute(ExecuteOpponentTurnCommand command);
}

public interface DetectYakuUseCase {
  YakuDetectionResult execute(DetectYakuCommand command);
}
```

### Output Ports（由 Adapter Layer 實作）

```java
// 資料持久化
public interface LoadGamePort {
  Game findById(GameId id);
  Game findBySessionToken(String sessionToken);
}

public interface SaveGamePort {
  void save(Game game);
}

// 事件發布
public interface PublishEventPort {
  void publishGameStarted(GameStartedEvent event);
  void publishRoundDealt(RoundDealtEvent event);
  void publishRoundEndedInstantly(RoundEndedInstantlyEvent event);
  void publishTurnCompleted(TurnCompletedEvent event);
  void publishSelectionRequired(SelectionRequiredEvent event);
  void publishTurnProgressAfterSelection(TurnProgressAfterSelectionEvent event);
  void publishDecisionRequired(DecisionRequiredEvent event);
  void publishDecisionMade(DecisionMadeEvent event);
  void publishRoundScored(RoundScoredEvent event);
  void publishRoundDrawn(RoundDrawnEvent event);
  void publishGameFinished(GameFinishedEvent event);
  void publishTurnError(TurnErrorEvent event);
  void publishGameSnapshotRestore(GameSnapshotRestoreEvent event);
}

// 對手策略（調用 Opponent BC）
public interface OpponentStrategyPort {
  String selectHandCard(String gameId, String opponentId);
  String selectMatchTarget(String gameId, List<String> possibleTargets);
  KoiKoiDecision makeKoiKoiDecision(String gameId, List<Yaku> currentYaku, int baseScore);
}
```

---

## 測試要求

### Use Case 測試

- ✅ **JoinGameUseCase**: 測試加入遊戲與重連流程
- ✅ **PlayHandCardUseCase**: 測試所有流程分支（無配對、單一配對、多重配對、役種形成）
- ✅ **SelectMatchedCardUseCase**: 驗證選擇邏輯與後續流程
- ✅ **MakeKoiKoiDecisionUseCase**: 測試繼續與結束兩種決策
- ✅ **ExecuteOpponentTurnUseCase**: 驗證對手自動操作流程
- ✅ **DetectYakuUseCase**: 測試役種檢測邏輯
- ✅ **StartNewRoundUseCase**: 測試發牌、Teshi 檢測、場牌流局檢測

### 測試策略

- 使用 Mock 實作 Output Ports
- 測試覆蓋率目標 > 80%

### 測試框架

- **工具**: JUnit 5
- **Mock 工具**: Mockito
- **斷言庫**: AssertJ

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Adapter Layer](./adapter.md)
- [共用數據契約](../../shared/data-contracts.md)
- [通訊協議](../../shared/protocol.md)
- [後端架構總覽](../architecture.md)
