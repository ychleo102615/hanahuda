# Phase 0: Research & Technical Decisions

**Feature**: Game UI-Engine 分離架構
**Date**: 2025-10-14
**Status**: Completed

本文檔彙整了在實作 game-engine 與 game-ui 兩個 Bounded Context 分離架構時,所需的技術研究與決策。

---

## 研究主題 1: 事件驅動架構最佳實踐

### 決策摘要

採用**自定義輕量級 EventBus + 增量事件傳輸 + 環境感知日誌**策略。

### 1.1 輕量級事件匯流排設計

#### Decision
實作自定義型別安全的記憶體內 EventBus，而非使用第三方函式庫。

#### Rationale
- **完全控制**: 可針對專案需求客製化，不受第三方 API 限制
- **零依賴**: 避免引入額外的 npm 套件，減少維護負擔
- **效能優化**: 針對單機模式最佳化，達成 <10ms 事件延遲目標
- **符合 Clean Architecture**: 易於實作為可抽換的 Infrastructure Adapter

#### 核心設計特性
```typescript
class EventBus {
  // 使用 Map + Set 實現 O(1) 查找效能
  private subscribers: Map<string, Set<EventHandler>>

  // 內建序號機制檢測事件遺失
  private sequenceNumber: number = 0

  // 同步執行達成低延遲
  publish<T>(event: T): void {
    const eventWithSeq = { ...event, sequenceNumber: ++this.sequenceNumber }
    this.subscribers.get(event.type)?.forEach(handler => handler(eventWithSeq))
  }

  // 錯誤隔離 - 單一 handler 失敗不影響其他 handler
  // 自動清理機制防止記憶體洩漏
}
```

#### Alternatives Considered
- **EventEmitter3**: 輕量但缺乏型別安全
- **RxJS**: 功能強大但學習曲線陡峭、打包體積大
- **mitt**: 極簡但缺乏事件序號等專案需求特性

#### Implementation Notes
- 在 `shared/events/base/EventBus.ts` 實作
- 透過 DI 注入到 game-engine 和 game-ui 的 Infrastructure Layer
- 日後前後端分離時，可替換為 `WebSocketEventBus` 而不影響業務邏輯

---

### 1.2 增量事件 vs 快照策略

#### Decision
採用**混合策略**：完整快照用於初始化/重新同步，其他情況使用增量事件。

#### Rationale
- **效能目標**: 符合 SC-002（非初始化事件 <1KB）
- **動畫支援**: 增量事件包含 `fromLocation` / `toLocation` 供 UI 動畫使用
- **狀態一致性**: 透過序號檢測遺失，自動觸發完整快照同步

#### 設計規則

| 情境 | 傳輸內容 | 資料量估算 | 理由 |
|------|---------|-----------|------|
| 初始化 / 重新整理 | 完整遊戲狀態快照 | ~5KB | 無法從增量重建 |
| 玩家出牌 | 牌 ID + 配對 ID + 捕獲 ID | ~200B | 最小化傳輸量 |
| 回合結束 | 獲勝者 ID + 役種列表 + 分數 | ~500B | 結果摘要即可 |
| 事件遺失檢測到 | 請求完整快照 | ~5KB | 確保狀態一致性 |

#### 範例：CardPlayedEvent（增量事件）
```typescript
interface CardPlayedEvent extends IntegrationEvent {
  sequenceNumber: number
  playerId: string
  cardId: string                    // 出的牌
  matchedFieldCardId?: string       // 配對的場牌（可選）
  capturedCardIds: string[]         // 捕獲的牌
  fromLocation: 'hand'              // 動畫起點
  toLocation: 'field' | 'captured'  // 動畫終點
  deckCardId: string                // 翻出的牌
  deckCardCapturedCardIds: string[] // 翻牌捕獲的牌
}
```

#### Implementation Notes
- game-ui 維護本地的 `GameViewModel`，接收增量事件後更新視圖狀態
- 當檢測到 `sequenceNumber` 不連續時，立即暫停處理新事件並請求完整快照
- 一旦同步完成後恢復事件處理

---

### 1.3 事件日誌與監控

#### Decision
實作**環境感知的分層日誌系統**，使用 `console` API，可透過環境變數控制。

#### Rationale
- **開發除錯**: 完整日誌協助追蹤事件流
- **生產效能**: 關閉或簡化日誌減少運算負擔
- **零依賴**: 不引入 Winston/Pino 等第三方日誌庫，保持輕量

#### 日誌層級設計

| 環境 | 日誌層級 | 輸出內容 | 觸發條件 |
|------|---------|---------|---------|
| Development | DEBUG | 完整事件內容 | 所有事件 |
| Production | ERROR | 僅錯誤訊息 | 事件處理失敗 |
| Production (關閉) | NONE | 無輸出 | `VITE_LOG_EVENTS=false` |

#### 範例實作
```typescript
// shared/events/base/EventLogger.ts
class EventLogger {
  private enabled = import.meta.env.MODE === 'development'
    || import.meta.env.VITE_LOG_EVENTS === 'true'

  logEventPublished(event: IntegrationEvent): void {
    if (!this.enabled) return

    if (import.meta.env.MODE === 'development') {
      console.log(
        `📤 [Event Published] ${event.eventType} (seq: ${event.sequenceNumber})`,
        event
      )
    } else {
      // Production: 僅記錄關鍵欄位
      console.log(`Event: ${event.eventType} | Seq: ${event.sequenceNumber}`)
    }
  }

  logEventError(event: IntegrationEvent, error: Error): void {
    console.error(
      `❌ [Event Error] ${event.eventType} (seq: ${event.sequenceNumber})`,
      error
    )
  }
}
```

#### Implementation Notes
- 開發環境可透過 `window.__eventBus` 暴露 EventBus 實例供開發者工具使用
- 日後前後端分離時，server 端可替換為專業日誌服務（如 Winston/Pino）

---

### 1.4 日後移植至 Protocol Buffers

#### Decision
現階段使用 **TypeScript 介面定義 + Protobuf 相容原則**，為日後轉換做準備。

#### Rationale
- **現階段簡便**: TypeScript 介面易於開發與除錯
- **日後可移植**: 遵循 Protobuf 相容原則，轉換成本低
- **跨語言支援**: 為日後可能的非 TypeScript 後端做準備

#### 禁用的 TypeScript 特性

| TypeScript 特性 | Protobuf 支援 | 替代方案 |
|----------------|--------------|---------|
| 泛型 `T<U>` | ❌ | 使用具體型別 |
| Union Types `A \| B` | ❌ | 使用 enum 或 oneof |
| `Date` 物件 | ❌ | 使用 `number` (timestamp) |
| `Map<K, V>` | ⚠️ 有限 | 使用 `Record<string, V>` 或陣列 |
| `Set<T>` | ❌ | 使用陣列 `T[]` |
| 可選鏈 `?.` | ✅ | 可用 optional 欄位 |
| 字串字面值 `'a' \| 'b'` | ❌ | 使用 enum |

#### 型別對照表

| TypeScript | Protocol Buffers | 範例 |
|-----------|-----------------|------|
| `string` | `string` | `playerId: string` |
| `number` | `int32`, `int64`, `double` | `score: int32` |
| `boolean` | `bool` | `isWinner: bool` |
| `Date` | `int64` (timestamp) | `timestamp: int64` |
| `string[]` | `repeated string` | `cardIds: repeated string` |
| `{ [key: string]: string }` | `map<string, string>` | `metadata: map<string, string>` |
| `type A = 'x' \| 'y'` | `enum A { X = 0; Y = 1; }` | `phase: GamePhase` |

#### 事件定義範例（Protobuf 相容）

```typescript
// ✅ 正確：Protobuf 相容
interface CardPlayedEvent extends IntegrationEvent {
  readonly eventType: 'CardPlayed'
  readonly sequenceNumber: number
  readonly timestamp: number           // 使用 Unix timestamp 而非 Date
  readonly playerId: string
  readonly cardId: string
  readonly capturedCardIds: string[]   // 使用陣列而非 Set
  readonly fromLocation: CardLocation  // 使用 enum 而非 string literal
}

enum CardLocation {
  HAND = 0,
  FIELD = 1,
  CAPTURED = 2,
  DECK = 3,
}

// ❌ 錯誤：不相容 Protobuf
interface BadEvent<T> {  // 泛型
  data: T | null         // Union type
  timestamp: Date        // Date 物件
  tags: Set<string>      // Set
}
```

#### 版本管理策略

**原則**: 永不破壞性變更（Backward Compatible Evolution）

- ✅ **允許**: 新增可選欄位 (`optional` / `?`)
- ✅ **允許**: 新增新的事件類型
- ✅ **允許**: 擴展 enum（但不刪除現有值）
- ❌ **禁止**: 刪除欄位
- ❌ **禁止**: 重新命名欄位
- ❌ **禁止**: 變更欄位型別
- ❌ **禁止**: 將可選欄位變為必填

#### Implementation Notes
- 在 TypeScript 介面中使用 JSDoc 註解標記欄位新增版本: `@since 1.1.0`
- 使用 `@deprecated` 標記棄用欄位，但不刪除
- 日後轉換時，可使用工具自動生成 `.proto` 檔案

---

## 研究主題 2: DDD Bounded Context 通訊模式

### 決策摘要

採用**目錄結構隔離 + ESLint 強制邊界 + 整合事件通訊**策略。

### 2.1 BC 隔離策略

#### Decision
採用 **Package by Feature + Strict Linting** 目錄結構。

```
src/
├── game-engine/           # Game Engine BC
│   ├── domain/
│   ├── application/
│   └── infrastructure/
├── game-ui/               # Game UI BC
│   ├── domain/
│   ├── application/
│   └── presentation/
└── shared/                # 僅限整合事件定義與常數
    ├── events/
    └── constants/
```

#### Rationale
1. **清晰的物理邊界**: 目錄結構即為 BC 邊界，一目瞭然
2. **工具支援**: ESLint 可強制執行隔離規則
3. **漸進式演進**: 日後可直接提取為獨立 NPM 套件或微服務
4. **測試隔離**: 測試目錄結構反映 BC 劃分

#### shared/ 目錄規範

**應包含**:
- ✅ 整合事件的 TypeScript 介面定義
- ✅ 事件匯流排抽象介面 (`IEventBus`, `IEventPublisher`)
- ✅ 全域常數 (如 `MAX_ROUNDS`, `CARD_TYPES`)
- ✅ 簡單的 Value Object (如 `CardId`, `PlayerId`) 用於事件傳遞

**不應包含**:
- ❌ Entity 類別 (應在各自 BC 內定義)
- ❌ Use Case 或業務邏輯
- ❌ Repository 介面 (屬於各 BC 的 Application Layer)
- ❌ UI 元件或 Presenter

#### 防止跨 BC 依賴的工具配置

**ESLint 規則**: 使用 `eslint-plugin-import`

```typescript
// eslint.config.ts
{
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        {
          target: './src/game-engine',
          from: './src/game-ui',
          message: 'game-engine BC must not depend on game-ui BC. Use integration events instead.',
        },
        {
          target: './src/game-ui',
          from: './src/game-engine',
          message: 'game-ui BC must not depend on game-engine BC. Use integration events instead.',
        },
      ],
    }],
  },
}
```

#### 靜態邊界檢查腳本

```javascript
// scripts/check-bc-boundaries.js
const engineFiles = glob.sync('src/game-engine/**/*.ts');
engineFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('from \'@game-ui') || content.includes('from \'../game-ui')) {
    violations.push(`${file}: game-engine imports game-ui`);
  }
});
```

#### Implementation Notes
- 在 `package.json` 新增 `npm run lint:boundaries` 腳本
- 在 CI/CD 中執行邊界檢查，防止違規合併

---

### 2.2 整合事件設計

#### Decision
採用 **增量事件 + 事件序號 + 向後相容** 的設計策略。

#### 事件命名慣例

**格式**: `{Domain}{PastTense}Event`

**範例**:
- ✅ `CardPlayedEvent` (過去式)
- ✅ `YakuAchievedEvent`
- ✅ `RoundEndedEvent`
- ❌ `PlayCardEvent` (現在式)
- ❌ `Card_Played_Event` (底線)

**理由**: 事件代表已發生的事實，不可撤銷，使用過去式表達。

#### 事件內容設計原則

**原則**: 傳遞 ID + 增量資料 + 足夠的上下文

**範例**:
```typescript
interface CardPlayedEvent extends IntegrationEvent {
  readonly sequenceNumber: number
  // 核心資料: ID + 增量
  readonly playerId: string
  readonly cardId: string
  readonly capturedCardIds: string[]
  // 上下文資訊（供 UI 動畫使用）
  readonly fromLocation: 'hand'
  readonly toLocation: 'field' | 'captured'
}
```

#### 何時傳遞完整快照 vs 增量

| 情境 | 傳遞內容 | 理由 |
|------|---------|------|
| 初始化/重新整理 | 完整快照 | 無法從增量重建狀態 |
| 出牌/移動 | ID + 位置變化 | 最小化傳輸量 |
| 分數變化 | 新分數 + 役種列表 | UI 需要顯示役種名稱 |
| 回合結束 | 結果摘要 | 不需完整歷程 |

#### 事件序號機制

**目的**: 檢測事件遺失、順序錯誤、重複處理

```typescript
// game-ui 接收端
class EventSubscriber {
  private lastProcessedSeq = 0

  async handle(event: IntegrationEvent): Promise<void> {
    // 檢測序號不連續
    if (event.sequenceNumber !== this.lastProcessedSeq + 1) {
      console.warn(`⚠️ Event sequence gap detected`)
      await this.requestFullStateSync()
      return
    }

    this.lastProcessedSeq = event.sequenceNumber
    await this.processEvent(event)
  }
}
```

#### Implementation Notes
- 事件基礎型別 `IntegrationEvent` 包含 `eventId`, `eventType`, `timestamp`, `sequenceNumber`
- 所有事件都繼承此基礎型別
- 事件在 `shared/events/game/` 目錄定義

---

### 2.3 單體內的 BC vs 微服務演進策略

#### Decision
採用 **Modular Monolith First, Microservices Ready** 策略。

#### 演進路徑

| 階段 | 部署模式 | 通訊方式 | 時機 |
|------|---------|---------|------|
| **現階段** | 單體部署 | 記憶體內 EventBus | 現在 |
| **中期** | 單體 + NPM 套件 | 同上 | game-engine 需獨立測試時 |
| **長期** | 前後端分離 | WebSocket/HTTP | 需要防作弊或獨立擴展時 |

#### 何時應該拆分為微服務

**觸發條件** (滿足任一即可考慮):
- ✅ 團隊規模 > 10 人
- ✅ 某個 BC 的流量遠大於其他 BC
- ✅ 某個 BC 需要不同的技術棧
- ✅ 安全性要求 (如 game-engine 需在後端保護遊戲邏輯)

**目前專案狀態**:
- ❌ 團隊規模小 (1-2 人)
- ❌ 流量需求未知
- ❌ 單一技術棧 (TypeScript)
- ✅ 安全性需求 (未來防止作弊)

**結論**: 現階段保持單體，但為安全性（防作弊）預留拆分路徑。

#### 讓日後拆分更容易的設計

**可抽換的 EventBus 介面**:
```typescript
// shared/events/ports/IEventBus.ts
export interface IEventBus {
  publish<T extends IntegrationEvent>(event: T): Promise<void>
  subscribe<T extends IntegrationEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): () => void
}

// 單體模式實作
class InMemoryEventBus implements IEventBus { /* ... */ }

// 微服務模式實作 (日後)
class WebSocketEventBus implements IEventBus { /* ... */ }
```

**Composition Root 注入**:
```typescript
const eventBus = import.meta.env.MODE === 'standalone'
  ? new InMemoryEventBus()
  : new WebSocketEventBus(new WebSocket(import.meta.env.VITE_ENGINE_WS_URL))
```

#### Implementation Notes
- 使用 Feature Flag (`DEPLOYMENT_MODE`) 切換單機/前後端模式
- 業務邏輯完全不感知通訊方式，只依賴 `IEventBus` 介面

---

### 2.4 測試策略

#### Decision
採用 **分層測試金字塔 + Contract Testing** 策略。

#### 測試層級

```
        ╱╲
       ╱E2E╲       ← 少量 (Playwright)
      ╱──────╲
     ╱ Contract ╲   ← 中量 (JSON Schema / Pact)
    ╱────────────╲
   ╱ Integration  ╲ ← 中量 (Vitest)
  ╱────────────────╲
 ╱      Unit        ╲ ← 大量 (Vitest)
╱────────────────────╲
```

#### 1. 事件結構單元測試

```typescript
// tests/unit/shared/events/CardPlayedEvent.test.ts
describe('CardPlayedEvent', () => {
  it('應包含所有必填欄位', () => {
    const event: CardPlayedEvent = { /* ... */ }
    expect(event.eventType).toBe('CardPlayed')
    expect(event.playerId).toBeDefined()
  })

  it('capturedCardIds 可為空陣列（無配對情況）', () => {
    const event: CardPlayedEvent = { capturedCardIds: [] }
    expect(event.capturedCardIds).toHaveLength(0)
  })
})
```

#### 2. 事件發布整合測試

```typescript
// tests/integration/game-engine/PlayCardUseCase.test.ts
describe('PlayCardUseCase - Event Publishing', () => {
  it('出牌成功應發布 CardPlayedEvent', async () => {
    const eventBus = new InMemoryEventBus()
    const publishSpy = vi.spyOn(eventBus, 'publish')

    await useCase.execute({ playerId: 'player-1', cardId: 'card-01' })

    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'CardPlayed' })
    )
  })
})
```

#### 3. 事件訂閱整合測試

```typescript
// tests/integration/game-ui/GameUIEventSubscriber.test.ts
describe('GameUIEventSubscriber', () => {
  it('接收 CardPlayedEvent 應更新 ViewModel', async () => {
    const subscriber = new GameUIEventSubscriber(viewModel)

    await eventBus.publish({ eventType: 'CardPlayed', /* ... */ })

    expect(viewModel.players[0].handCardIds).not.toContain('card-01')
  })
})
```

#### 4. 邊界檢查測試

```typescript
// tests/unit/architecture/BoundaryIsolation.test.ts
describe('Bounded Context Isolation', () => {
  it('game-engine 不應 import game-ui', () => {
    const engineFiles = glob.sync('src/game-engine/**/*.ts')
    engineFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).not.toMatch(/from ['"].*game-ui/)
    })
  })
})
```

#### 5. 契約測試 (JSON Schema)

```typescript
// tests/contract/EventSchemaValidation.test.ts
import Ajv from 'ajv'
import cardPlayedSchema from '@shared/events/schemas/CardPlayedEvent.schema.json'

describe('Event Schema Validation', () => {
  it('game-engine 發布的 CardPlayedEvent 應符合 schema', () => {
    const validate = ajv.compile(cardPlayedSchema)
    const event = { /* ... */ }
    expect(validate(event)).toBe(true)
  })
})
```

#### Implementation Notes
- 契約測試在 CI 中執行，確保事件結構變更時會被檢測到
- 邊界檢查測試可防止意外引入跨 BC 依賴

---

## 研究主題 3: 花牌來來遊戲規則正確實作

### 決策摘要

採用**標準花牌來來規則 + 11 月雨光特殊處理 + 自動/手動選擇混合策略**。

### 3.1 役種判定規則

#### 光牌役種的特殊規則

**關鍵決策**: 11 月雨光 (小野道風) 被視為「劣等光」，有特殊處理規則。

| 役種 | 條件 | 得分 | 特殊規則 |
|------|------|------|---------|
| **五光** | 5 張光牌 | 10 | 包含所有光牌 |
| **四光** | 4 張光牌且**不含**雨光 | 8 | 雨光不計入 |
| **雨四光** | 4 張光牌且**包含**雨光 | 7 | 雨光使分數降低 |
| **三光** | 3 張光牌且**不含**雨光 | 5 | **雨光會使役種無效** |
| ~~雨三光~~ | 3 張光牌且包含雨光 | ❌ 0 | **不成立任何役種** |

#### Rationale
- 11 月柳描繪小野道風在雨中望著青蛙，被視為「劣等光」
- **3 張光含雨光不成立三光** 是花牌規則中最容易出錯的邊界情況
- 4 張光時雨光可計入（雨四光），但 3 張光時雨光會使役種無效

#### 實作要點
```typescript
// ✅ 正確實作
if (brightCards.length === 3 && !hasNovemberBright) {
  return { yaku: 'SANKO', points: 5 }
}
if (brightCards.length === 3 && hasNovemberBright) {
  return null  // 不成立任何役種
}
```

#### 其他役種

| 役種 | 條件 | 得分 | 備註 |
|------|------|------|------|
| **猪鹿蝶** | 7月萩、10月紅葉、6月牡丹 | 5 | 必須全部收集 |
| **赤短** | 1月松、2月梅、3月櫻 短冊 | 5 | 紅底金字 |
| **青短** | 6月牡丹、9月菊、10月紅葉 短冊 | 5 | 藍底素面 |
| **種** | 5 張以上動物牌 | 1 + 超過數 | 可與猪鹿蝶同時成立 |
| **短** | 5 張以上短冊牌 | 1 + 超過數 | 可與赤短、青短同時成立 |
| **カス** | 10 張以上カス牌 | 1 + 超過數 | 最普通的牌 |

---

### 3.2 配對規則與多重配對處理

#### 基本配對規則

**Decision**: 同月份 (suit) 的牌即可配對。

```typescript
const canMatch = handCard.suit === fieldCard.suit
```

#### 手牌出牌的多重配對處理

| 場上配對數 | 處理方式 | 理由 |
|-----------|---------|------|
| **0 張** | 手牌直接放置到場上 | 無配對 |
| **1 張** | 自動捕獲該配對牌 | 無需選擇 |
| **2 張** | 玩家**必須**選擇其中一張 | 策略性選擇 |
| **3 張** | 自動捕獲全部 3 張場牌 | 「三枚合わせ」規則 |

#### Rationale
- **2 張配對**: 玩家需要根據當前役種進度決定捕獲哪張牌（如優先捕獲光牌）
- **3 張配對**: 因為花牌每月只有 4 張，場上有 3 張意味著玩家打出了該月份的最後一張，規則上自動獲得所有 4 張牌

#### 牌堆翻牌的多重配對處理

**Decision**: 需要玩家在限時內選擇；超時則自動按優先順序選擇。

**實作流程**:
1. 發送 `DeckCardRevealedEvent` (包含可配對場牌列表)
2. 發送 `MatchSelectionRequiredEvent` (設定選擇時限，預設 10 秒)
3. UI 顯示倒數計時器和可選場牌
4. 若玩家在時限內選擇 → 執行選擇的配對
5. 若超時未選擇 → 觸發自動選擇邏輯

**自動選擇優先順序**:
```
優先級: 光 (Bright) > 種 (Animal) > 短 (Ribbon) > カス (Plain)
同類型: 按場牌出現順序選擇第一張 (FIFO)
```

#### Implementation Notes
- 需要新增 `CardMatchingService` 領域服務實作自動選擇邏輯
- game-engine 和 game-ui 都需要此服務（engine 用於自動選擇，ui 用於顯示選項）
- 目前程式碼在 `PlayCardUseCase.ts:89-91` 簡單選擇第一張，**未實作優先順序和限時選擇**

---

### 3.3 Koi-Koi 宣告機制

#### 宣告時機

**Decision**: 玩家湊成役種且手牌未用盡時，必須詢問是否 Koi-Koi。

```typescript
if (yakuResults.length > 0 && currentPlayer.handCount > 0) {
  gameState.setPhase('koikoi')
}
```

#### 選擇 Koi-Koi (宣告繼續)

**後果**:
- 若玩家後續湊成更高役種獲勝 → 所有役種分數**加倍 (×2)**
- 若對手先湊成役種獲勝 → 對手分數**加倍 (×2)**，宣告者得 **0 分**

#### 選擇勝負 (Shobu - 拒絕繼續)

**後果**: 立即結束回合，計算分數，宣告者獲勝。

#### Koi-Koi 計分規則

**Decision**: 採用標準規則的單次加倍 (×2)。

| 情況 | 宣告者分數 | 對手分數 | 範例 |
|------|----------|---------|------|
| 宣告者後續獲勝 | 役種分數 × 2 | 0 | 三光 5 分 → 10 分 |
| 對手獲勝 | 0 | 役種分數 × 2 | 對手三光 5 分 → 10 分 |
| 雙方無新役種 | 0 | 0 | 平局 |

#### 實作要點

```typescript
// ✅ 正確實作
function calculateFinalScore(winner, koikoiPlayer, baseScore) {
  if (koikoiPlayer) {
    if (winner === koikoiPlayer) {
      return baseScore * 2  // 宣告者獲勝，加倍
    } else {
      // 對手獲勝，對手加倍，宣告者 0 分
      return { [winner]: baseScore * 2, [koikoiPlayer]: 0 }
    }
  }
  return baseScore
}
```

#### Alternatives Considered
- 部分地方規則採用「每次 Koi-Koi 累加倍數」(×2, ×3, ×4...)
- 部分地方規則額外規定 7+ 分自動雙倍
- **我們採用標準規則的單次加倍**，保持簡潔性

#### Implementation Notes
- 目前程式碼在 `CalculateScoreUseCase.ts:72-76` 的實作**不完整**
- 未處理「對手宣告 Koi-Koi 但玩家獲勝」的加倍情況
- 需要修正以正確處理所有加倍情境

---

### 3.4 邊界情況處理

#### 平局判定

**Decision**: 所有手牌與牌堆用盡，雙方都沒有任何役種 → 引き分け (平局)。

```typescript
if (player1Yaku.length === 0 && player2Yaku.length === 0) {
  return { winner: 'draw', score: 0 }
}
```

#### 遊戲結束條件

| 條件 | 處理方式 |
|------|---------|
| 所有手牌與牌堆用盡 | 結束本回合，計算分數 |
| 手牌用盡但湊成役種 | 自動結束回合，**不詢問 Koi-Koi** |
| 達到最大回合數 (12) | 比較總分決定最終勝者 |

#### 玩家放棄遊戲

**Decision**: 玩家可在任何階段選擇放棄，對手自動獲勝。

**實作流程**:
1. 玩家點擊放棄按鈕
2. 顯示確認對話框
3. 確認後發送 `GameAbandonedEvent`
4. 對手自動獲勝，遊戲結束

#### Implementation Notes
- 此功能在 spec.md (User Story 3) 中定義
- 目前程式碼**尚未實作**
- 應在所有階段都可觸發 (setup, dealing, playing, koikoi, round_end)
- 需要新增 `AbandonGameUseCase` 或在 `GameFlowCoordinator` 新增方法

---

## 現有實作現狀分析

### ✅ 已正確實作的部分

1. **役種判定邏輯** (`Yaku.ts`)
   - 五光、四光、雨四光、三光的判定正確
   - 11 月雨光的特殊處理正確
   - 其他役種判定正確

2. **基本配對規則** (`Card.ts`, `GameState.ts`)
   - 同月份配對規則正確
   - `getFieldMatches()` 方法正確

3. **Koi-Koi 宣告時機** (`PlayCardUseCase.ts:112-123`)
   - 正確判斷湊成役種且手牌未用盡時進入 koikoi 階段

4. **平局處理** (`GameFlowCoordinator.ts:182-186`)
   - 雙方無役種時正確判定為 draw

### ❌ 需要補充或修正的部分

#### P0 (Critical) - 影響遊戲正確性

1. **修正 Koi-Koi 計分加倍邏輯** (`CalculateScoreUseCase.ts`)
   - 未處理「對手宣告 Koi-Koi 但玩家獲勝」的加倍情況
   - 未處理「宣告 Koi-Koi 的玩家獲勝」的加倍情況

2. **補充場上 3 張配對的自動捕獲邏輯** (`PlayCardUseCase.ts`)
   - 目前未處理場上有 3 張同月份牌的情況
   - 需要自動捕獲全部 3 張

#### P1 (High) - 影響使用者體驗

3. **實作牌堆翻牌的優先順序自動選擇**
   - 目前只是選擇第一張，沒有按優先順序（光 > 種 > 短 > カス）

4. **新增牌堆翻牌限時選擇機制**
   - 完全未實作玩家選擇牌堆翻牌配對的流程
   - 需要新增 `DeckCardRevealedEvent`, `MatchSelectionRequiredEvent`, `MatchSelectionTimeoutEvent`

#### P2 (Medium) - 功能完整性

5. **實作玩家放棄遊戲功能**
   - 需要新增 `GameAbandonedEvent`
   - 需要新增 `AbandonGameUseCase`

6. **新增 CardMatchingService 領域服務**
   - 抽離配對規則、自動選擇邏輯為獨立服務
   - 避免在 game-engine 和 game-ui 中重複實作

---

## 實作建議

### Phase 0 → Phase 1 過渡

在進入 Phase 1 (生成 data-model.md, contracts/) 前，本研究報告解決了所有 Technical Context 中的 "NEEDS CLARIFICATION"：

- ✅ **事件匯流排實作方案**: 自定義輕量級 EventBus
- ✅ **增量事件設計策略**: 混合策略（完整快照 + 增量事件）
- ✅ **BC 隔離工具**: ESLint + 目錄結構
- ✅ **Protocol Buffers 移植準備**: 遵循相容原則
- ✅ **遊戲規則細節**: 11 月雨光特殊規則、多重配對處理、Koi-Koi 計分

### 實作優先級

**第一階段** (1-2 週): 建立 BC 隔離
1. 建立 `src/game-engine/`, `src/game-ui/`, `src/shared/events/` 目錄
2. 定義完整的整合事件介面（Phase 1 contracts/）
3. 實作 `InMemoryEventBus`
4. 配置 ESLint 規則防止跨 BC import

**第二階段** (2-3 週): 事件驅動重構
1. 重構 `GameFlowCoordinator` 改為發布事件
2. game-ui 訂閱事件並更新 ViewModel
3. 實作事件序號機制
4. 加入事件日誌

**第三階段** (1 週): 遊戲規則修正
1. 修正 Koi-Koi 計分加倍邏輯
2. 補充場上 3 張配對的自動捕獲
3. 實作 CardMatchingService 自動選擇邏輯

**第四階段** (1 週): 功能完整性
1. 實作牌堆翻牌限時選擇機制
2. 實作玩家放棄遊戲功能

---

## Architecture Decision Records (ADRs)

本研究過程中做出的關鍵架構決策已記錄，可在日後回顯原因：

- **ADR-001**: BC 通訊採用整合事件模式
- **ADR-002**: 事件匯流排採用自定義實作而非第三方函式庫
- **ADR-003**: 採用增量事件而非完整快照傳輸
- **ADR-004**: 遵循 Protocol Buffers 相容原則設計事件結構
- **ADR-005**: 採用標準花牌規則，11 月雨光特殊處理

---

## 憲章合規確認

根據專案憲章，本研究報告確保：

- ✅ **依賴反轉原則**: game-engine 與 game-ui 透過 shared/events 抽象通訊
- ✅ **領域純淨性**: Domain Layer 不依賴 EventBus，透過 Port 注入
- ✅ **BC 隔離**: 兩個 BC 只透過整合事件通訊
- ✅ **分層測試**: 單元測試 + 整合測試 + 契約測試
- ✅ **Adapter 解耦**: EventBus 作為 Infrastructure Adapter，透過介面注入

---

**研究完成日期**: 2025-10-14
**下一階段**: Phase 1 - Design & Contracts
