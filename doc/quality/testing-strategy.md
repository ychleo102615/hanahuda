# 測試策略

## 概述

本專案遵循 Clean Architecture 原則，各層測試策略不同。目標是確保業務邏輯正確性、系統穩定性與可維護性。

---

## 測試層級

### 1. Domain Layer 測試

**目標**: 100% 測試覆蓋率

**策略**:
- ✅ **單元測試**: 測試所有業務邏輯
- ✅ **純函數**: 無需 Mock，直接測試輸入輸出
- ✅ **快速執行**: Domain Layer 測試應在 < 1 秒內完成

**測試重點**:
- **前端 (TypeScript)**:
  - 卡片邏輯（解析、驗證、分組）
  - 配對驗證（無配對、單一配對、多重配對）
  - 役種檢測（12 種常用役種 + 衝突解決）
  - 分數計算（Koi-Koi 倍率、7 分倍增）
  - 遊戲流程（發牌、Teshi 檢測、流局檢測）

- **後端 (Java)**:
  - Game Aggregate（初始化、回合控制、分數更新）
  - Round Entity（發牌、配對、流程狀態轉換）
  - GameRuleService（操作驗證、配對邏輯）
  - YakuDetectionService（12 種役種檢測）
  - ScoreCalculationService（分數計算）

**工具**:
- 前端: Vitest + expect
- 後端: JUnit 5 + AssertJ

**範例**:
```typescript
// 前端 (Vitest)
describe('YakuDetectionService', () => {
  it('should detect GOKO when all 5 bright cards are collected', () => {
    const cards = ['0111', '0211', '0311', '0811', '1111']
    const yakus = detectAllYaku(cards)
    expect(yakus).toContainEqual({ type: 'GOKO', basePoints: 15 })
  })
})
```

```java
// 後端 (JUnit 5 + AssertJ)
@Test
void shouldDetectGokoWhenAll5BrightCardsCollected() {
  List<Card> cards = List.of(
    Card.of("0111"), Card.of("0211"), Card.of("0311"),
    Card.of("0811"), Card.of("1111")
  );

  List<Yaku> yakus = yakuDetectionService.detectAllYaku(cards);

  assertThat(yakus).contains(new Yaku(YakuType.GOKO, 15));
}
```

---

### 2. Application Layer 測試

**目標**: > 90% 測試覆蓋率

**策略**:
- ✅ **整合測試**: 使用 Mock 測試 Use Case
- ✅ **驗證編排邏輯**: 確保 Use Case 正確調用 Domain Layer
- ✅ **驗證事件發布**: 確保事件正確發送

**測試重點**:
- **前端 (TypeScript)**:
  - 所有 SSE 事件處理 Use Cases
  - 命令發送邏輯
  - 狀態更新流程

- **後端 (Java)**:
  - JoinGameUseCase（加入/重連）
  - PlayHandCardUseCase（打手牌流程）
  - SelectMatchedCardUseCase（選擇配對）
  - MakeKoiKoiDecisionUseCase（Koi-Koi 決策）
  - ExecuteOpponentTurnUseCase（對手回合）

**工具**:
- 前端: Vitest + vi.fn() / vi.mock()
- 後端: JUnit 5 + Mockito

**範例**:
```java
@Test
void shouldPublishTurnCompletedEventWhenNoYakuFormed() {
  // Arrange
  Game game = createMockGame();
  when(loadGamePort.findById(any())).thenReturn(game);

  // Act
  playHandCardUseCase.execute(new PlayHandCardCommand(...));

  // Assert
  verify(publishEventPort).publishTurnCompleted(any(TurnCompletedEvent.class));
}
```

---

### 3. Adapter Layer 測試

**目標**: > 80% 測試覆蓋率

**策略**:
- ✅ **API 測試**: 測試所有 REST 端點
- ✅ **Repository 測試**: 測試資料持久化
- ✅ **Mapper 測試**: 測試 Domain ↔ DTO 轉換

**測試重點**:
- **前端 (TypeScript)**:
  - SSEGameClient（SSE 連線、事件接收）
  - APIClient（REST 命令發送）
  - Pinia Stores（狀態管理）

- **後端 (Java)**:
  - REST Controllers（所有端點）
  - SSE Controller（事件推送）
  - Repository Adapters（JPA 持久化）
  - Event Publisher（SSE 推送機制）
  - DTOs 與 Mappers（轉換邏輯）

**工具**:
- 前端: Vitest + MSW (Mock Service Worker)
- 後端: JUnit 5 + Spring Boot Test + MockMvc / WebTestClient + Testcontainers (PostgreSQL)

**範例**:
```java
@SpringBootTest
@AutoConfigureMockMvc
class GameControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void shouldReturnGameIdWhenJoining() throws Exception {
    mockMvc.perform(post("/api/v1/games/join")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"player_id\":\"player-1\"}"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.game_id").exists());
  }
}
```

---

### 4. E2E 測試（可選）

**目標**: 覆蓋關鍵使用者流程

**策略**:
- ✅ **完整遊戲流程**: 初始化 → 回合 → 結束
- ✅ **斷線重連**: 測試重連機制
- ✅ **錯誤處理**: 測試無效操作

**工具**:
- 前端: Playwright / Cypress

**範例流程**:
1. 打開首頁
2. 點擊「開始遊戲」
3. 驗證遊戲初始化（場牌、手牌顯示）
4. 打出手牌
5. 驗證配對動畫與狀態更新
6. 完成一局遊戲
7. 驗證分數更新

---

## 測試覆蓋率目標

| 層級 | 前端 | 後端 |
|------|------|------|
| Domain Layer | > 90% | > 90% |
| Application Layer | > 80% | > 80% |
| Adapter Layer | > 60% | > 70% |
| **整體目標** | **> 70%** | **> 80%** |

---

## CI/CD 整合

### GitHub Actions 工作流程

```yaml
name: Test

on: [push, pull_request]

jobs:
  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - run: npm run test:e2e

  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '17'
      - run: ./mvnw test
      - run: ./mvnw verify
```

---

## 測試最佳實踐

### 1. 命名規範

- ✅ **測試類別**: `{ClassName}Test`
- ✅ **測試方法**: `should{ExpectedBehavior}When{Condition}`

### 2. AAA 模式

- **Arrange**: 準備測試數據
- **Act**: 執行被測方法
- **Assert**: 驗證結果

### 3. 獨立性

- 每個測試應獨立運行，不依賴其他測試
- 使用 `beforeEach` / `@BeforeEach` 初始化測試環境

### 4. 可讀性

- 測試應清晰表達「測試什麼」、「為什麼重要」
- 使用有意義的變數名稱
- 避免過度抽象

---

## 參考文檔

- [指標與標準](./metrics.md)
- [前端架構總覽](../frontend/architecture.md)
- [後端架構總覽](../backend/architecture.md)
