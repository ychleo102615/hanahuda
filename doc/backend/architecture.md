# 後端架構總覽

## 技術棧

### 核心框架
- **Java 17+** (建議 Java 21 LTS)
- **Spring Boot 3.x**
- **Spring MVC** (REST API)
- **Spring WebFlux** (SSE 支援)
- **PostgreSQL 14+** (資料庫)

### 通訊協議
- **REST API**: 處理客戶端命令（加入遊戲、打牌、選擇配對、Koi-Koi 決策）
- **Server-Sent Events (SSE)**: 推送遊戲事件給客戶端

### 架構設計
- **Clean Architecture**: 嚴格分層（Domain → Application → Adapter → Framework）
- **Domain-Driven Design (DDD)**: Bounded Context、Aggregate、Entity、Value Object
- **微服務預備架構**: MVP 採用單體應用，但設計上預留微服務化路徑

---

## Bounded Context 劃分

### 1. Core Game BC（核心遊戲）

**職責**:
- 遊戲會話管理（Game Aggregate Root）
- 遊戲規則引擎（發牌、配對、役種檢測、分數計算）
- 回合流程控制（FlowStage 狀態機）
- SSE 事件推送
- 遊戲狀態持久化

**核心領域模型**:
- **Game** (Aggregate Root): 遊戲會話
- **Round**: 局
- **Card**: 卡牌（Value Object）
- **Yaku**: 役種（Value Object）
- **Player**: 玩家（Entity）

**詳細文檔**:
- [Core Game BC - Domain Layer](./core-game/domain.md)
- [Core Game BC - Application Layer](./core-game/application.md)
- [Core Game BC - Adapter Layer](./core-game/adapter.md)

---

### 2. Opponent BC（對手策略）

**職責**:
- 對手決策邏輯（選擇手牌、選擇配對目標、Koi-Koi 決策）
- 策略模式實作（簡易隨機策略、進階策略）

**核心領域模型**:
- **OpponentStrategy** (Interface): 對手策略介面
- **RandomStrategy**: 簡易隨機策略（MVP）
- **AdvancedStrategy**: 進階策略（Post-MVP）

**詳細文檔**:
- [Opponent BC - Domain Layer](./opponent/domain.md)
- [Opponent BC - Application Layer](./opponent/application.md)
- [Opponent BC - Adapter Layer](./opponent/adapter.md)

---

## Clean Architecture 分層

```
┌─────────────────────────────────────────────────────────────┐
│  Framework & Drivers Layer (最外層)                         │
│  ├─ Spring MVC (REST Controllers)                           │
│  ├─ Spring WebFlux (SSE Controllers)                        │
│  ├─ Spring Data JPA (PostgreSQL)                            │
│  └─ External Libraries                                      │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Adapter Layer (介面適配層)                           │ │
│  │  ├─ REST Controllers (遊戲命令接收)                   │ │
│  │  ├─ SSE Controllers (事件推送)                        │ │
│  │  ├─ DTOs (資料傳輸對象)                               │ │
│  │  ├─ Repository Adapters (JPA 實作)                   │ │
│  │  ├─ Event Publishers (SSE 實作)                      │ │
│  │  └─ Mappers (Domain ↔ DTO 轉換)                      │ │
│  │                                                        │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  Application Layer (應用業務規則層)             │ │ │
│  │  │  ├─ Use Cases (遊戲操作流程)                   │ │ │
│  │  │  │  ├─ JoinGameUseCase                         │ │ │
│  │  │  │  ├─ PlayHandCardUseCase                     │ │ │
│  │  │  │  ├─ SelectMatchedCardUseCase                │ │ │
│  │  │  │  ├─ MakeKoiKoiDecisionUseCase               │ │ │
│  │  │  │  ├─ ExecuteOpponentTurnUseCase              │ │ │
│  │  │  │  └─ DetectYakuUseCase                       │ │ │
│  │  │  ├─ Input Ports (命令介面)                      │ │ │
│  │  │  └─ Output Ports (Repository、Event Publisher) │ │ │
│  │  │                                                  │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │  Domain Layer (企業業務規則層)           │ │ │ │
│  │  │  │  ├─ Aggregates                           │ │ │ │
│  │  │  │  │  └─ Game (Aggregate Root)            │ │ │ │
│  │  │  │  ├─ Entities                             │ │ │ │
│  │  │  │  │  ├─ Round                             │ │ │ │
│  │  │  │  │  └─ Player                            │ │ │ │
│  │  │  │  ├─ Value Objects                        │ │ │ │
│  │  │  │  │  ├─ Card                              │ │ │ │
│  │  │  │  │  ├─ Yaku                              │ │ │ │
│  │  │  │  │  └─ FlowStage                         │ │ │ │
│  │  │  │  ├─ Domain Services                      │ │ │ │
│  │  │  │  │  ├─ GameRuleService                   │ │ │ │
│  │  │  │  │  └─ YakuDetectionService              │ │ │ │
│  │  │  │  └─ Repository Interfaces                │ │ │ │
│  │  │  │     ├─ GameRepository                    │ │ │ │
│  │  │  │     └─ EventRepository                   │ │ │ │
│  │  │  └───────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 依賴規則 (Dependency Rule)

- ✅ **依賴箭頭只能由外層指向內層**
- ✅ **Domain Layer 不依賴任何框架**（純 Java POJO）
- ✅ **Application Layer 定義 Port 介面，Adapter Layer 實作**
- ✅ **Adapter Layer 負責資料格式轉換**（Domain ↔ DTO）

---

## 目錄結構建議

```
src/main/java/com/hanafuda/
├─ domain/                          # Domain Layer
│  ├─ game/                         # Game Aggregate
│  │  ├─ Game.java                  # Aggregate Root
│  │  ├─ Round.java                 # Entity
│  │  ├─ Player.java                # Entity
│  │  ├─ Card.java                  # Value Object
│  │  ├─ Yaku.java                  # Value Object
│  │  ├─ FlowStage.java             # Enum
│  │  └─ GameRuleService.java       # Domain Service
│  ├─ opponent/                     # Opponent Aggregate
│  │  └─ OpponentStrategy.java      # Interface
│  └─ repository/                   # Repository Interfaces
│     ├─ GameRepository.java
│     └─ EventRepository.java
│
├─ application/                     # Application Layer
│  ├─ usecase/                      # Use Cases
│  │  ├─ JoinGameUseCase.java
│  │  ├─ PlayHandCardUseCase.java
│  │  ├─ SelectMatchedCardUseCase.java
│  │  ├─ MakeKoiKoiDecisionUseCase.java
│  │  ├─ ExecuteOpponentTurnUseCase.java
│  │  └─ DetectYakuUseCase.java
│  └─ port/                         # Port Interfaces
│     ├─ in/                        # Input Ports
│     │  ├─ JoinGameCommand.java
│     │  ├─ PlayHandCardCommand.java
│     │  └─ ...
│     └─ out/                       # Output Ports
│        ├─ LoadGamePort.java
│        ├─ SaveGamePort.java
│        └─ PublishEventPort.java
│
├─ adapter/                         # Adapter Layer
│  ├─ in/                           # Input Adapters
│  │  └─ web/
│  │     ├─ GameController.java     # REST API
│  │     ├─ GameEventController.java # SSE
│  │     └─ dto/
│  │        ├─ JoinGameRequestDTO.java
│  │        ├─ PlayCardRequestDTO.java
│  │        └─ ...
│  ├─ out/                          # Output Adapters
│  │  ├─ persistence/
│  │  │  ├─ GameRepositoryAdapter.java
│  │  │  ├─ entity/
│  │  │  │  ├─ GameEntity.java
│  │  │  │  └─ EventEntity.java
│  │  │  └─ mapper/
│  │  │     └─ GameMapper.java
│  │  └─ event/
│  │     └─ SSEEventPublisher.java
│  └─ config/
│     └─ BeanConfiguration.java     # DI 配置
│
└─ HanafudaApplication.java         # Spring Boot 主類別
```

---

## 微服務預備架構

### MVP 階段：單體應用

```
┌─────────────────────────────────────┐
│          Frontend (Vue 3)           │
└──────────────┬──────────────────────┘
               │ REST + SSE
               ↓
┌─────────────────────────────────────┐
│     Backend (Spring Boot Monolith)  │
│  ├─ Core Game BC                    │
│  └─ Opponent BC                     │
└──────────────┬──────────────────────┘
               │ JDBC
               ↓
┌─────────────────────────────────────┐
│         PostgreSQL                  │
└─────────────────────────────────────┘
```

### Phase 2：微服務拆分（Post-MVP）

```
┌─────────────────────────────────────┐
│          Frontend (Vue 3)           │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│         API Gateway (Spring Cloud)  │
└──────┬──────────────┬───────────────┘
       │              │
       ↓              ↓
┌─────────────┐  ┌─────────────────┐
│ Game Service│  │ Opponent Service│
│ (Core Game) │  │ (Strategies)    │
└──────┬──────┘  └────────┬─────────┘
       │                  │
       └──────┬───────────┘
              ↓
┌─────────────────────────────────────┐
│   Event Bus (Kafka / RabbitMQ)      │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  PostgreSQL Cluster + Redis Cluster │
└─────────────────────────────────────┘
```

### 微服務化路徑

1. **Phase 1 (MVP)**: 單體應用，清晰的 BC 邊界
2. **Phase 2**: 拆分 Opponent Service（獨立擴展對手策略）
3. **Phase 3**: 引入 User Service（帳號系統）、Matchmaking Service（多人對戰）
4. **Phase 4**: 完整分散式架構（Event Bus、分散式快取、資料庫分片）

---

## DI 配置（Spring Boot）

### 手動配置依賴注入

使用 Spring 的 `@Configuration` 和 `@Bean` 手動配置依賴注入，確保依賴方向正確。

```java
@Configuration
public class BeanConfiguration {

  // Domain Layer - 不依賴任何框架
  @Bean
  public GameRuleService gameRuleService() {
    return new GameRuleService();
  }

  @Bean
  public YakuDetectionService yakuDetectionService() {
    return new YakuDetectionService();
  }

  // Application Layer - Use Cases
  @Bean
  public JoinGameUseCase joinGameUseCase(
      LoadGamePort loadGamePort,
      SaveGamePort saveGamePort,
      PublishEventPort publishEventPort
  ) {
    return new JoinGameUseCase(loadGamePort, saveGamePort, publishEventPort);
  }

  @Bean
  public PlayHandCardUseCase playHandCardUseCase(
      LoadGamePort loadGamePort,
      SaveGamePort saveGamePort,
      PublishEventPort publishEventPort,
      GameRuleService gameRuleService
  ) {
    return new PlayHandCardUseCase(loadGamePort, saveGamePort, publishEventPort, gameRuleService);
  }

  // ... 其他 Use Cases

  // Adapter Layer - Output Adapters
  @Bean
  public LoadGamePort loadGamePort(GameRepository gameRepository) {
    return new GameRepositoryAdapter(gameRepository);
  }

  @Bean
  public SaveGamePort saveGamePort(GameRepository gameRepository) {
    return new GameRepositoryAdapter(gameRepository);
  }

  @Bean
  public PublishEventPort publishEventPort(SSEEventPublisher eventPublisher) {
    return eventPublisher;
  }

  // Spring Data JPA Repository (Framework Layer)
  // GameRepository 會自動由 Spring 掃描並註冊
}
```

---

## 資料庫設計原則

### MVP 階段：簡化設計

- **Game 表**: 儲存遊戲會話狀態（序列化為 JSON）
- **Event 表**: 儲存所有 SSE 事件（用於審計與重建狀態）
- **Session 表**: 儲存 session_token 與 game_id 映射（用於重連）

**優點**: 實作簡單，快速迭代
**缺點**: 查詢效能較低，不適合大規模擴展

### Phase 2：正規化設計

- **Game 表**: 儲存遊戲基本資訊
- **Round 表**: 儲存局資訊
- **Card 表**: 儲存卡牌狀態（手牌、場牌、已獲得牌）
- **Event 表**: 儲存事件
- **Session 表**: 儲存會話資訊

**優點**: 查詢效能高，支援複雜查詢
**缺點**: 實作複雜，資料庫遷移成本高

**建議**: MVP 採用簡化設計，Phase 2 再進行正規化

---

## API 設計原則

### RESTful 端點

遵循 [protocol.md](../shared/protocol.md) 定義的命令結構：

| 端點 | 方法 | 對應命令 | FlowStage |
|------|------|---------|-----------|
| `/api/v1/games/join` | POST | `GameRequestJoin` | N/A (初始化/重連) |
| `/api/v1/games/{gameId}/turns/play-card` | POST | `TurnPlayHandCard` | `AWAITING_HAND_PLAY` |
| `/api/v1/games/{gameId}/turns/select-match` | POST | `TurnSelectTarget` | `AWAITING_SELECTION` |
| `/api/v1/games/{gameId}/rounds/decision` | POST | `RoundMakeDecision` | `AWAITING_DECISION` |
| `/api/v1/games/{gameId}/events` | GET (SSE) | - | - |
| `/api/v1/games/{gameId}/snapshot` | GET | - | Fallback 用 |

### FlowStage 狀態機

遊戲流程由三個狀態驅動：

| 狀態值 | 說明 | 允許的命令 |
|--------|------|-----------|
| `AWAITING_HAND_PLAY` | 等待玩家打出手牌 | `TurnPlayHandCard` |
| `AWAITING_SELECTION` | 等待玩家選擇配對目標 | `TurnSelectTarget` |
| `AWAITING_DECISION` | 等待玩家做 Koi-Koi 決策 | `RoundMakeDecision` |

每個 SSE 事件包含 `next_state`，指示客戶端下一步應等待的命令。

---

## 參考文檔

### 核心文檔
- [共用數據契約](../shared/data-contracts.md)
- [通訊協議](../shared/protocol.md)
- [遊戲規則](../shared/game-rules.md)

### 後端模組
- [Core Game BC](./core-game/)
- [Opponent BC](./opponent/)

### 質量保證
- [測試策略](../quality/testing-strategy.md)
- [指標與標準](../quality/metrics.md)
