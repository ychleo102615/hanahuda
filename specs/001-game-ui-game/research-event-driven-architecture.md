# 事件驅動架構（Event-Driven Architecture）在 TypeScript 單體應用中的最佳實踐

**專案**: 花牌遊戲「來來」(Koi-Koi) - Game UI-Engine 分離架構
**研究日期**: 2025-10-14
**目標**: 為 game-engine 與 game-ui 兩個 BC 之間的事件通訊設計最佳方案

---

## 1. 輕量級事件匯流排設計

### Decision

實作**型別安全的記憶體內 EventBus**，採用以下設計：

```typescript
// src/shared/events/base/IntegrationEvent.ts
export interface IntegrationEvent {
  readonly eventId: string
  readonly eventType: string
  readonly timestamp: number
  readonly sequenceNumber: number
}

// src/shared/events/base/EventBus.ts
export class EventBus {
  private listeners: Map<string, Set<EventHandler<any>>> = new Map()
  private sequenceCounter: number = 0
  private eventLog: IntegrationEvent[] = []
  private readonly logEnabled: boolean

  constructor(options?: { enableLogging?: boolean }) {
    this.logEnabled = options?.enableLogging ?? (import.meta.env.DEV || false)
  }

  subscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): UnsubscribeFn {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    const handlers = this.listeners.get(eventType)!
    handlers.add(handler)

    // Return unsubscribe function
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.listeners.delete(eventType)
      }
    }
  }

  publish<T extends IntegrationEvent>(event: T): void {
    const enrichedEvent = {
      ...event,
      sequenceNumber: ++this.sequenceCounter,
      timestamp: Date.now(),
    }

    if (this.logEnabled) {
      this.logEvent('PUBLISH', enrichedEvent)
      this.eventLog.push(enrichedEvent)
    }

    const handlers = this.listeners.get(event.eventType)
    if (!handlers || handlers.size === 0) {
      if (this.logEnabled) {
        console.warn(`[EventBus] No handlers for event: ${event.eventType}`)
      }
      return
    }

    // Synchronous invocation for in-memory bus
    handlers.forEach((handler) => {
      try {
        handler(enrichedEvent)
      } catch (error) {
        console.error(`[EventBus] Handler error for ${event.eventType}:`, error)
        // Continue processing other handlers
      }
    })
  }

  private logEvent(action: 'PUBLISH' | 'SUBSCRIBE', event: IntegrationEvent): void {
    if (!this.logEnabled) return

    const logMessage = `[EventBus][${action}] ${event.eventType} #${event.sequenceNumber}`
    console.log(logMessage, {
      eventId: event.eventId,
      timestamp: new Date(event.timestamp).toISOString(),
      payload: event,
    })
  }

  // For debugging and testing
  getEventLog(): ReadonlyArray<IntegrationEvent> {
    return [...this.eventLog]
  }

  clearEventLog(): void {
    this.eventLog = []
  }
}

type EventHandler<T extends IntegrationEvent> = (event: T) => void
type UnsubscribeFn = () => void
```

### Rationale

1. **型別安全**: 使用 TypeScript 泛型 `<T extends IntegrationEvent>` 確保事件型別檢查，避免執行時型別錯誤
2. **記憶體效率**: 使用 `Map<string, Set<EventHandler>>` 結構，查找和刪除操作均為 O(1)，優於陣列 O(n)
3. **錯誤隔離**: 單一 handler 拋出錯誤不影響其他 handler 執行，符合 Resilience 原則
4. **序列保證**: 使用單調遞增的 `sequenceNumber`，讓訂閱者可檢測事件遺失
5. **同步執行**: 單機模式下事件處理為同步，避免 async/await 的效能開銷（<10ms 目標）
6. **自動清理**: `unsubscribe` 函數返回後自動清理空的事件訂閱集合，防止記憶體洩漏

### Alternatives Considered

| 方案 | 優點 | 缺點 | 選擇理由 |
|------|------|------|----------|
| **自定義 EventBus** (選用) | 完全控制、零依賴、針對專案優化 | 需自行實作與測試 | ✅ 符合專案 Clean Architecture 要求，可自由調整 |
| **mitt** (3rd-party) | 輕量 (200B)、成熟穩定 | 引入外部依賴、型別支援較弱 | ❌ 型別安全不足，不易擴展 |
| **ts-bus** (3rd-party) | 優秀的 TypeScript 支援 | 學習曲線、較重 (1KB+) | ❌ 過度設計，不符合輕量級需求 |
| **Node EventEmitter** | Node.js 原生 | 瀏覽器需 polyfill、API 不夠現代 | ❌ 不適合前端專案 |

### Implementation Notes

1. **環境變數控制日誌**:
   ```typescript
   // .env.development
   VITE_LOG_EVENTS=true

   // .env.production
   VITE_LOG_EVENTS=false
   ```

2. **Vue 3 整合 - 生命週期自動清理**:
   ```typescript
   // game-ui/presentation/composables/useEventBus.ts
   import { onUnmounted } from 'vue'

   export function useEventSubscription<T extends IntegrationEvent>(
     eventBus: EventBus,
     eventType: string,
     handler: EventHandler<T>
   ) {
     const unsubscribe = eventBus.subscribe(eventType, handler)
     onUnmounted(unsubscribe)
     return unsubscribe
   }
   ```

3. **測試策略**:
   ```typescript
   // tests/integration/events/EventBus.test.ts
   describe('EventBus', () => {
     it('should deliver events in order', () => {
       const bus = new EventBus()
       const received: number[] = []

       bus.subscribe('test', (e) => received.push(e.sequenceNumber))

       bus.publish({ eventType: 'test', eventId: '1', timestamp: 0, sequenceNumber: 0 })
       bus.publish({ eventType: 'test', eventId: '2', timestamp: 0, sequenceNumber: 0 })

       expect(received).toEqual([1, 2])
     })
   })
   ```

4. **避免循環依賴**: EventBus 放在 `shared/events/base/` 作為基礎設施，兩個 BC 均透過 Port/Adapter 模式注入

---

## 2. 增量事件 vs 快照

### Decision

採用**混合策略**：

- **完整快照**: 僅用於 `GameInitializedEvent` 和 `StateSyncRequestedEvent`（重新同步）
- **增量事件**: 所有其他遊戲操作（出牌、捕獲、回合切換等）

```typescript
// 完整快照事件（初始化）
interface GameInitializedEvent extends IntegrationEvent {
  eventType: 'game.initialized'
  snapshot: {
    gameId: string
    players: Array<{
      id: string
      name: string
      handCardIds: string[]
      capturedCardIds: string[]
      score: number
    }>
    fieldCardIds: string[]
    deckCount: number
    currentPlayerIndex: number
    phase: GamePhase
    round: number
  }
}

// 增量事件（出牌操作）
interface CardPlayedEvent extends IntegrationEvent {
  eventType: 'card.played'
  playerId: string
  cardId: string
  fromLocation: 'hand'
  toLocation: 'field' | 'captured'
  matchedCardIds: string[] // 場上配對的牌（可能為空）
}

// 增量事件（捕獲卡牌）
interface CardsCaptu redEvent extends IntegrationEvent {
  eventType: 'cards.captured'
  playerId: string
  capturedCardIds: string[] // 只傳遞被捕獲的牌 ID
  fromLocation: 'field'
}

// 增量事件（牌堆翻牌）
interface DeckCardRevealedEvent extends IntegrationEvent {
  eventType: 'deck.card.revealed'
  cardId: string
  matchOptions: string[] // 可配對的場牌 ID 列表（若有多張）
}
```

### Rationale

1. **最小化傳輸**: 單次出牌操作僅傳送 3-5 個欄位（約 200B），遠低於完整快照（~5KB）
2. **動畫友善**: 增量事件包含 `fromLocation` 和 `toLocation`，UI 可據此播放卡牌移動動畫
3. **一致性保證**: 透過 `sequenceNumber` 檢測事件遺失，一旦發現立即請求完整快照重新同步
4. **未來擴展性**: 當移植到前後端分離時，網路傳輸量顯著降低（重要！）

### Alternatives Considered

| 方案 | 優點 | 缺點 | 選擇理由 |
|------|------|------|----------|
| **混合策略** (選用) | 平衡效能與一致性 | 需處理事件遺失檢測 | ✅ 符合專案需求（SC-002: 事件 <1KB） |
| **純快照** | 實作簡單、不怕事件遺失 | 傳輸量大（5KB/操作）、無法支援動畫 | ❌ 不符合最小傳輸量需求 |
| **純增量** | 傳輸量最小 | 無法處理重新整理或事件遺失 | ❌ 缺乏恢復機制 |
| **Event Sourcing** | 完整歷史、可重放 | 過度複雜、需事件持久化 | ❌ 單機遊戲無需持久化 |

### Implementation Notes

1. **快照情境判定**:
   ```typescript
   // game-ui/application/usecases/SyncGameStateUseCase.ts
   export class SyncGameStateUseCase {
     constructor(
       private eventBus: EventBus,
       private viewModel: GameViewModel
     ) {}

     execute(): void {
       // 情境 1: 頁面初次載入
       if (!this.viewModel.isInitialized) {
         this.requestFullSnapshot()
       }

       // 情境 2: 檢測到事件序號不連續
       this.eventBus.subscribe('*', (event) => {
         const expectedSeq = this.viewModel.lastSequenceNumber + 1
         if (event.sequenceNumber !== expectedSeq) {
           console.warn(`[Sync] Gap detected: expected ${expectedSeq}, got ${event.sequenceNumber}`)
           this.requestFullSnapshot()
         }
       })
     }

     private requestFullSnapshot(): void {
       // 單機模式: 直接呼叫 game-engine
       // 未來前後端分離: 發送 HTTP GET /api/game/state
       this.eventBus.publish({
         eventType: 'state.sync.requested',
         eventId: uuidv4(),
         timestamp: Date.now(),
         sequenceNumber: 0,
       })
     }
   }
   ```

2. **增量事件大小估算**:
   ```typescript
   // CardPlayedEvent JSON 大小估算
   {
     "eventType": "card.played",         // ~30B
     "eventId": "uuid",                  // ~40B
     "timestamp": 1234567890,            // ~15B
     "sequenceNumber": 123,              // ~10B
     "playerId": "player1",              // ~20B
     "cardId": "card_01_01",             // ~20B
     "fromLocation": "hand",             // ~20B
     "toLocation": "captured",           // ~20B
     "matchedCardIds": ["card_02_01"]    // ~30B
   }
   // Total: ~205B (符合 <1KB 目標)
   ```

3. **事件壓縮策略（日後優化）**:
   - 使用短名稱（e.g., `t` 代替 `eventType`）
   - 數字編碼替代字串（e.g., `1` 代替 `"hand"`）
   - Protocol Buffers 可進一步壓縮至 ~50B

---

## 3. 事件日誌與監控

### Decision

實作**環境感知的分層日誌系統**：

```typescript
// src/shared/events/base/EventLogger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export class EventLogger {
  private readonly level: LogLevel
  private readonly enableTimestamp: boolean

  constructor(config?: {
    level?: LogLevel
    enableTimestamp?: boolean
  }) {
    this.level = this.getLogLevelFromEnv(config?.level)
    this.enableTimestamp = config?.enableTimestamp ?? true
  }

  debug(eventType: string, event: IntegrationEvent): void {
    if (this.level <= LogLevel.DEBUG) {
      const msg = this.formatMessage('DEBUG', eventType, event)
      console.log(`%c${msg}`, 'color: gray', event)
    }
  }

  info(eventType: string, event: IntegrationEvent): void {
    if (this.level <= LogLevel.INFO) {
      const msg = this.formatMessage('INFO', eventType, event)
      console.log(`%c${msg}`, 'color: blue', this.summarize(event))
    }
  }

  warn(eventType: string, message: string, context?: any): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[EventBus][WARN] ${eventType}: ${message}`, context)
    }
  }

  error(eventType: string, error: Error, event?: IntegrationEvent): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[EventBus][ERROR] ${eventType}:`, error, event)
    }
  }

  private formatMessage(level: string, eventType: string, event: IntegrationEvent): string {
    const timestamp = this.enableTimestamp
      ? `[${new Date(event.timestamp).toISOString()}]`
      : ''
    return `${timestamp}[EventBus][${level}] ${eventType} #${event.sequenceNumber}`
  }

  private summarize(event: IntegrationEvent): object {
    // 只記錄關鍵欄位，避免完整物件造成效能問題
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      sequenceNumber: event.sequenceNumber,
      timestamp: event.timestamp,
    }
  }

  private getLogLevelFromEnv(override?: LogLevel): LogLevel {
    if (override !== undefined) return override

    const envLevel = import.meta.env.VITE_EVENT_LOG_LEVEL
    switch (envLevel) {
      case 'DEBUG': return LogLevel.DEBUG
      case 'INFO': return LogLevel.INFO
      case 'WARN': return LogLevel.WARN
      case 'ERROR': return LogLevel.ERROR
      case 'NONE': return LogLevel.NONE
      default: return import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.ERROR
    }
  }
}
```

### Rationale

1. **環境自適應**: 開發環境預設 DEBUG 級別（完整事件內容），生產環境預設 ERROR 級別（僅錯誤）
2. **效能考量**: `summarize()` 方法避免記錄大型物件，防止 console.log 造成的效能瓶頸（每次呼叫 ~5-10ms）
3. **可視化增強**: 使用 `console` 顏色標記（`%c`），提升日誌可讀性
4. **靈活控制**: 可透過環境變數或程式碼動態調整日誌級別

### Alternatives Considered

| 方案 | 優點 | 缺點 | 選擇理由 |
|------|------|------|----------|
| **自定義 EventLogger** (選用) | 完全控制、環境感知 | 需自行實作 | ✅ 符合專案需求，無需引入重型日誌庫 |
| **console.log 直接呼叫** | 簡單直接 | 無法統一控制、影響效能 | ❌ 生產環境會有效能問題 |
| **Winston/Pino** | 功能強大、可擴展 | 過重（50KB+）、主要為 Node.js 設計 | ❌ 前端不需要如此複雜的日誌系統 |
| **Sentry/LogRocket** | 遠端監控、錯誤追蹤 | 需註冊服務、有隱私疑慮 | ❌ 單機遊戲無需遠端監控 |

### Implementation Notes

1. **環境變數配置**:
   ```env
   # .env.development
   VITE_EVENT_LOG_LEVEL=DEBUG

   # .env.production
   VITE_EVENT_LOG_LEVEL=ERROR

   # .env.test
   VITE_EVENT_LOG_LEVEL=NONE
   ```

2. **整合到 EventBus**:
   ```typescript
   export class EventBus {
     private logger: EventLogger

     constructor(options?: { logger?: EventLogger }) {
       this.logger = options?.logger ?? new EventLogger()
     }

     publish<T extends IntegrationEvent>(event: T): void {
       this.logger.debug(event.eventType, event)

       // ... existing publish logic ...

       this.logger.info(event.eventType, event)
     }
   }
   ```

3. **效能測試**:
   ```typescript
   // tests/performance/EventBus.perf.test.ts
   describe('EventBus Performance', () => {
     it('should publish 1000 events in <100ms with logging disabled', () => {
       const bus = new EventBus({
         logger: new EventLogger({ level: LogLevel.NONE })
       })

       const start = performance.now()
       for (let i = 0; i < 1000; i++) {
         bus.publish({
           eventType: 'test',
           eventId: `${i}`,
           timestamp: Date.now(),
           sequenceNumber: i
         })
       }
       const duration = performance.now() - start

       expect(duration).toBeLessThan(100) // <0.1ms per event
     })
   })
   ```

4. **開發工具整合**:
   ```typescript
   // game-ui/presentation/composables/useEventDebugger.ts
   export function useEventDebugger(eventBus: EventBus) {
     if (import.meta.env.DEV) {
       // 暴露到 window 供開發者工具使用
       (window as any).__eventBus = {
         getLog: () => eventBus.getEventLog(),
         clearLog: () => eventBus.clearEventLog(),
         replay: (fromSeq: number) => {
           // 重放事件（測試用）
         }
       }
     }
   }
   ```

---

## 4. 日後移植至 Protocol Buffers

### Decision

**現階段使用 TypeScript 介面定義，但遵循 Protobuf 相容原則**：

```typescript
// src/shared/events/game/CardPlayedEvent.ts
// ✅ Protobuf 相容的 TypeScript 定義

export interface CardPlayedEvent extends IntegrationEvent {
  readonly eventType: 'card.played' // 固定字面值，對應 protobuf enum
  readonly playerId: string         // string -> protobuf string
  readonly cardId: string            // string -> protobuf string
  readonly fromLocation: CardLocation // enum -> protobuf enum
  readonly toLocation: CardLocation   // enum -> protobuf enum
  readonly matchedCardIds: string[]   // array -> protobuf repeated
}

export enum CardLocation {
  HAND = 0,      // 明確數值，對應 protobuf enum
  FIELD = 1,
  CAPTURED = 2,
  DECK = 3,
}

// 未來對應的 .proto 定義（參考）
/*
syntax = "proto3";

message CardPlayedEvent {
  string event_id = 1;
  string event_type = 2;
  int64 timestamp = 3;
  int32 sequence_number = 4;

  string player_id = 5;
  string card_id = 6;
  CardLocation from_location = 7;
  CardLocation to_location = 8;
  repeated string matched_card_ids = 9;
}

enum CardLocation {
  HAND = 0;
  FIELD = 1;
  CAPTURED = 2;
  DECK = 3;
}
*/
```

### Rationale

1. **避免泛型**: Protobuf 不支援泛型，故事件定義使用具體型別
2. **避免複雜繼承**: 使用 `extends IntegrationEvent` 的單層繼承，對應 protobuf 的 composition pattern
3. **明確列舉值**: Enum 明確指定數值（0, 1, 2...），對應 protobuf enum 規範
4. **欄位命名**: 使用 camelCase（TypeScript 慣例），日後可透過工具轉換為 snake_case（Protobuf 慣例）
5. **只用基本型別**: `string`, `number`, `boolean`, `Array`，避免 `Date`, `Map`, `Set` 等不可序列化型別

### Alternatives Considered

| 方案 | 優點 | 缺點 | 選擇理由 |
|------|------|------|----------|
| **Protobuf-first** | 型別定義嚴謹、序列化效率高 | 學習曲線、工具鏈複雜 | ❌ 現階段單機模式無需序列化 |
| **TypeScript 介面 + 相容原則** (選用) | 開發友善、日後可平滑轉換 | 需人工確保相容性 | ✅ 平衡開發效率與未來擴展性 |
| **JSON Schema** | 跨語言、工具支援好 | 執行時驗證開銷、無型別推斷 | ❌ TypeScript 原生型別系統更優 |
| **GraphQL Schema** | 強大的查詢能力 | 過度設計、不適合事件驅動 | ❌ 專案無需 GraphQL 複雜度 |

### Implementation Notes

1. **禁用的 TypeScript 特性**:
   ```typescript
   // ❌ 避免使用泛型（Protobuf 不支援）
   interface GenericEvent<T> extends IntegrationEvent {
     data: T // ❌ 不要這樣做
   }

   // ✅ 使用具體型別
   interface CardPlayedEvent extends IntegrationEvent {
     playerId: string // ✅
     cardId: string   // ✅
   }

   // ❌ 避免使用 Union Types（Protobuf 使用 oneof）
   interface Event {
     location: 'hand' | 'field' | 'captured' // ❌
   }

   // ✅ 使用明確的 Enum
   enum CardLocation {
     HAND = 0,
     FIELD = 1,
     CAPTURED = 2,
   }
   interface Event {
     location: CardLocation // ✅
   }

   // ❌ 避免使用 Date 物件
   interface Event {
     timestamp: Date // ❌ Protobuf 無原生 Date
   }

   // ✅ 使用 Unix timestamp (number)
   interface Event {
     timestamp: number // ✅ protobuf int64
   }

   // ❌ 避免使用 Map/Set
   interface Event {
     metadata: Map<string, string> // ❌
   }

   // ✅ 使用物件或陣列
   interface Event {
     metadata: Record<string, string> // ✅ protobuf map<string, string>
   }
   ```

2. **版本管理策略**:
   ```typescript
   // 使用欄位註解標記版本
   export interface GameInitializedEvent extends IntegrationEvent {
     eventType: 'game.initialized'

     // v1.0.0 欄位
     gameId: string
     players: PlayerSnapshot[]

     // v1.1.0 新增欄位（向後相容）
     /** @since 1.1.0 */
     gameMode?: 'single' | 'multi' // optional field

     // ❌ 禁止刪除欄位，改用 @deprecated
     /** @deprecated since 1.2.0, use gameMode instead */
     isSinglePlayer?: boolean
   }
   ```

3. **轉換工具準備**:
   ```typescript
   // tools/proto-generator.ts (日後實作)
   // 自動從 TypeScript 介面生成 .proto 檔案

   export function generateProtoSchema(
     interfaceName: string,
     filePath: string
   ): string {
     // 1. 解析 TypeScript AST
     // 2. 提取介面欄位
     // 3. 轉換型別 (string -> string, number -> int64)
     // 4. 生成 .proto 語法
     return protoContent
   }
   ```

4. **文件化轉換規則**:
   ```markdown
   ## TypeScript to Protobuf 轉換對照表

   | TypeScript | Protobuf | 範例 |
   |------------|----------|------|
   | `string` | `string` | `playerId: string` → `string player_id = 1;` |
   | `number` | `int32` / `int64` / `double` | `score: number` → `int32 score = 2;` |
   | `boolean` | `bool` | `isActive: boolean` → `bool is_active = 3;` |
   | `string[]` | `repeated string` | `cardIds: string[]` → `repeated string card_ids = 4;` |
   | `enum` | `enum` | `CardType` → `enum CardType { ... }` |
   | `Record<string, string>` | `map<string, string>` | `metadata` → `map<string, string> metadata = 5;` |
   | `optional field` | `optional` (proto3) | `gameMode?: string` → `optional string game_mode = 6;` |
   ```

5. **測試序列化相容性**:
   ```typescript
   // tests/integration/events/ProtobufCompatibility.test.ts
   describe('Protobuf Compatibility', () => {
     it('should serialize event to JSON without losing data', () => {
       const event: CardPlayedEvent = {
         eventType: 'card.played',
         eventId: 'uuid',
         timestamp: Date.now(),
         sequenceNumber: 1,
         playerId: 'player1',
         cardId: 'card_01_01',
         fromLocation: CardLocation.HAND,
         toLocation: CardLocation.CAPTURED,
         matchedCardIds: ['card_02_01'],
       }

       // 序列化為 JSON
       const json = JSON.stringify(event)
       const parsed = JSON.parse(json)

       // 確保所有欄位都能正確還原
       expect(parsed).toEqual(event)

       // 確保沒有不可序列化的欄位（如 Date, Function）
       expect(json).not.toContain('[object Object]')
     })
   })
   ```

---

## 總結與建議

### 架構決策記錄 (ADR)

| 決策點 | 選擇方案 | 關鍵理由 |
|--------|----------|----------|
| 事件匯流排 | 自定義 EventBus | 輕量、型別安全、完全控制 |
| 事件策略 | 混合（快照+增量） | 平衡效能與一致性 |
| 日誌系統 | 環境感知 Logger | 開發友善、生產高效 |
| 型別定義 | TypeScript + Protobuf 相容原則 | 平滑演進路徑 |

### 實作優先順序

1. **Phase 1 - 基礎設施** (P0):
   - 實作 `IntegrationEvent` 基礎介面
   - 實作 `EventBus` 類別（含序號、日誌）
   - 實作 `EventLogger` 類別
   - 撰寫單元測試

2. **Phase 2 - 事件定義** (P0):
   - 定義所有整合事件介面（10+ 種）
   - 確保符合 Protobuf 相容原則
   - 撰寫事件序列化測試

3. **Phase 3 - BC 整合** (P1):
   - game-engine 注入 EventPublisherPort
   - game-ui 注入 EventSubscriberPort
   - 實作事件序號檢測與同步機制

4. **Phase 4 - 監控與除錯** (P2):
   - 實作開發者工具整合
   - 撰寫效能測試
   - 文件化事件流程圖

### 效能指標追蹤

| 指標 | 目標值 | 測量方式 |
|------|--------|----------|
| 單次事件發佈延遲 | <1ms | `performance.now()` |
| UI 狀態更新延遲 | <50ms | Vue DevTools Timeline |
| 事件大小 | <1KB | `JSON.stringify(event).length` |
| 記憶體佔用（EventBus） | <1MB | Chrome DevTools Memory Profiler |

### 潛在風險與緩解措施

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 事件遺失導致狀態不同步 | 高 | 實作序號檢測與自動同步機制 |
| 日誌影響生產環境效能 | 中 | 環境變數控制，預設關閉 |
| Protobuf 轉換不相容 | 低 | 遵循相容原則，撰寫轉換測試 |
| EventBus 記憶體洩漏 | 中 | 自動清理、Vue 生命週期整合 |

---

## 參考資源

### 技術文章
- [Event-Driven.io - In-Memory Message Bus in TypeScript](https://event-driven.io/en/inmemory_message_bus_in_typescript/)
- [Type-Safe Event Emitter in TypeScript](https://danilafe.com/blog/typescript_typesafe_events/)
- [Idempotency and Ordering in Event-Driven Systems](https://www.cockroachlabs.com/blog/idempotency-and-ordering-in-event-driven-systems/)

### 相關工具
- [ts-proto](https://github.com/stephenh/ts-proto) - TypeScript Protobuf generator
- [Protobuf-ES](https://buf.build/blog/protobuf-es-the-protocol-buffers-typescript-javascript-runtime-we-all-deserve) - Modern Protobuf runtime

### 專案文件
- [spec.md](./spec.md) - 功能規格
- [plan.md](./plan.md) - 實作計畫
- [CLAUDE.md](/Users/leo.huang/personal/hanahuda/CLAUDE.md) - 專案憲章
