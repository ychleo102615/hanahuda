# Core Game BC - Adapter Layer

## 職責

實作 Application Layer 定義的 Port 介面，處理 REST API、SSE 推送、資料持久化。

**核心原則**:
- ✅ **實作 Output Ports**: Repository、Event Publisher
- ✅ **提供 REST API**: 接收客戶端命令
- ✅ **SSE 事件推送**: 發送遊戲事件給客戶端
- ✅ **DTO 轉換**: Domain ↔ DTO 轉換

---

## REST Controllers

### 1. GameController

#### 端點
- `POST /api/v1/games/join` - 加入遊戲/重連

#### 實作範例

```java
@RestController
@RequestMapping("/api/v1/games")
public class GameController {

  private final JoinGameUseCase joinGameUseCase;

  @PostMapping("/join")
  public ResponseEntity<JoinGameResponseDTO> joinGame(
      @RequestBody @Valid JoinGameRequestDTO request
  ) {
    JoinGameCommand command = new JoinGameCommand(
      request.getPlayerId(),
      request.getSessionToken()
    );

    JoinGameResult result = joinGameUseCase.execute(command);

    JoinGameResponseDTO response = new JoinGameResponseDTO(
      result.getGameId(),
      result.getSessionToken(),
      result.isReconnect()
    );

    return ResponseEntity.ok(response);
  }
}
```

---

### 2. TurnController

#### 端點
- `POST /api/v1/games/{gameId}/turns/play-card` - 打出手牌
- `POST /api/v1/games/{gameId}/turns/select-match` - 選擇配對目標

#### 實作範例

```java
@RestController
@RequestMapping("/api/v1/games/{gameId}/turns")
public class TurnController {

  private final PlayHandCardUseCase playHandCardUseCase;
  private final SelectMatchedCardUseCase selectMatchedCardUseCase;

  @PostMapping("/play-card")
  public ResponseEntity<Void> playCard(
      @PathVariable String gameId,
      @RequestBody @Valid PlayCardRequestDTO request
  ) {
    PlayHandCardCommand command = new PlayHandCardCommand(
      gameId,
      request.getPlayerId(),
      request.getCardId(),
      request.getTarget()
    );

    playHandCardUseCase.execute(command);

    return ResponseEntity.ok().build();
  }

  @PostMapping("/select-match")
  public ResponseEntity<Void> selectMatch(
      @PathVariable String gameId,
      @RequestBody @Valid SelectMatchRequestDTO request
  ) {
    SelectMatchedCardCommand command = new SelectMatchedCardCommand(
      gameId,
      request.getPlayerId(),
      request.getSourceCardId(),
      request.getSelectedTargetId()
    );

    selectMatchedCardUseCase.execute(command);

    return ResponseEntity.ok().build();
  }
}
```

---

### 3. RoundController

#### 端點
- `POST /api/v1/games/{gameId}/rounds/decision` - Koi-Koi 決策

#### 實作範例

```java
@RestController
@RequestMapping("/api/v1/games/{gameId}/rounds")
public class RoundController {

  private final MakeKoiKoiDecisionUseCase makeKoiKoiDecisionUseCase;

  @PostMapping("/decision")
  public ResponseEntity<Void> makeDecision(
      @PathVariable String gameId,
      @RequestBody @Valid MakeDecisionRequestDTO request
  ) {
    MakeKoiKoiDecisionCommand command = new MakeKoiKoiDecisionCommand(
      gameId,
      request.getPlayerId(),
      request.getDecisionType()
    );

    makeKoiKoiDecisionUseCase.execute(command);

    return ResponseEntity.ok().build();
  }
}
```

---

### 4. GameEventController（SSE）

#### 端點
- `GET /api/v1/games/{gameId}/events` - SSE 事件流

#### 實作範例

```java
@RestController
@RequestMapping("/api/v1/games/{gameId}")
public class GameEventController {

  private final SSEEventPublisher eventPublisher;

  @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public Flux<ServerSentEvent<String>> streamEvents(
      @PathVariable String gameId,
      @RequestParam String sessionToken
  ) {
    // 驗證 session_token
    // ...

    // 訂閱事件流
    return eventPublisher.subscribe(gameId)
      .map(event -> ServerSentEvent.<String>builder()
        .id(String.valueOf(event.getEventId()))
        .event(event.getEventType())
        .data(event.toJson())
        .build());
  }
}
```

---

### 5. SnapshotController（Fallback）

#### 端點
- `GET /api/v1/games/{gameId}/snapshot` - 獲取遊戲狀態快照

#### 實作範例

```java
@RestController
@RequestMapping("/api/v1/games/{gameId}")
public class SnapshotController {

  private final LoadGamePort loadGamePort;

  @GetMapping("/snapshot")
  public ResponseEntity<GameSnapshotDTO> getSnapshot(
      @PathVariable String gameId,
      @RequestHeader("Authorization") String sessionToken
  ) {
    // 驗證 session_token
    // ...

    Game game = loadGamePort.findById(new GameId(gameId));

    GameSnapshotDTO snapshot = GameSnapshotMapper.toDTO(game);

    return ResponseEntity.ok(snapshot);
  }
}
```

---

## DTOs（資料傳輸對象）

### Request DTOs

```java
public class JoinGameRequestDTO {
  private String playerId;
  private String sessionToken;
  // getters, setters, validation
}

public class PlayCardRequestDTO {
  private String playerId;
  private String cardId;
  private String target;  // 可為 null
  // getters, setters, validation
}

public class SelectMatchRequestDTO {
  private String playerId;
  private String sourceCardId;
  private String selectedTargetId;
  // getters, setters, validation
}

public class MakeDecisionRequestDTO {
  private String playerId;
  private String decisionType;  // "KOI_KOI" or "END_ROUND"
  // getters, setters, validation
}
```

### Response DTOs

```java
public class JoinGameResponseDTO {
  private String gameId;
  private String sessionToken;
  private boolean isReconnect;
  // getters, setters
}

// SSE 事件 DTOs 遵循 protocol.md 定義
public class GameStartedEventDTO {
  private String myPlayerId;
  private List<PlayerDTO> players;
  private RulesetDTO ruleset;
  // getters, setters, toJson()
}

public class RoundDealtEventDTO {
  private String dealerId;
  private List<String> field;
  private List<PlayerHandDTO> hands;
  private int deckRemaining;
  private NextStateDTO nextState;
  // getters, setters, toJson()
}

// ... 其他事件 DTOs
```

---

## Repository Adapters

### GameRepositoryAdapter

#### 實作範例

```java
@Component
public class GameRepositoryAdapter implements LoadGamePort, SaveGamePort {

  private final JpaGameRepository jpaRepository;
  private final GameMapper mapper;

  @Override
  public Game findById(GameId id) {
    GameEntity entity = jpaRepository.findById(id.getValue())
      .orElseThrow(() -> new GameNotFoundException(id));

    return mapper.toDomain(entity);
  }

  @Override
  public Game findBySessionToken(String sessionToken) {
    GameEntity entity = jpaRepository.findBySessionToken(sessionToken)
      .orElseThrow(() -> new SessionNotFoundException(sessionToken));

    return mapper.toDomain(entity);
  }

  @Override
  public void save(Game game) {
    GameEntity entity = mapper.toEntity(game);
    jpaRepository.save(entity);
  }
}
```

### JPA Entities

#### MVP 實作：簡化設計（序列化為 JSON）

```java
@Entity
@Table(name = "games")
public class GameEntity {
  @Id
  private String id;

  @Column(columnDefinition = "jsonb")
  private String gameState;  // 序列化整個 Game Aggregate

  private String sessionToken;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;

  // getters, setters
}
```

**優點**: 實作簡單，快速迭代
**缺點**: 查詢效能較低，不適合大規模擴展

#### Post-MVP：正規化設計

```java
@Entity
@Table(name = "games")
public class GameEntity {
  @Id
  private String id;

  @Embedded
  private RulesetEntity ruleset;

  @OneToMany(mappedBy = "game", cascade = CascadeType.ALL)
  private List<PlayerEntity> players;

  @OneToMany(mappedBy = "game", cascade = CascadeType.ALL)
  private List<ScoreEntity> scores;

  @OneToOne(mappedBy = "game", cascade = CascadeType.ALL)
  private RoundEntity currentRound;

  private int roundsPlayed;
  private String status;

  // getters, setters
}

@Entity
@Table(name = "rounds")
public class RoundEntity {
  @Id
  private String id;

  @ManyToOne
  @JoinColumn(name = "game_id")
  private GameEntity game;

  @Column(columnDefinition = "jsonb")
  private String cardsState;  // 序列化卡牌狀態

  private String flowStage;
  private String activePlayerId;
  private String status;

  // getters, setters
}
```

---

## Event Publisher

### SSEEventPublisher

#### 實作範例

```java
@Component
public class SSEEventPublisher implements PublishEventPort {

  private final Map<String, Sinks.Many<GameEvent>> eventSinks = new ConcurrentHashMap<>();
  private final EventRepository eventRepository;
  private final AtomicLong eventIdCounter = new AtomicLong(0);

  public Flux<GameEvent> subscribe(String gameId) {
    Sinks.Many<GameEvent> sink = eventSinks.computeIfAbsent(
      gameId,
      id -> Sinks.many().multicast().onBackpressureBuffer()
    );

    return sink.asFlux();
  }

  @Override
  public void publishGameStarted(GameStartedEvent event) {
    publishEvent(event);
  }

  @Override
  public void publishRoundDealt(RoundDealtEvent event) {
    publishEvent(event);
  }

  // ... 其他事件

  private void publishEvent(GameEvent event) {
    // 設定事件 ID
    event.setEventId(eventIdCounter.incrementAndGet());
    event.setTimestamp(LocalDateTime.now());

    // 持久化事件
    eventRepository.save(event);

    // 推送給訂閱者
    Sinks.Many<GameEvent> sink = eventSinks.get(event.getGameId());
    if (sink != null) {
      sink.tryEmitNext(event);
    }
  }
}
```

---

## Mappers（Domain ↔ DTO 轉換）

### GameMapper

```java
@Component
public class GameMapper {

  public Game toDomain(GameEntity entity) {
    // 從 JSON 反序列化
    // 或從正規化表重建
  }

  public GameEntity toEntity(Game game) {
    // 序列化為 JSON
    // 或拆分為正規化表
  }
}
```

### EventMapper

```java
@Component
public class EventMapper {

  public GameStartedEventDTO toDTO(GameStartedEvent event) {
    return new GameStartedEventDTO(
      event.getMyPlayerId(),
      event.getPlayers().stream()
        .map(this::toPlayerDTO)
        .collect(Collectors.toList()),
      toRulesetDTO(event.getRuleset())
    );
  }

  // ... 其他事件轉換
}
```

---

## 錯誤處理

### 全域異常處理器

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(GameNotFoundException.class)
  public ResponseEntity<ErrorResponseDTO> handleGameNotFound(GameNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
      .body(new ErrorResponseDTO("GAME_NOT_FOUND", ex.getMessage()));
  }

  @ExceptionHandler(InvalidOperationException.class)
  public ResponseEntity<ErrorResponseDTO> handleInvalidOperation(InvalidOperationException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
      .body(new ErrorResponseDTO("INVALID_OPERATION", ex.getMessage()));
  }

  // ... 其他異常處理
}
```

---

## 測試要求

### 適配器測試

- ✅ **REST Controllers**: 測試所有端點（使用 MockMvc 或 WebTestClient）
- ✅ **Repository Adapters**: 測試資料持久化與查詢
- ✅ **Event Publisher**: 測試 SSE 推送機制
- ✅ **Mappers**: 測試 Domain ↔ DTO 轉換

### 整合測試

- ✅ 測試完整 API 流程（加入遊戲 → 回合 → 結束）
- ✅ 測試 SSE 事件推送
- ✅ 測試錯誤處理

### 測試框架

- **工具**: JUnit 5 + Spring Boot Test
- **Web 測試**: MockMvc / WebTestClient
- **資料庫測試**: Testcontainers (PostgreSQL)

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Application Layer](./application.md)
- [共用數據契約](../../shared/data-contracts.md)
- [通訊協議](../../shared/protocol.md)
- [後端架構總覽](../architecture.md)
