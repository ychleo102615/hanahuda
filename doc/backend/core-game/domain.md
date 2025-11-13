# Core Game BC - Domain Layer

## 職責

實作花札遊戲的核心業務邏輯，提供純 Java POJO，不依賴任何框架。

**核心原則**:
- ✅ **純業務邏輯**: 不依賴 Spring、JPA 等任何框架
- ✅ **Aggregate Root**: Game 是聚合根，所有對遊戲狀態的修改都通過 Game
- ✅ **不可變性**: Value Object 不可變，確保狀態一致性
- ✅ **領域服務**: 跨多個 Entity 的業務邏輯封裝在 Domain Service
- ✅ **100% 測試覆蓋**: 所有業務邏輯必須有單元測試

---

## 核心領域模型

### 1. Game (Aggregate Root)

#### 職責
- 遊戲會話的聚合根
- 管理遊戲配置（規則集、總局數）
- 管理遊戲生命週期（初始化、進行中、結束）
- 維護累計分數
- 協調 Round Entity

#### 屬性

```java
public class Game {
  private GameId id;                        // 遊戲 ID (UUID)
  private Ruleset ruleset;                  // 規則集（Value Object）
  private List<Player> players;             // 玩家列表（通常為 2 人）
  private Map<PlayerId, Integer> cumulativeScores;  // 累計分數
  private int roundsPlayed;                 // 已進行局數
  private Round currentRound;               // 當前局
  private GameStatus status;                // 遊戲狀態（INITIALIZED, IN_PROGRESS, FINISHED）
}
```

#### 核心方法

```java
// 初始化遊戲
public static Game create(GameId id, Ruleset ruleset, List<Player> players)

// 開始新局
public void startNewRound(PlayerId dealerId)

// 更新累計分數
public void updateCumulativeScore(PlayerId playerId, int points)

// 判斷遊戲是否結束
public boolean isGameFinished()

// 獲取勝者
public PlayerId getWinner()
```

---

### 2. Round (Entity)

#### 職責
- 代表一局遊戲
- 管理卡牌分布（手牌、場牌、牌堆、已獲得牌）
- 管理回合流程（FlowStage 狀態機）
- 管理 Koi-Koi 狀態

#### 屬性

```java
public class Round {
  private RoundId id;                       // 局 ID
  private PlayerId dealerId;                // 莊家 ID
  private Map<PlayerId, List<Card>> hands;  // 手牌
  private List<Card> field;                 // 場牌
  private List<Card> deck;                  // 牌堆
  private Map<PlayerId, List<Card>> depositories;  // 已獲得牌
  private FlowStage flowStage;              // 流程狀態
  private PlayerId activePlayerId;          // 當前行動玩家
  private Map<PlayerId, KoiKoiStatus> koiKoiStatuses;  // Koi-Koi 狀態
  private RoundStatus status;               // 局狀態（IN_PROGRESS, ENDED）
}
```

#### 核心方法

```java
// 發牌（從 Deck 創建 Round）
public static Round deal(RoundId id, PlayerId dealerId, Deck shuffledDeck, List<PlayerId> playerIds)

// 檢測 Teshi（手四）
public boolean detectTeshi(PlayerId playerId)

// 檢測場牌流局
public boolean detectFieldKuttsuki()

// 執行打手牌操作
public CardPlay executeHandPlay(PlayerId playerId, Card handCard, Card targetCard)

// 執行翻牌操作
public CardPlay executeDeckFlip()

// 檢查翻牌是否需要選擇配對目標
public boolean requiresSelectionForDeckFlip()

// 執行翻牌配對選擇
public CardPlay executeSelectionForDeckFlip(Card targetCard)

// 更新 Koi-Koi 狀態
public void updateKoiKoiStatus(PlayerId playerId, KoiKoiDecision decision)

// 判斷局是否結束
public boolean isRoundOver()
```

---

### 3. Player (Entity)

#### 職責
- 代表玩家
- 儲存玩家基本資訊（ID、名稱）

#### 屬性

```java
public class Player {
  private PlayerId id;          // 玩家 ID
  private String name;          // 玩家名稱
  private PlayerType type;      // 玩家類型（HUMAN, OPPONENT）
}
```

---

### 4. Value Objects

#### Card（卡牌）

```java
public class Card {
  private final String cardId;       // 卡片 ID (MMTI 格式)
  private final int month;           // 月份 (1-12)
  private final CardType type;       // 卡牌類型 (BRIGHT, ANIMAL, RIBBON, DREG)
  private final String displayName;  // 顯示名稱

  // 不可變，僅提供 getters
}
```

#### Yaku（役種）

```java
public class Yaku {
  private final YakuType type;       // 役種類型 (GOKO, SHIKO, AKATAN, ...)
  private final int basePoints;      // 基礎分數

  // 不可變，僅提供 getters
}
```

#### FlowStage（流程狀態）

```java
public enum FlowStage {
  AWAITING_HAND_PLAY,      // 等待打手牌
  AWAITING_SELECTION,      // 等待選擇配對目標
  AWAITING_DECISION        // 等待 Koi-Koi 決策
}
```

#### KoiKoiStatus（Koi-Koi 狀態）

```java
public class KoiKoiStatus {
  private final PlayerId playerId;
  private final int multiplier;      // 當前倍率
  private final int calledCount;     // 呼叫 Koi-Koi 次數

  // 不可變，僅提供 getters

  // 創建新狀態（不修改現有對象）
  public KoiKoiStatus incrementMultiplier(int increment) {
    return new KoiKoiStatus(playerId, multiplier + increment, calledCount + 1);
  }
}
```

#### Ruleset（規則集）

```java
public class Ruleset {
  private final int totalRounds;          // 總局數
  private final int koiKoiMultiplier;     // Koi-Koi 倍數增量
  private final boolean sevenPointDouble; // 是否啟用 7 分倍增規則

  // 不可變，僅提供 getters
}
```

#### CardPlay（卡牌操作）

```java
public class CardPlay {
  private final Card playedCard;          // 打出/翻開的卡片
  private final List<Card> capturedCards; // 捕獲的卡片
  private final boolean stayedInField;    // 是否留在場上（無配對時）

  // 不可變，僅提供 getters
}
```

---

## Domain Services

### 1. GameRuleService（遊戲規則服務）

#### 職責
- 驗證操作合法性
- 處理配對邏輯
- 判斷遊戲結束條件

#### 核心方法

```java
// 驗證打手牌操作
public boolean isValidHandPlay(Round round, PlayerId playerId, Card handCard)

// 找出可配對的場牌
public List<Card> findMatchableFieldCards(Card handCard, List<Card> fieldCards)

// 執行配對
public CardPlay executeMatch(Card sourceCard, Card targetCard, List<Card> fieldCards)

// 判斷回合是否結束
public boolean isRoundOver(Round round)

// 判斷遊戲是否結束
public boolean isGameFinished(Game game)
```

---

### 2. YakuDetectionService（役種檢測服務）

#### 職責
- 檢測已形成的役種
- 計算基礎分數
- 處理役種衝突

#### MVP 實作 12 種常用役種

**光牌系（4 種）**:
- **五光 (15 點)**: 5 張光牌（0111, 0211, 0311, 0811, 1111）
- **四光 (10 點)**: 4 張光牌（不含雨 1111）
- **雨四光 (8 點)**: 4 張光牌（含雨 1111）
- **三光 (6 點)**: 3 張光牌（不含雨 1111）

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

#### 核心方法

```java
// 檢測所有已形成的役種
public List<Yaku> detectAllYaku(List<Card> depositoryCards)

// 檢測特定役種
public boolean hasGoko(List<Card> cards)         // 五光
public boolean hasShiko(List<Card> cards)        // 四光
public boolean hasAmeShiko(List<Card> cards)     // 雨四光
public boolean hasSanko(List<Card> cards)        // 三光
public boolean hasAkatan(List<Card> cards)       // 赤短
public boolean hasAotan(List<Card> cards)        // 青短
public boolean hasTanzaku(List<Card> cards)      // 短冊
public boolean hasInoshikacho(List<Card> cards)  // 豬鹿蝶
public boolean hasHanami(List<Card> cards)       // 花見酒
public boolean hasTsukimi(List<Card> cards)      // 月見酒
public boolean hasTane(List<Card> cards)         // 種
public boolean hasKasu(List<Card> cards)         // かす

// 解決役種衝突
public List<Yaku> resolveConflicts(List<Yaku> allYaku)

// 計算基礎分數
public int calculateBaseScore(List<Yaku> yakus)
```

---

### 3. ScoreCalculationService（分數計算服務）

#### 職責
- 計算最終得分（含倍率）
- 應用 Koi-Koi 倍率
- 應用 7 分倍增規則

#### 核心方法

```java
// 計算最終得分
public int calculateFinalScore(
  List<Yaku> yakus,
  KoiKoiStatus winnerKoiStatus,
  KoiKoiStatus opponentKoiStatus,
  boolean sevenPointDouble
)

// 計算倍率
public int calculateTotalMultiplier(
  int baseScore,
  KoiKoiStatus winnerKoiStatus,
  KoiKoiStatus opponentKoiStatus,
  boolean sevenPointDouble
)
```

---

## Repository Interfaces（定義在 Domain Layer）

### GameRepository

```java
public interface GameRepository {
  Game findById(GameId id);
  void save(Game game);
  void delete(GameId id);
}
```

### EventRepository

```java
public interface EventRepository {
  void save(GameEvent event);
  List<GameEvent> findByGameId(GameId gameId);
  List<GameEvent> findByGameIdAfter(GameId gameId, long eventId);
}
```

**實作由 Adapter Layer 提供（JPA）**

---

## 測試要求

### 單元測試覆蓋率

- ✅ **Game Aggregate**: 100% 覆蓋
  - 初始化、開始新局、更新分數、判斷結束

- ✅ **Round Entity**: 100% 覆蓋
  - 發牌、Teshi 檢測、場牌流局檢測
  - 打手牌、翻牌、配對邏輯
  - FlowStage 狀態轉換

- ✅ **Value Objects**: 100% 覆蓋
  - Card、Yaku、Ruleset 的建立與驗證
  - KoiKoiStatus 的狀態更新

- ✅ **GameRuleService**: 100% 覆蓋
  - 所有驗證邏輯
  - 配對邏輯的所有分支

- ✅ **YakuDetectionService**: 100% 覆蓋
  - 所有 12 種常用役種
  - 役種衝突解決
  - 邊界值測試

- ✅ **ScoreCalculationService**: 100% 覆蓋
  - Koi-Koi 倍率計算
  - 7 分倍增規則
  - 倍率疊加

### 測試框架

- **工具**: JUnit 5
- **斷言庫**: AssertJ
- **Mock 工具**: Mockito（僅用於 Repository 測試）

---

## 參考文檔

- [Application Layer](./application.md)
- [Adapter Layer](./adapter.md)
- [共用數據契約](../../shared/data-contracts.md)
- [通訊協議](../../shared/protocol.md)
- [遊戲規則](../../shared/game-rules.md)
- [後端架構總覽](../architecture.md)
