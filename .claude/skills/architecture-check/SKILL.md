---
name: architecture-check
description: Check code for Clean Architecture and DDD violations. Use when reviewing architecture compliance, checking recent changes, or auditing the entire project for CA/DDD issues.
user-invocable: true
---

# Architecture Check

通用的 Clean Architecture (CA) 與 Domain-Driven Design (DDD) 架構檢查工具。

## 使用方式

此 skill 支援三種檢查模式：

```
/architecture-check recent          # 檢查 git 最近的改動
/architecture-check full            # 檢查整個專案
/architecture-check path:<目標路徑>  # 檢查特定目錄或檔案
```

---

## 執行前準備

### 步驟 1：識別專案架構

首先掃描專案結構，識別：

1. **分層目錄結構**：尋找 `domain/`、`application/`、`adapter/`（或 `infrastructure/`）目錄
2. **Bounded Context**：識別各個 BC 的邊界（通常是頂層模組目錄）
3. **Ports 目錄**：尋找 `ports/input/`、`ports/output/` 結構
4. **共用契約**：尋找 `shared/`、`contracts/`、`common/` 等目錄

### 步驟 2：確認命名慣例

不同專案可能有不同命名：
- Domain：`domain/`、`core/`、`entities/`
- Application：`application/`、`use-cases/`、`usecases/`
- Adapter：`adapter/`、`adapters/`、`infrastructure/`、`infra/`
- Ports：`ports/`、`interfaces/`、`boundaries/`

---

## 檢查項目清單

### 1. 依賴方向違反 (Dependency Rule Violations)

**CA 核心原則**：依賴箭頭只能由外層指向內層

```
┌─────────────────────────────────┐
│  Adapter / Infrastructure       │  ← 最外層
│  ┌───────────────────────────┐  │
│  │  Application / Use Cases  │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  Domain / Core      │  │  │  ← 最內層
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

| 違反類型 | 嚴重程度 | 說明 |
|---------|---------|------|
| Domain → Application | 🔴 Critical | Domain 層 import Application 層 |
| Domain → Adapter | 🔴 Critical | Domain 層 import Adapter/Infrastructure 層 |
| Application → Adapter | 🔴 Critical | Application 層 import Adapter 層 |
| Domain → Framework | 🔴 Critical | Domain 層 import 框架（ORM、Web Framework 等） |
| Application → Framework | 🟠 High | Application 層 import 框架 |

**檢查方法**：
```bash
# 掃描 domain/ 目錄的 import
grep -r "from.*application\|from.*adapter\|from.*infrastructure" domain/

# 掃描 application/ 目錄的 import
grep -r "from.*adapter\|from.*infrastructure" application/
```

---

### 2. Port 方向違反 (Port Direction Violations)

**核心概念**：
- **Input Port**：Application 層定義，由 **UseCase 實作**，供 Adapter 呼叫
- **Output Port**：Application 層定義，由 **Adapter 實作**，供 UseCase 依賴

| 違反類型 | 嚴重程度 | 說明 |
|---------|---------|------|
| Adapter 持有 Output Port 引用 | 🔴 Critical | Adapter 應「實作」Output Port，不是「持有」 |
| UseCase 持有 Input Port 引用 | 🔴 Critical | UseCase 應「實作」Input Port，不是「持有」 |
| Adapter 實作 Input Port | 🟠 High | Input Port 應由 UseCase 實作 |
| UseCase 實作 Output Port | 🟠 High | Output Port 應由 Adapter 實作 |
| UseCase 直接依賴 Adapter 類別 | 🔴 Critical | 應透過 Output Port 抽象 |

**正確範例**：
```typescript
// ✅ UseCase 實作 Input Port，依賴 Output Port
class CreateOrderUseCase implements CreateOrderInputPort {
  constructor(
    private readonly orderRepository: OrderRepositoryPort,  // Output Port
    private readonly eventPublisher: EventPublisherPort     // Output Port
  ) {}

  execute(input: CreateOrderInput): CreateOrderOutput { ... }
}

// ✅ Adapter 實作 Output Port
class PostgresOrderRepository implements OrderRepositoryPort {
  save(order: Order): Promise<void> { ... }
}
```

**錯誤範例**：
```typescript
// ❌ Adapter 持有 Output Port（應該實作）
class OrderController {
  constructor(
    private readonly repository: OrderRepositoryPort  // 違反！Controller 不應持有 Output Port
  ) {}
}

// ❌ UseCase 持有 Input Port（應該實作）
class ProcessPaymentUseCase {
  constructor(
    private readonly createOrderPort: CreateOrderInputPort  // 違反！
  ) {}
}

// ❌ UseCase 直接依賴 Adapter
class CreateOrderUseCase {
  constructor(
    private readonly repository: PostgresOrderRepository  // 違反！應依賴 Port
  ) {}
}
```

---

### 3. UseCase 違反 (UseCase Violations)

| 違反類型 | 嚴重程度 | 說明 |
|---------|---------|------|
| UseCase 依賴 UseCase | 🔴 Critical | UseCase 之間不應互相依賴 |
| UseCase 直接實例化 Adapter | 🟠 High | 應透過 DI 注入 |
| UseCase 包含業務邏輯細節 | 🟡 Medium | 細節應委派給 Domain |
| UseCase 直接操作基礎設施 | 🔴 Critical | 應透過 Output Port |

**錯誤範例**：
```typescript
// ❌ UseCase 依賴 UseCase
class ProcessOrderUseCase {
  constructor(
    private readonly validateOrder: ValidateOrderUseCase,  // 違反！
    private readonly calculatePrice: CalculatePriceUseCase // 違反！
  ) {}
}

// ❌ UseCase 直接操作基礎設施
class SaveUserUseCase {
  async execute(user: User) {
    await fetch('/api/users', { ... })           // 違反！
    localStorage.setItem('user', JSON.stringify(user))  // 違反！
    await db.query('INSERT INTO users ...')      // 違反！
  }
}

// ❌ UseCase 直接實例化 Adapter
class GetUserUseCase {
  execute() {
    const repo = new PostgresUserRepository()  // 違反！應透過 DI
    return repo.findById(id)
  }
}
```

**正確做法**：UseCase 之間的協作應透過：
1. Domain Service（封裝跨 Entity 的業務邏輯）
2. Domain Events（事件驅動解耦）
3. Application Service / Orchestrator（高層協調）

---

### 4. Domain 層違反 (Domain Layer Violations)

| 違反類型 | 嚴重程度 | 說明 |
|---------|---------|------|
| Anemic Domain Model | 🟡 Medium | Entity 只有 getter/setter，沒有業務行為 |
| Mutable Value Object | 🟠 High | Value Object 應該是 immutable |
| Domain Service 依賴框架 | 🔴 Critical | Domain Service 應是純業務邏輯 |
| Aggregate 邊界不清 | 🟠 High | 跨 Aggregate 直接修改內部 Entity |
| Domain 暴露實作細節 | 🟡 Medium | Domain 不應暴露持久化或框架細節 |

**Anemic Domain Model 範例**：
```typescript
// ❌ 貧血模型：只有資料，沒有行為
class Order {
  id: string
  items: OrderItem[]
  status: string
  totalAmount: number
}

// ✅ 富模型：封裝業務邏輯
class Order {
  private constructor(
    readonly id: OrderId,
    private items: OrderItem[],
    private status: OrderStatus
  ) {}

  addItem(item: OrderItem): void {
    if (this.status !== OrderStatus.Draft) {
      throw new DomainError('Cannot add items to confirmed order')
    }
    this.items.push(item)
  }

  confirm(): void {
    if (this.items.length === 0) {
      throw new DomainError('Cannot confirm empty order')
    }
    this.status = OrderStatus.Confirmed
  }

  get totalAmount(): Money {
    return this.items.reduce((sum, item) => sum.add(item.subtotal), Money.zero())
  }
}
```

**Mutable Value Object 範例**：
```typescript
// ❌ 可變的 Value Object
class Money {
  amount: number  // 可被外部修改

  setAmount(value: number) {  // setter 使其可變
    this.amount = value
  }
}

// ✅ Immutable Value Object
class Money {
  private constructor(readonly amount: number, readonly currency: string) {
    Object.freeze(this)
  }

  static of(amount: number, currency: string): Money {
    return new Money(amount, currency)
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Currency mismatch')
    }
    return Money.of(this.amount + other.amount, this.currency)
  }
}
```

---

### 5. Adapter 層違反 (Adapter Layer Violations)

| 違反類型 | 嚴重程度 | 說明 |
|---------|---------|------|
| Controller 包含業務邏輯 | 🟠 High | Controller 應只做轉換和調用 UseCase |
| Repository 介面在 Adapter 層 | 🟠 High | Repository 介面應在 Domain 或 Application |
| DTO 在 Domain 層 | 🟠 High | DTO 應在 Adapter 層 |
| Mapper 邏輯過於複雜 | 🟡 Medium | 複雜映射可能暗示模型設計問題 |

**錯誤範例**：
```typescript
// ❌ Controller 包含業務邏輯
class OrderController {
  async createOrder(req: Request) {
    // 這些邏輯應該在 UseCase 或 Domain
    const discount = req.body.isVip ? 0.1 : 0
    const total = req.body.items.reduce((sum, i) => sum + i.price, 0)
    const finalPrice = total * (1 - discount)

    if (finalPrice > 10000) {
      // 業務規則不應在 Controller
      throw new Error('Order exceeds limit')
    }

    await this.repository.save({ ...req.body, finalPrice })
  }
}

// ✅ Controller 只做轉換和調用
class OrderController {
  async createOrder(req: Request) {
    const input = CreateOrderInputDto.fromRequest(req)
    const result = await this.createOrderUseCase.execute(input)
    return CreateOrderOutputDto.toResponse(result)
  }
}
```

---

### 6. Bounded Context 隔離違反 (BC Isolation Violations)

| 違反類型 | 嚴重程度 | 說明 |
|---------|---------|------|
| 跨 BC 直接 import Domain | 🟠 High | 應透過 Shared Kernel、事件或 ACL |
| 共享 Entity | 🟠 High | 跨 BC 應共享 Value Object 或 DTO |
| 缺乏 Anti-Corruption Layer | 🟡 Medium | 與外部系統整合應有 ACL |
| BC 之間循環依賴 | 🔴 Critical | BC 之間不應有循環依賴 |

**正確的跨 BC 通訊方式**：
```
BC-A                          BC-B
┌─────────────┐              ┌─────────────┐
│  Domain     │              │  Domain     │
│  ↓          │   Events     │  ↑          │
│  Application│ ──────────→  │  Application│
│  ↓          │   或 API     │  ↑          │
│  Adapter    │              │  Adapter    │
└─────────────┘              └─────────────┘
        ↓                           ↑
        └──── Shared Contracts ─────┘
              (DTOs, Events, IDs)
```

---

### 7. 其他常見違反 (Other Common Violations)

| 違反類型 | 嚴重程度 | 說明 |
|---------|---------|------|
| 循環依賴 | 🔴 Critical | 任何層級的循環 import |
| 硬編碼魔術字串/數字 | 🟡 Medium | 應使用常數、enum 或設定 |
| 重複定義相同結構的類型 | 🟡 Medium | 應 import 共用定義 |
| 過度使用 any/unknown | 🟡 Medium | 失去類型安全 |
| 缺乏錯誤邊界 | 🟡 Medium | 錯誤應在適當層級處理 |

---

## 報告格式

```markdown
# Architecture Check Report

## Summary
- **檢查模式**: [recent / full / path]
- **檢查範圍**: [描述]
- **檢查時間**: [timestamp]

### 違反統計
| 嚴重程度 | 數量 |
|---------|------|
| 🔴 Critical | X |
| 🟠 High | X |
| 🟡 Medium | X |
| **總計** | **X** |

---

## 🔴 Critical Violations

### [違反類型名稱]

**檔案**: `path/to/file.ts:line`

**問題描述**:
[具體說明違反了什麼原則]

**問題程式碼**:
```typescript
// 相關程式碼片段
```

**建議修復**:
[提供具體的修復方向，但不自動修改]

---

## 🟠 High Violations
...

## 🟡 Medium Violations
...

---

## Recommendations

1. [整體改善建議 1]
2. [整體改善建議 2]
...
```

---

## 注意事項

1. **僅檢查和報告**：此 skill 只負責檢查和報告，不會自動修改程式碼
2. **建議供參考**：修復建議僅供參考，最終決策由使用者決定
3. **專案適應性**：檢查前會先識別專案的目錄結構和命名慣例
4. **誤報處理**：若發現誤報，請告知以便調整檢查邏輯
5. **漸進式改善**：對於大型專案，建議先處理 Critical 違反，再逐步處理其他層級
