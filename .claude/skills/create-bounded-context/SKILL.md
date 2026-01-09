---
name: create-bounded-context
description: Create a new Bounded Context with Clean Architecture structure. Use when starting a new module, feature domain, or microservice following CA/DDD principles.
user-invocable: true
---

# Create Bounded Context

建立符合 Clean Architecture (CA) 與 Domain-Driven Design (DDD) 的 Bounded Context 模板與指導。

## 使用方式

```
/create-bounded-context <bc-name>
```

例如：
```
/create-bounded-context order-management
/create-bounded-context payment
/create-bounded-context notification
```

---

## 建立流程

### 步驟 1：收集資訊

在建立 BC 之前，需要確認：

1. **BC 名稱**：使用 kebab-case（如 `order-management`）
2. **放置位置**：前端或後端目錄
3. **核心 Entity**：這個 BC 管理的主要領域概念
4. **主要 Use Cases**：這個 BC 要支援的主要操作
5. **與其他 BC 的關係**：上游/下游依賴

### 步驟 2：建立目錄結構

```
<bc-name>/
├── domain/                    # 企業業務規則層（最內層）
│   ├── entities/              # Entity 定義
│   │   └── index.ts
│   ├── value-objects/         # Value Object 定義
│   │   └── index.ts
│   ├── services/              # Domain Services
│   │   └── index.ts
│   ├── events/                # Domain Events
│   │   └── index.ts
│   ├── errors/                # Domain Errors
│   │   └── index.ts
│   └── index.ts               # Domain 層公開 API
│
├── application/               # 應用業務規則層
│   ├── ports/
│   │   ├── input/             # Input Ports (Use Case 介面)
│   │   │   └── index.ts
│   │   └── output/            # Output Ports (Repository, External Services)
│   │       └── index.ts
│   ├── use-cases/             # Use Case 實作
│   │   └── index.ts
│   ├── dtos/                  # Application DTOs (可選)
│   │   └── index.ts
│   └── index.ts               # Application 層公開 API
│
├── adapter/                   # 介面適配層
│   ├── driving/               # Driving Adapters (進入系統)
│   │   ├── rest/              # REST Controllers
│   │   ├── graphql/           # GraphQL Resolvers (可選)
│   │   └── cli/               # CLI Commands (可選)
│   ├── driven/                # Driven Adapters (離開系統)
│   │   ├── persistence/       # Repository 實作
│   │   ├── messaging/         # Message Queue Adapters
│   │   └── external/          # External API Clients
│   ├── mappers/               # DTO <-> Domain 映射
│   │   └── index.ts
│   ├── di/                    # Dependency Injection（BC 內部組裝）
│   │   ├── container.ts       # BC Container 定義
│   │   └── index.ts
│   └── index.ts               # Adapter 層公開 API
│
└── index.ts                   # BC 公開 API (給其他 BC 使用)
```

**Framework Layer（最外層，通常在 BC 之外）**：
```
project-root/
├── <bc-name-1>/               # Bounded Context 1
├── <bc-name-2>/               # Bounded Context 2
├── shared/                    # 共用契約、Value Objects
│   ├── contracts/
│   └── kernel/
│
└── bootstrap/                 # Framework Layer - Composition Root
    ├── di/
    │   ├── container.ts       # 主 DI Container
    │   ├── modules/           # 各 BC 的 DI Module
    │   │   ├── <bc-name-1>.module.ts
    │   │   └── <bc-name-2>.module.ts
    │   └── index.ts
    ├── config/                # 環境配置
    │   └── index.ts
    └── index.ts               # Application Entry Point
```

### 步驟 3：建立基礎檔案

依序建立各層的基礎檔案。

---

## 檔案模板

### Domain Layer

#### Entity 模板

```typescript
// domain/entities/<entity-name>.ts

import type { EntityId } from '../value-objects/<id-name>'

/**
 * <Entity 描述>
 *
 * Aggregate Root: [是/否]
 * Invariants:
 *   - [不變條件 1]
 *   - [不變條件 2]
 */
export class <EntityName> {
  private constructor(
    private readonly _id: EntityId,
    private _state: <EntityState>,
    // ... 其他屬性
  ) {}

  // ========== Factory Methods ==========

  static create(params: Create<EntityName>Params): <EntityName> {
    // 驗證業務規則
    // 建立實例
    return new <EntityName>(/*...*/)
  }

  static reconstitute(data: <EntityName>Data): <EntityName> {
    // 從持久化資料重建（不驗證，因為資料已經驗證過）
    return new <EntityName>(/*...*/)
  }

  // ========== Getters ==========

  get id(): EntityId {
    return this._id
  }

  // ========== Business Methods ==========

  /**
   * [方法描述]
   * @throws {DomainError} [錯誤條件]
   */
  doSomething(params: DoSomethingParams): void {
    // 驗證前置條件
    this.ensureCanDoSomething()

    // 執行業務邏輯
    this._state = /*...*/
  }

  // ========== Private Methods ==========

  private ensureCanDoSomething(): void {
    if (/* 違反條件 */) {
      throw new <DomainError>('錯誤訊息')
    }
  }
}

// ========== Supporting Types ==========

interface Create<EntityName>Params {
  // ...
}

interface <EntityName>Data {
  // 持久化資料結構
}
```

#### Value Object 模板

```typescript
// domain/value-objects/<vo-name>.ts

/**
 * <Value Object 描述>
 *
 * Immutable: 是
 * Equality: 基於值比較
 */
export class <ValueObjectName> {
  private constructor(
    private readonly _value: <InternalType>
  ) {
    Object.freeze(this)
  }

  // ========== Factory Methods ==========

  static of(value: <InputType>): <ValueObjectName> {
    this.validate(value)
    return new <ValueObjectName>(value)
  }

  static fromString(str: string): <ValueObjectName> {
    // 從字串解析
    return <ValueObjectName>.of(/*...*/)
  }

  // ========== Getters ==========

  get value(): <InternalType> {
    return this._value
  }

  // ========== Operations ==========

  /**
   * 返回新的 Value Object（immutable）
   */
  with<Property>(newValue: <Type>): <ValueObjectName> {
    return new <ValueObjectName>(/*...*/)
  }

  // ========== Equality ==========

  equals(other: <ValueObjectName>): boolean {
    return this._value === other._value
  }

  // ========== Serialization ==========

  toString(): string {
    return String(this._value)
  }

  toJSON(): <JsonType> {
    return this._value
  }

  // ========== Validation ==========

  private static validate(value: <InputType>): void {
    if (/* 無效條件 */) {
      throw new InvalidValueError('<ValueObjectName>', value, '原因')
    }
  }
}
```

#### Domain Service 模板

```typescript
// domain/services/<service-name>.ts

/**
 * <Domain Service 描述>
 *
 * 用途：封裝不屬於單一 Entity 的業務邏輯
 * 注意：Domain Service 應該是無狀態的純函數
 */

/**
 * [函數描述]
 */
export function <operationName>(
  params: <OperationParams>
): <OperationResult> {
  // 純業務邏輯，不依賴任何框架或基礎設施
  return /*...*/
}

// 或使用 class 形式（如果需要組合多個相關操作）

export class <ServiceName>Service {
  /**
   * [方法描述]
   */
  static <operationName>(params: <OperationParams>): <OperationResult> {
    return /*...*/
  }
}
```

#### Domain Event 模板

```typescript
// domain/events/<event-name>.ts

/**
 * <Event 描述>
 *
 * 觸發時機：[描述何時會產生此事件]
 */
export class <EventName>Event {
  readonly eventType = '<EventName>' as const
  readonly occurredAt: Date

  constructor(
    readonly aggregateId: string,
    readonly payload: <EventPayload>,
    occurredAt?: Date
  ) {
    this.occurredAt = occurredAt ?? new Date()
    Object.freeze(this)
  }
}

interface <EventPayload> {
  // 事件攜帶的資料
}
```

#### Domain Error 模板

```typescript
// domain/errors/<error-name>.ts

/**
 * <Error 描述>
 */
export class <ErrorName>Error extends Error {
  readonly code = '<ERROR_CODE>' as const

  constructor(
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = '<ErrorName>Error'
  }
}

// 通用的 Domain Error 基類
export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
```

---

### Application Layer

#### Input Port 模板

```typescript
// application/ports/input/<use-case-name>.port.ts

/**
 * <Use Case 描述>
 *
 * Actor: [誰會使用這個 Use Case]
 * Preconditions: [前置條件]
 * Postconditions: [後置條件]
 */
export abstract class <UseCaseName>Port {
  abstract execute(input: <UseCaseName>Input): Promise<<UseCaseName>Output>
}

// Input DTO
export interface <UseCaseName>Input {
  // 輸入參數
}

// Output DTO
export interface <UseCaseName>Output {
  // 輸出結果
}

// 或使用 Result 類型處理錯誤
export type <UseCaseName>Result =
  | { success: true; data: <UseCaseName>Output }
  | { success: false; error: <ErrorType> }
```

#### Output Port 模板

```typescript
// application/ports/output/<port-name>.port.ts

/**
 * <Output Port 描述>
 *
 * 實作者：Adapter 層
 * 用途：[Repository / External Service / Event Publisher 等]
 */
export abstract class <PortName>Port {
  /**
   * [方法描述]
   */
  abstract <methodName>(params: <MethodParams>): Promise<<MethodResult>>
}

// Repository Port 範例
export abstract class <EntityName>RepositoryPort {
  abstract findById(id: EntityId): Promise<<EntityName> | null>
  abstract findAll(criteria?: <SearchCriteria>): Promise<<EntityName>[]>
  abstract save(entity: <EntityName>): Promise<void>
  abstract delete(id: EntityId): Promise<void>
}

// Event Publisher Port 範例
export abstract class <EventName>PublisherPort {
  abstract publish(event: <EventName>Event): Promise<void>
}

// External Service Port 範例
export abstract class <ServiceName>Port {
  abstract <operation>(params: <Params>): Promise<<Result>>
}
```

#### Use Case 模板

```typescript
// application/use-cases/<use-case-name>.use-case.ts

import { <UseCaseName>Port, <UseCaseName>Input, <UseCaseName>Output } from '../ports/input/<use-case-name>.port'
import { <RepositoryName>Port } from '../ports/output/<repository-name>.port'
import { <Entity> } from '../../domain/entities/<entity>'

/**
 * <Use Case 描述>
 *
 * 實作 Input Port: <UseCaseName>Port
 * 依賴 Output Ports:
 *   - <RepositoryName>Port
 *   - <OtherPort>
 */
export class <UseCaseName>UseCase implements <UseCaseName>Port {
  constructor(
    private readonly <repository>: <RepositoryName>Port,
    // ... 其他 Output Port 依賴
  ) {}

  async execute(input: <UseCaseName>Input): Promise<<UseCaseName>Output> {
    // 1. 驗證輸入（Application 層驗證）
    this.validateInput(input)

    // 2. 取得/建立 Domain 物件
    const entity = await this.<repository>.findById(input.id)
    if (!entity) {
      throw new NotFoundError('<Entity>', input.id)
    }

    // 3. 執行業務邏輯（委派給 Domain）
    entity.doSomething(input.params)

    // 4. 持久化
    await this.<repository>.save(entity)

    // 5. 返回結果
    return this.toOutput(entity)
  }

  private validateInput(input: <UseCaseName>Input): void {
    // Application 層輸入驗證
  }

  private toOutput(entity: <Entity>): <UseCaseName>Output {
    return {
      // 映射到 Output DTO
    }
  }
}
```

---

### Adapter Layer

#### Driving Adapter (Controller) 模板

```typescript
// adapter/driving/rest/<entity>-controller.ts

import { <UseCaseName>Port } from '../../application/ports/input/<use-case-name>.port'
import { <RequestDto>, <ResponseDto> } from '../mappers/<entity>-mapper'

/**
 * <Controller 描述>
 *
 * 職責：
 *   - HTTP Request/Response 處理
 *   - DTO 轉換
 *   - 呼叫 Use Case
 *   - 錯誤映射到 HTTP Status
 */
export class <Entity>Controller {
  constructor(
    private readonly <useCaseName>: <UseCaseName>Port,
    // ... 其他 Input Port
  ) {}

  /**
   * [Endpoint 描述]
   * POST /api/<entities>
   */
  async create(request: <CreateRequest>): Promise<<CreateResponse>> {
    // 1. 轉換 Request -> Input DTO
    const input = <RequestDto>.toInput(request)

    // 2. 呼叫 Use Case
    const result = await this.<useCaseName>.execute(input)

    // 3. 轉換 Output -> Response DTO
    return <ResponseDto>.fromOutput(result)
  }
}
```

#### Driven Adapter (Repository) 模板

```typescript
// adapter/driven/persistence/<entity>-repository.ts

import { <EntityName>RepositoryPort } from '../../application/ports/output/<entity>-repository.port'
import { <EntityName> } from '../../domain/entities/<entity>'
import { <EntityName>Mapper } from '../mappers/<entity>-mapper'

/**
 * <Repository 描述>
 *
 * 實作 Output Port: <EntityName>RepositoryPort
 * 使用技術：[Drizzle ORM / TypeORM / Prisma / etc.]
 */
export class <EntityName>Repository implements <EntityName>RepositoryPort {
  constructor(
    private readonly db: <DatabaseClient>
  ) {}

  async findById(id: EntityId): Promise<<EntityName> | null> {
    const record = await this.db
      .select()
      .from(<tableName>)
      .where(eq(<tableName>.id, id.value))
      .get()

    if (!record) return null

    return <EntityName>Mapper.toDomain(record)
  }

  async save(entity: <EntityName>): Promise<void> {
    const record = <EntityName>Mapper.toPersistence(entity)

    await this.db
      .insert(<tableName>)
      .values(record)
      .onConflictDoUpdate({
        target: <tableName>.id,
        set: record
      })
  }

  async delete(id: EntityId): Promise<void> {
    await this.db
      .delete(<tableName>)
      .where(eq(<tableName>.id, id.value))
  }
}
```

#### Mapper 模板

```typescript
// adapter/mappers/<entity>-mapper.ts

import { <EntityName> } from '../../domain/entities/<entity>'
import type { <TableRecord> } from '../driven/persistence/schema'

/**
 * <Mapper 描述>
 *
 * 負責 Domain Entity 與外部格式的雙向轉換
 */
export class <EntityName>Mapper {
  /**
   * 持久化格式 -> Domain Entity
   */
  static toDomain(record: <TableRecord>): <EntityName> {
    return <EntityName>.reconstitute({
      id: record.id,
      // ... 映射其他欄位
    })
  }

  /**
   * Domain Entity -> 持久化格式
   */
  static toPersistence(entity: <EntityName>): <TableRecord> {
    return {
      id: entity.id.value,
      // ... 映射其他欄位
    }
  }

  /**
   * Domain Entity -> Response DTO
   */
  static toResponse(entity: <EntityName>): <ResponseDto> {
    return {
      id: entity.id.toString(),
      // ... 映射其他欄位
    }
  }
}
```

---

### Framework Layer (Composition Root)

Framework Layer 是 Clean Architecture 的最外層，負責：
1. **組裝所有依賴**（Composition Root）
2. **框架整合**（Web Framework、ORM、Message Queue）
3. **環境配置**（Environment Variables、Feature Flags）
4. **應用程式進入點**（Bootstrap）

#### DI Container 設計原則

```
┌─────────────────────────────────────────────────────────────┐
│                    Composition Root                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Main DI Container                    │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │    │
│  │  │ BC-A Module │ │ BC-B Module │ │ Shared Deps │   │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│           ┌───────────────┼───────────────┐                 │
│           ▼               ▼               ▼                 │
│    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│    │  Adapter A  │ │  Adapter B  │ │  Adapter C  │         │
│    └─────────────┘ └─────────────┘ └─────────────┘         │
└─────────────────────────────────────────────────────────────┘

重點：
- DI Container 只存在於最外層
- 內層（Domain, Application）不知道 DI Container 的存在
- 依賴注入透過 Constructor Injection
```

#### BC 內部 Container 模板（Pure DI 風格）

```typescript
// adapter/di/container.ts

import type { <InputPort1>Port } from '../../application/ports/input/<port1>.port'
import type { <InputPort2>Port } from '../../application/ports/input/<port2>.port'
import type { <OutputPort1>Port } from '../../application/ports/output/<port1>.port'
import type { <OutputPort2>Port } from '../../application/ports/output/<port2>.port'

import { <UseCase1>UseCase } from '../../application/use-cases/<use-case1>.use-case'
import { <UseCase2>UseCase } from '../../application/use-cases/<use-case2>.use-case'
import { <Repository1>Repository } from '../driven/persistence/<repository1>.repository'
import { <ExternalService>Adapter } from '../driven/external/<service>.adapter'

/**
 * <BC Name> Bounded Context 的依賴容器
 *
 * 職責：
 *   - 組裝 BC 內部所有依賴
 *   - 提供 Input Ports 給外部使用
 *   - 管理 Adapter 實例的生命週期
 *
 * 注意：
 *   - 這是 BC 的唯一組裝點
 *   - 外部只能透過 Input Ports 與此 BC 互動
 */
export interface <BcName>ContainerDeps {
  // 外部依賴（由上層 Container 注入）
  readonly db: DatabaseClient
  readonly config: <BcName>Config
  // 跨 BC 依賴（透過 Port，非直接依賴）
  readonly externalServicePort?: ExternalServicePort
}

export interface <BcName>Container {
  // 暴露 Input Ports（供 Controller 或其他 BC 使用）
  readonly <useCase1>: <InputPort1>Port
  readonly <useCase2>: <InputPort2>Port
}

/**
 * 建立 BC Container
 *
 * @param deps - 外部依賴
 * @returns 組裝完成的 Container
 */
export function create<BcName>Container(deps: <BcName>ContainerDeps): <BcName>Container {
  // ========== 1. 建立 Driven Adapters (Output Port 實作) ==========
  const <repository1>: <OutputPort1>Port = new <Repository1>Repository(deps.db)
  const <repository2>: <OutputPort2>Port = new <Repository2>Repository(deps.db)
  const <externalAdapter>: <OutputPort3>Port = new <ExternalService>Adapter(deps.config)

  // ========== 2. 建立 Use Cases (Input Port 實作) ==========
  const <useCase1>: <InputPort1>Port = new <UseCase1>UseCase(
    <repository1>,
    <externalAdapter>
  )

  const <useCase2>: <InputPort2>Port = new <UseCase2>UseCase(
    <repository1>,
    <repository2>
  )

  // ========== 3. 返回 Container ==========
  return {
    <useCase1>,
    <useCase2>
  }
}
```

#### BC 內部 Container 模板（Class 風格）

```typescript
// adapter/di/container.ts

/**
 * <BC Name> Container - Class 風格
 *
 * 使用 Lazy Initialization 確保依賴只在需要時建立
 */
export class <BcName>Container {
  // Singleton instances（惰性初始化）
  private _<repository1>?: <OutputPort1>Port
  private _<useCase1>?: <InputPort1>Port

  constructor(private readonly deps: <BcName>ContainerDeps) {}

  // ========== Output Ports (Driven Adapters) ==========

  private get <repository1>(): <OutputPort1>Port {
    if (!this._<repository1>) {
      this._<repository1> = new <Repository1>Repository(this.deps.db)
    }
    return this._<repository1>
  }

  // ========== Input Ports (Use Cases) ==========

  get <useCase1>(): <InputPort1>Port {
    if (!this._<useCase1>) {
      this._<useCase1> = new <UseCase1>UseCase(
        this.<repository1>,
        this.<externalAdapter>
      )
    }
    return this._<useCase1>
  }

  // ========== Lifecycle ==========

  /**
   * 釋放資源（如 DB 連線）
   */
  async dispose(): Promise<void> {
    // 清理需要釋放的資源
  }
}
```

#### 主 DI Container 模板（Composition Root）

```typescript
// bootstrap/di/container.ts

import { create<BcA>Container, type <BcA>Container } from '../../<bc-a>/adapter/di'
import { create<BcB>Container, type <BcB>Container } from '../../<bc-b>/adapter/di'

/**
 * Application Root Container
 *
 * 這是整個應用程式的 Composition Root
 * 負責組裝所有 BC 並處理跨 BC 依賴
 */
export interface AppContainerDeps {
  readonly db: DatabaseClient
  readonly config: AppConfig
  readonly eventBus: EventBus
}

export interface AppContainer {
  readonly <bcA>: <BcA>Container
  readonly <bcB>: <BcB>Container
  dispose(): Promise<void>
}

export function createAppContainer(deps: AppContainerDeps): AppContainer {
  // ========== 1. 建立共用基礎設施 ==========
  const eventPublisher = new EventBusPublisher(deps.eventBus)
  const logger = new Logger(deps.config.logLevel)

  // ========== 2. 建立各 BC Container ==========

  // BC-A 不依賴其他 BC
  const <bcA> = create<BcA>Container({
    db: deps.db,
    config: deps.config.<bcA>,
    eventPublisher
  })

  // BC-B 依賴 BC-A 的某個能力（透過 Port）
  const <bcB> = create<BcB>Container({
    db: deps.db,
    config: deps.config.<bcB>,
    // 跨 BC 依賴：注入 BC-A 的 Input Port
    <bcA>Service: <bcA>.<someUseCase>
  })

  // ========== 3. 設定事件訂閱（跨 BC 通訊）==========
  deps.eventBus.subscribe('<EventFromBcA>', async (event) => {
    await <bcB>.handleEventFromBcA.execute(event)
  })

  // ========== 4. 返回 Container ==========
  return {
    <bcA>,
    <bcB>,
    async dispose() {
      // 按照依賴的反向順序釋放
      await <bcB>.dispose?.()
      await <bcA>.dispose?.()
    }
  }
}
```

#### BC Module 模板（模組化風格）

```typescript
// bootstrap/di/modules/<bc-name>.module.ts

import type { AppContainerDeps } from '../container'
import { create<BcName>Container } from '../../../<bc-name>/adapter/di'

/**
 * <BC Name> Module
 *
 * 定義此 BC 如何被組裝到主 Container
 * 包含依賴解析和跨 BC 連接邏輯
 */
export interface <BcName>ModuleDeps {
  readonly core: AppContainerDeps
  // 來自其他 Module 的依賴
  readonly crossBcDeps?: {
    readonly <otherBcPort>?: <OtherBcPort>
  }
}

export function register<BcName>Module(deps: <BcName>ModuleDeps) {
  return create<BcName>Container({
    db: deps.core.db,
    config: deps.core.config.<bcName>,
    // 映射跨 BC 依賴
    ...(deps.crossBcDeps && {
      externalPort: deps.crossBcDeps.<otherBcPort>
    })
  })
}
```

#### 框架整合範例（Nuxt/Nitro）

```typescript
// server/plugins/di.ts (Nuxt Nitro Plugin)

import { createAppContainer } from '../bootstrap/di'
import { createDatabaseClient } from '../bootstrap/db'

export default defineNitroPlugin(async (nitroApp) => {
  // 1. 建立基礎設施
  const db = await createDatabaseClient(process.env)
  const config = loadConfig(process.env)
  const eventBus = createEventBus()

  // 2. 建立 App Container
  const container = createAppContainer({ db, config, eventBus })

  // 3. 註冊到 Nitro Context（供 API Routes 使用）
  nitroApp.hooks.hook('request', (event) => {
    event.context.container = container
  })

  // 4. 優雅關閉
  nitroApp.hooks.hook('close', async () => {
    await container.dispose()
    await db.close()
  })
})

// server/api/orders/index.post.ts (使用 Container)
export default defineEventHandler(async (event) => {
  const container = event.context.container as AppContainer
  const input = await readBody(event)

  const result = await container.orderManagement.createOrder.execute(input)

  return result
})
```

#### 框架整合範例（Vue/Pinia - 前端）

```typescript
// composables/useContainer.ts

import { createUserInterfaceContainer } from '~/user-interface/adapter/di'

// 使用 Singleton Pattern（前端通常只需要一個 Container 實例）
let container: UserInterfaceContainer | null = null

export function useContainer(): UserInterfaceContainer {
  if (!container) {
    const config = useRuntimeConfig()
    const router = useRouter()

    container = createUserInterfaceContainer({
      apiBaseUrl: config.public.apiBaseUrl,
      router
    })
  }
  return container
}

// 在 Component 中使用
// <script setup>
// const container = useContainer()
// const result = await container.playHandCard.execute({ cardId: '...' })
// </script>
```

#### Pure DI vs IoC Container

| 特性 | Pure DI | IoC Container |
|------|---------|---------------|
| **學習曲線** | 低（只是函數呼叫） | 高（框架 API） |
| **類型安全** | 編譯時檢查 | 運行時檢查 |
| **可測試性** | 直接替換依賴 | 需要 Container Mock |
| **適用場景** | 中小型專案、明確依賴 | 大型專案、動態依賴 |
| **範例** | 本模板採用 | InversifyJS, TSyringe |

**建議**：優先使用 Pure DI，除非有明確的動態依賴需求。

---

## CA/DDD 指導原則

### 依賴規則 (Dependency Rule)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│    ┌─────────────────────────────────────────────┐     │
│    │                                             │     │
│    │    ┌─────────────────────────────────┐     │     │
│    │    │                                 │     │     │
│    │    │    ┌─────────────────────┐     │     │     │
│    │    │    │                     │     │     │     │
│    │    │    │      DOMAIN         │     │     │     │
│    │    │    │   (Entities, VOs)   │     │     │     │
│    │    │    │                     │     │     │     │
│    │    │    └─────────────────────┘     │     │     │
│    │    │                                 │     │     │
│    │    │         APPLICATION             │     │     │
│    │    │    (Use Cases, Ports)           │     │     │
│    │    │                                 │     │     │
│    │    └─────────────────────────────────┘     │     │
│    │                                             │     │
│    │              ADAPTER                        │     │
│    │    (Controllers, Repositories)              │     │
│    │                                             │     │
│    └─────────────────────────────────────────────┘     │
│                                                         │
│                   FRAMEWORK                             │
│            (Nuxt, Drizzle, Express)                     │
│                                                         │
└─────────────────────────────────────────────────────────┘

依賴方向：外層 ──→ 內層 （只能向內依賴）
```

### Port 方向原則

| Port 類型 | 定義位置 | 實作者 | 使用者 |
|-----------|---------|--------|--------|
| **Input Port** | Application | UseCase | Adapter (Controller) |
| **Output Port** | Application | Adapter (Repository) | UseCase |

```typescript
// ✅ 正確的依賴流向
Controller ──calls──→ InputPort ←──implements── UseCase
UseCase ──depends on──→ OutputPort ←──implements── Repository
```

### Entity vs Value Object

| 特性 | Entity | Value Object |
|------|--------|--------------|
| 身份 | 有唯一 ID | 無 ID，以值識別 |
| 可變性 | 可變（封裝狀態變更） | 不可變 |
| 相等性 | ID 相等 | 所有屬性相等 |
| 生命週期 | 有獨立生命週期 | 依附於 Entity |

### Aggregate 設計原則

1. **一個事務只修改一個 Aggregate**
2. **透過 ID 引用其他 Aggregate**（不直接持有引用）
3. **Aggregate Root 是唯一入口**（外部不能直接修改內部 Entity）
4. **保持 Aggregate 小**（只包含必須一起變更的物件）

### UseCase 設計原則

1. **單一職責**：一個 UseCase 做一件事
2. **不依賴其他 UseCase**：透過 Domain Service 或 Event 協作
3. **編排而非實作**：業務邏輯委派給 Domain
4. **依賴抽象**：只依賴 Output Port，不依賴具體 Adapter

### 跨 BC 通訊

```
推薦方式（由強到弱的隔離性）：

1. Domain Events（最佳隔離）
   BC-A ──publish──→ [Event Bus] ──subscribe──→ BC-B

2. Application Service 呼叫（同步，較緊耦合）
   BC-A ──→ Anti-Corruption Layer ──→ BC-B

3. Shared Kernel（共用 Value Object）
   BC-A ←── [Shared VOs] ──→ BC-B

避免：
❌ 直接 import 其他 BC 的 Domain Entity
❌ 共享 Aggregate Root
❌ 跨 BC 的事務
```

---

## 檢查清單

建立 BC 後，確認以下項目：

### Domain Layer
- [ ] Entity 有業務行為，不只是資料
- [ ] Value Object 是 immutable
- [ ] Domain Service 是純函數，無框架依賴
- [ ] Domain Error 有明確的錯誤碼
- [ ] Domain 層無任何 DI Container 引用

### Application Layer
- [ ] Input Port 定義清晰的輸入/輸出
- [ ] Output Port 使用 abstract class
- [ ] UseCase 只依賴 Output Port
- [ ] UseCase 不依賴其他 UseCase
- [ ] UseCase 透過 Constructor Injection 接收依賴
- [ ] Application 層無任何 DI Container 引用

### Adapter Layer
- [ ] Controller 不包含業務邏輯
- [ ] Repository 實作 Output Port
- [ ] Mapper 處理所有格式轉換
- [ ] 無 Domain 物件直接暴露給外部
- [ ] DI Container 定義在 adapter/di/ 目錄
- [ ] BC Container 只暴露 Input Ports

### Framework Layer (DI)
- [ ] Composition Root 在最外層（bootstrap/ 或 plugins/）
- [ ] 依賴組裝順序正確（先 Driven Adapters，後 Use Cases）
- [ ] 跨 BC 依賴透過 Port 注入，非直接引用
- [ ] 資源釋放邏輯正確（dispose 方法）
- [ ] Container 介面只暴露必要的 Ports

### BC 整體
- [ ] 目錄結構符合模板
- [ ] index.ts 正確匯出公開 API
- [ ] 無循環依賴
- [ ] 無跨 BC 直接 import Domain
- [ ] 內層不知道外層的存在（包含 DI Container）

---

## 注意事項

1. **漸進式建立**：不需要一次建立所有檔案，根據需求逐步新增
2. **保持簡單**：小型 BC 可以簡化結構（如省略 events/、services/）
3. **命名一致性**：遵循專案既有的命名慣例
4. **測試優先**：建議同時建立對應的測試目錄結構
