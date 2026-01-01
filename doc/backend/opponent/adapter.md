# Opponent BC - Adapter Layer

## 職責

提供 Opponent BC 與 Core Game BC 的整合介面。

**核心原則**:
- ✅ **依賴注入**: 在 DI 配置中註冊 OpponentStrategyPort 實作
- ✅ **策略工廠**: 根據配置選擇 AI 策略

---

## DI 配置

```typescript
// server/utils/opponent-di.ts
import { SimpleAIStrategy } from '../domain/opponent/simple-ai-strategy'
import { OpponentStrategyAdapter } from '../application/opponent/OpponentStrategyAdapter'

export function createOpponentStrategy(): OpponentStrategyPort {
  const strategy = new SimpleAIStrategy()
  return new OpponentStrategyAdapter(strategy)
}
```

---

## 使用方式

Core Game BC 的 Use Cases 透過依賴注入獲取 `OpponentStrategyPort`：

```typescript
// server/application/use-cases/ExecuteOpponentTurnUseCase.ts
class ExecuteOpponentTurnUseCase {
  constructor(
    private opponentStrategy: OpponentStrategyPort
  ) {}

  // ...
}

// 在 API Route 中組裝
const opponentStrategy = createOpponentStrategy()
const executeOpponentTurnUseCase = new ExecuteOpponentTurnUseCase(
  gameRepository,
  eventPublisher,
  gameLock,
  opponentStrategy
)
```

---

## 未來擴展

### 多難度支援

```typescript
type AIDifficulty = 'easy' | 'normal' | 'hard'

function createOpponentStrategy(difficulty: AIDifficulty): OpponentStrategyPort {
  const strategy = difficulty === 'hard'
    ? new AdvancedAIStrategy()
    : new SimpleAIStrategy()

  return new OpponentStrategyAdapter(strategy)
}
```

### 外部 AI 服務

未來可擴展為調用外部 AI 服務：

```typescript
class RemoteAIStrategy implements OpponentStrategy {
  constructor(private apiClient: AIServiceClient) {}

  async selectHandCard(params: SelectHandCardParams): Promise<string> {
    return this.apiClient.getMove(params)
  }
}
```

---

## 測試要求

- ✅ **DI 配置**: 驗證策略正確註冊
- ✅ **策略工廠**: 測試不同難度的策略創建

### 測試框架

- **工具**: Vitest

---

## 參考文檔

- [Domain Layer](./domain.md)
- [Application Layer](./application.md)
- [後端架構總覽](../architecture.md)
