# Contract: DI Container

**Contract Type**: Implementation Contract
**Component**: `DIContainer` + `DependencyRegistry`
**Purpose**: 輕量級依賴注入容器
**Date**: 2025-01-19

本契約定義自訂輕量級 DI Container 的實作規範，包含依賴註冊、解析、單例管理、測試要求等。

---

## 1. DIContainer 契約

### 1.1 設計目標

**契約要求**:
- ✅ 零外部依賴（不使用 tsyringe / inversify）
- ✅ 輕量級實作（~100 行程式碼）
- ✅ 支援基本功能：註冊、解析、單例管理
- ✅ 使用 Symbol 作為 Token（避免命名衝突）
- ✅ TypeScript 型別安全

---

### 1.2 類別定義

```typescript
class DIContainer {
  private dependencies: Map<Symbol | string, DependencyFactory>;
  private singletons: Map<Symbol | string, any>;

  constructor();

  register<T>(
    token: Symbol | string,
    factory: DependencyFactory<T>,
    options?: { singleton?: boolean }
  ): void;

  resolve<T>(token: Symbol | string): T;

  clear(): void;

  has(token: Symbol | string): boolean;
}

type DependencyFactory<T> = () => T;
```

---

### 1.3 register 方法契約

**功能**: 註冊依賴（工廠函數）。

**簽名**:
```typescript
register<T>(
  token: Symbol | string,
  factory: DependencyFactory<T>,
  options?: { singleton?: boolean }
): void
```

**參數**:
- `token`: 依賴的唯一識別碼（Symbol 或 string）
- `factory`: 工廠函數，返回依賴實例
- `options.singleton`: 是否為單例模式（預設 `false`）

**契約要求**:
- ✅ 儲存 `factory` 到 `dependencies` Map
- ✅ 若 `token` 已存在，覆蓋舊值（不拋出錯誤）
- ✅ 若 `singleton = true`，第一次 `resolve` 時快取實例

**實作範例**:
```typescript
register<T>(
  token: Symbol | string,
  factory: DependencyFactory<T>,
  options?: { singleton?: boolean }
): void {
  this.dependencies.set(token, factory as DependencyFactory<any>);

  if (options?.singleton) {
    // 標記為單例（實際快取在 resolve 時）
    // 可選方案：使用 WeakMap 或額外屬性標記
  }
}
```

---

### 1.4 resolve 方法契約

**功能**: 解析依賴（獲取實例）。

**簽名**:
```typescript
resolve<T>(token: Symbol | string): T
```

**參數**:
- `token`: 依賴的唯一識別碼

**返回值**:
- 依賴實例（型別為 `T`）

**契約要求**:
- ✅ 若 `token` 未註冊，拋出 `DependencyNotFoundError`
- ✅ 若為單例模式，第一次調用時執行 `factory` 並快取
- ✅ 若為單例模式，後續調用直接返回快取實例
- ✅ 若非單例模式，每次調用都執行 `factory`

**實作範例**:
```typescript
resolve<T>(token: Symbol | string): T {
  const factory = this.dependencies.get(token);

  if (!factory) {
    throw new DependencyNotFoundError(String(token));
  }

  // 檢查是否為單例且已快取
  if (this.singletons.has(token)) {
    return this.singletons.get(token) as T;
  }

  // 執行工廠函數
  const instance = factory();

  // 若為單例，快取實例
  if (this.isSingleton(token)) {
    this.singletons.set(token, instance);
  }

  return instance as T;
}

private isSingleton(token: Symbol | string): boolean {
  // 實作方式 1：使用額外 Map 儲存單例標記
  // 實作方式 2：使用 Symbol 屬性標記
  // 實作方式 3：檢查 factory 的特定屬性
  return this.singletonTokens.has(token);
}
```

---

### 1.5 clear 方法契約

**功能**: 清空所有依賴與快取（用於測試重置）。

**簽名**:
```typescript
clear(): void
```

**契約要求**:
- ✅ 清空 `dependencies` Map
- ✅ 清空 `singletons` Map
- ✅ 釋放所有引用（避免記憶體洩漏）

**實作範例**:
```typescript
clear(): void {
  this.dependencies.clear();
  this.singletons.clear();
}
```

---

### 1.6 has 方法契約

**功能**: 檢查依賴是否已註冊。

**簽名**:
```typescript
has(token: Symbol | string): boolean
```

**契約要求**:
- ✅ 返回 `true` 若 `token` 已註冊
- ✅ 返回 `false` 若 `token` 未註冊

**實作範例**:
```typescript
has(token: Symbol | string): boolean {
  return this.dependencies.has(token);
}
```

---

## 2. Dependency Tokens 契約

### 2.1 Token 定義

**契約要求**:
- ✅ 使用 `Symbol` 作為 Token（避免字串命名衝突）
- ✅ 所有 Token 集中定義在 `tokens.ts`
- ✅ 使用 `as const` 確保型別不可變

**定義範例**:
```typescript
// di/tokens.ts
export const TOKENS = {
  // Output Ports
  SendCommandPort: Symbol('SendCommandPort'),
  UIStatePort: Symbol('UIStatePort'),
  TriggerUIEffectPort: Symbol('TriggerUIEffectPort'),

  // Input Ports (18 個)
  PlayHandCardPort: Symbol('PlayHandCardPort'),
  SelectMatchTargetPort: Symbol('SelectMatchTargetPort'),
  MakeKoiKoiDecisionPort: Symbol('MakeKoiKoiDecisionPort'),
  // ... 更多 Input Ports

  // Adapters
  GameApiClient: Symbol('GameApiClient'),
  GameEventClient: Symbol('GameEventClient'),
  EventRouter: Symbol('EventRouter'),
  AnimationService: Symbol('AnimationService'),

  // Stores
  GameStateStore: Symbol('GameStateStore'),
  UIStateStore: Symbol('UIStateStore'),

  // Mock Adapters
  MockApiClient: Symbol('MockApiClient'),
  MockEventEmitter: Symbol('MockEventEmitter'),
} as const;
```

---

### 2.2 為何使用 Symbol

**優點**:
- ✅ 保證唯一性（Symbol 永遠不相等）
- ✅ 避免命名衝突（即使描述相同）
- ✅ 型別安全（TypeScript 支援 Symbol 型別）
- ✅ 更好的 IDE 支援（自動完成）

**範例**:
```typescript
// ✅ Symbol 保證唯一性
const token1 = Symbol('GameApiClient');
const token2 = Symbol('GameApiClient');
console.log(token1 === token2);  // false

// ❌ 字串可能衝突
const token3 = 'GameApiClient';
const token4 = 'GameApiClient';
console.log(token3 === token4);  // true
```

---

## 3. DependencyRegistry 契約

### 3.1 職責定義

**契約要求**:
- ✅ 統一管理所有依賴的註冊邏輯
- ✅ 根據遊戲模式載入對應的 Adapter（Backend / Local / Mock）
- ✅ 確保依賴註冊順序正確（避免循環依賴）

---

### 3.2 registerDependencies 函數契約

**簽名**:
```typescript
export function registerDependencies(
  container: DIContainer,
  mode: GameMode
): void
```

**參數**:
- `container`: DI Container 實例
- `mode`: 遊戲模式（'backend' | 'local' | 'mock'）

**契約要求**:
- ✅ 依序註冊：Stores → Output Ports → Input Ports → Adapters → 動畫系統
- ✅ 根據 `mode` 選擇性註冊 Adapters
- ✅ 所有 Input Ports 註冊為單例（避免多次實例化 Use Cases）
- ✅ 所有 Output Ports 註冊為單例（避免多個 API Client）

**實作範例**:
```typescript
export function registerDependencies(container: DIContainer, mode: GameMode): void {
  // 1. 註冊 Stores（單例）
  container.register(
    TOKENS.GameStateStore,
    () => useGameStateStore(),
    { singleton: true }
  );

  container.register(
    TOKENS.UIStateStore,
    () => useUIStateStore(),
    { singleton: true }
  );

  // 2. 註冊 Output Ports（單例）
  container.register(
    TOKENS.UIStatePort,
    () => createUIStatePortAdapter(),
    { singleton: true }
  );

  // 3. 註冊 Input Ports（單例）
  container.register(
    TOKENS.PlayHandCardPort,
    () => new PlayHandCardUseCase(
      container.resolve(TOKENS.SendCommandPort),
      container.resolve(TOKENS.UIStatePort)
    ),
    { singleton: true }
  );

  // 4. 根據模式註冊 Adapters
  if (mode === 'backend') {
    registerBackendAdapters(container);
  } else if (mode === 'mock') {
    registerMockAdapters(container);
  } else if (mode === 'local') {
    registerLocalAdapters(container);
  }

  // 5. 註冊動畫系統
  container.register(
    TOKENS.AnimationQueue,
    () => new AnimationQueue(),
    { singleton: true }
  );

  container.register(
    TOKENS.AnimationService,
    () => new AnimationService(container.resolve(TOKENS.AnimationQueue)),
    { singleton: true }
  );

  // 6. 註冊 TriggerUIEffectPort（組合 UIStateStore + AnimationService）
  container.register(
    TOKENS.TriggerUIEffectPort,
    () => createTriggerUIEffectPortAdapter(
      container.resolve(TOKENS.AnimationService)
    ),
    { singleton: true }
  );
}
```

---

### 3.3 registerBackendAdapters 函數契約

**功能**: 註冊 Backend 模式的 Adapters。

**契約要求**:
- ✅ 註冊 `GameApiClient`（REST API 客戶端）
- ✅ 註冊 `GameEventClient`（SSE 客戶端）
- ✅ 註冊 `EventRouter`（事件路由器）
- ✅ 綁定所有事件處理 Input Ports 到 `EventRouter`

**實作範例**:
```typescript
function registerBackendAdapters(container: DIContainer): void {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

  // 註冊 API 客戶端
  container.register(
    TOKENS.GameApiClient,
    () => new GameApiClient(baseURL),
    { singleton: true }
  );

  container.register(
    TOKENS.SendCommandPort,
    () => container.resolve(TOKENS.GameApiClient),  // GameApiClient 本身實作 SendCommandPort
    { singleton: true }
  );

  // 註冊 SSE 客戶端
  container.register(
    TOKENS.EventRouter,
    () => {
      const router = new EventRouter();
      // 註冊所有事件處理 Input Ports
      router.register('GameStarted', container.resolve(TOKENS.HandleGameStartedPort));
      router.register('RoundDealt', container.resolve(TOKENS.HandleRoundDealtPort));
      // ... 註冊所有 15 個事件
      return router;
    },
    { singleton: true }
  );

  container.register(
    TOKENS.GameEventClient,
    () => new GameEventClient(baseURL, container.resolve(TOKENS.EventRouter)),
    { singleton: true }
  );
}
```

---

### 3.4 registerMockAdapters 函數契約

**功能**: 註冊 Mock 模式的 Adapters。

**契約要求**:
- ✅ 註冊 `MockApiClient`（模擬 REST API）
- ✅ 註冊 `MockEventEmitter`（模擬 SSE 事件）
- ✅ Mock 模式不需要 `GameEventClient`（使用 `MockEventEmitter` 替代）

**實作範例**:
```typescript
function registerMockAdapters(container: DIContainer): void {
  // 註冊 Mock API 客戶端
  container.register(
    TOKENS.MockApiClient,
    () => new MockApiClient(),
    { singleton: true }
  );

  container.register(
    TOKENS.SendCommandPort,
    () => container.resolve(TOKENS.MockApiClient),
    { singleton: true }
  );

  // 註冊 Mock 事件模擬器
  container.register(
    TOKENS.EventRouter,
    () => {
      const router = new EventRouter();
      router.register('GameStarted', container.resolve(TOKENS.HandleGameStartedPort));
      router.register('RoundDealt', container.resolve(TOKENS.HandleRoundDealtPort));
      // ... 註冊所有 15 個事件
      return router;
    },
    { singleton: true }
  );

  container.register(
    TOKENS.MockEventEmitter,
    () => new MockEventEmitter(container.resolve(TOKENS.EventRouter)),
    { singleton: true }
  );
}
```

---

## 4. Vue 整合契約

### 4.1 provide/inject 整合

**契約要求**:
- ✅ 在 `main.ts` 提供 DI Container 到 Vue 應用
- ✅ Vue 組件使用 `inject` 獲取 Input Ports

**main.ts 範例**:
```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { DIContainer } from './adapter/di/container';
import { registerDependencies } from './adapter/di/registry';
import { TOKENS } from './adapter/di/tokens';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// 初始化 DI Container
const container = new DIContainer();
const mode = import.meta.env.VITE_GAME_MODE || 'backend';
registerDependencies(container, mode);

// 提供所有 Input Ports 到 Vue
app.provide(TOKENS.PlayHandCardPort, container.resolve(TOKENS.PlayHandCardPort));
app.provide(TOKENS.SelectMatchTargetPort, container.resolve(TOKENS.SelectMatchTargetPort));
// ... 提供所有 18 個 Input Ports

app.mount('#app');
```

**組件使用範例**:
```vue
<script setup>
import { inject } from 'vue';
import { TOKENS } from '@/adapter/di/tokens';

const playHandCardPort = inject(TOKENS.PlayHandCardPort);

function onCardClick(cardId: string) {
  playHandCardPort.execute({ cardId });
}
</script>
```

---

## 5. 測試契約

### 5.1 單元測試要求

**必須測試的場景**:
1. ✅ `register` 註冊依賴
2. ✅ `resolve` 解析依賴（非單例，每次新實例）
3. ✅ `resolve` 解析單例（快取實例）
4. ✅ `resolve` 拋出錯誤（依賴未註冊）
5. ✅ `clear` 清空所有依賴
6. ✅ `has` 檢查依賴是否存在
7. ✅ 覆蓋已註冊的依賴（不拋出錯誤）

**測試覆蓋率目標**: > 90%（DIContainer 是關鍵組件）

**測試範例**:
```typescript
describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  it('should register and resolve dependency', () => {
    const token = Symbol('TestService');
    container.register(token, () => ({ value: 42 }));

    const instance = container.resolve(token);

    expect(instance.value).toBe(42);
  });

  it('should resolve singleton only once', () => {
    const token = Symbol('SingletonService');
    let count = 0;

    container.register(
      token,
      () => ({ id: ++count }),
      { singleton: true }
    );

    const instance1 = container.resolve(token);
    const instance2 = container.resolve(token);

    expect(instance1.id).toBe(1);
    expect(instance2.id).toBe(1);  // 同一個實例
    expect(instance1).toBe(instance2);
  });

  it('should throw error when resolving unregistered dependency', () => {
    const token = Symbol('UnknownService');

    expect(() => container.resolve(token)).toThrow(DependencyNotFoundError);
  });

  it('should clear all dependencies', () => {
    const token = Symbol('TestService');
    container.register(token, () => ({ value: 42 }));

    container.clear();

    expect(container.has(token)).toBe(false);
  });
});
```

---

## 6. 錯誤處理契約

### 6.1 DependencyNotFoundError

**契約要求**:
- ✅ 定義自訂錯誤類別 `DependencyNotFoundError`
- ✅ 包含 Token 名稱（方便除錯）

**實作範例**:
```typescript
export class DependencyNotFoundError extends Error {
  constructor(token: string) {
    super(`Dependency not found: ${token}`);
    this.name = 'DependencyNotFoundError';
  }
}
```

---

### 6.2 CircularDependencyError

**契約要求**:
- ✅ 偵測循環依賴（A 依賴 B，B 依賴 A）
- ✅ 拋出 `CircularDependencyError`
- ❌ MVP 階段不實作（手動避免循環依賴）

---

## 7. 效能契約

### 7.1 resolve 效能

**契約要求**:
- ✅ `resolve` 時間 < 1ms（Map.get + 函數調用）
- ✅ 單例模式第一次 `resolve` 時間可能較長（執行 factory）
- ✅ 單例模式後續 `resolve` 時間 < 0.1ms（直接返回快取）

---

### 7.2 記憶體管理

**契約要求**:
- ✅ `clear()` 正確釋放所有引用
- ✅ 不累積歷史依賴（覆蓋舊值）
- ✅ 單例快取不無限增長（僅快取已註冊的單例）

---

## 8. 日誌記錄契約

### 8.1 日誌層級

**契約要求**:
- ✅ 註冊依賴：不記錄（避免過多日誌）
- ✅ 解析依賴：不記錄（除非開發模式）
- ✅ 依賴未找到：`console.error`

**範例**:
```typescript
resolve<T>(token: Symbol | string): T {
  const factory = this.dependencies.get(token);

  if (!factory) {
    console.error('[DI] Dependency not found', { token: String(token) });
    throw new DependencyNotFoundError(String(token));
  }

  // ...
}
```

---

## 總結

本契約定義了自訂輕量級 DI Container 的完整實作規範，確保：

✅ 零外部依賴（完全自主實作）
✅ 輕量級（~100 行程式碼）
✅ 支援基本功能（註冊、解析、單例）
✅ 使用 Symbol 作為 Token（避免命名衝突）
✅ 與 Vue provide/inject 整合
✅ 達到 90% 以上的測試覆蓋率

所有實作必須通過契約測試後才能整合到系統中。
