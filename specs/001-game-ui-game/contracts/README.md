# Integration Event Contracts

本目錄包含 game-engine 與 game-ui 兩個 Bounded Context 之間的整合事件契約定義。

## 檔案結構

```
contracts/
├── README.md                          # 本檔案
├── integration-events-schema.json     # 所有整合事件的 JSON Schema
└── event-sequence-diagram.md          # 事件時序圖
```

## 契約用途

1. **Contract Testing**: 使用 JSON Schema 驗證 game-engine 發布的事件格式是否符合契約
2. **文件化**: 明確定義事件結構，供開發者參考
3. **版本管理**: 追蹤事件結構的變更歷史
4. **日後轉換**: 作為轉換為 Protocol Buffers schema 的參考

## 使用方式

### 驗證事件格式

```typescript
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import eventSchemas from './integration-events-schema.json'

const ajv = new Ajv()
addFormats(ajv)

const validate = ajv.compile(eventSchemas.definitions.CardPlayedEvent)

const event = {
  eventId: '123-abc',
  eventType: 'CardPlayed',
  timestamp: Date.now(),
  sequenceNumber: 1,
  // ...
}

if (validate(event)) {
  console.log('✅ Event format valid')
} else {
  console.error('❌ Event format invalid:', validate.errors)
}
```

### 在測試中使用

```typescript
// tests/contract/EventSchemaValidation.test.ts
import { describe, it, expect } from 'vitest'
import Ajv from 'ajv'
import eventSchemas from '@specs/001-game-ui-game/contracts/integration-events-schema.json'

describe('Contract Testing: Integration Events', () => {
  const ajv = new Ajv()

  it('game-engine 發布的 CardPlayedEvent 應符合契約', async () => {
    const validate = ajv.compile(eventSchemas.definitions.CardPlayedEvent)

    // 模擬 game-engine 發布事件
    const publishedEvent = await capturePublishedEvent(playCardUseCase)

    expect(validate(publishedEvent)).toBe(true)
  })
})
```

## 版本管理策略

### 允許的變更（向後相容）
- ✅ 新增可選欄位（`required` 陣列不包含該欄位）
- ✅ 新增新的事件類型（新增新的 definition）
- ✅ 擴展 enum 值（但不刪除現有值）

### 禁止的變更（破壞性變更）
- ❌ 刪除欄位
- ❌ 重新命名欄位
- ❌ 變更欄位型別
- ❌ 將可選欄位變為必填（加入 `required` 陣列）
- ❌ 刪除 enum 值

### 變更追蹤

當需要修改事件結構時：
1. 在 schema 的 `description` 欄位中註記變更日期與原因
2. 使用 `@since` 標記新增欄位的版本
3. 使用 `@deprecated` 標記棄用欄位（但不刪除）

範例：
```json
{
  "properties": {
    "newField": {
      "type": "string",
      "description": "@since 1.1.0 - 新增以支援動畫功能"
    },
    "oldField": {
      "type": "string",
      "description": "@deprecated 1.2.0 - 已由 newField 取代,將在 2.0.0 移除"
    }
  }
}
```

## 事件列表

本專案定義以下整合事件（v2.0 優化版）：

### 核心事件

| 事件類型 | 描述 | 傳輸模式 | 嵌套結構 |
|---------|------|---------|---------|
| `GameInitializedEvent` | 遊戲初始化 | 完整快照 | + `TurnTransition` |
| `CardPlayedEvent` | 玩家出牌（完整流程） | 增量事件 | + `MatchResult` (hand)<br>+ `MatchResult` (deck)<br>+ `TurnTransition` (可選) |
| `MatchSelectedEvent` | 玩家完成多重配對選擇 | 增量事件 | + `YakuResult[]`<br>+ `TurnTransition` |
| `KoikoiDeclaredEvent` | Koi-Koi 宣告 | 增量事件 | + `TurnTransition` (可選) |
| `RoundEndedEvent` | 回合結束 | 增量事件 | - |
| `GameEndedEvent` | 遊戲結束 | 增量事件 | - |
| `GameAbandonedEvent` | 玩家放棄遊戲 | 增量事件 | - |

### 共用數據結構

| 結構名稱 | 用途 | 包含欄位 |
|---------|------|---------|
| `MatchResult` | 配對結果 | `sourceCardId`, `sourceType`, `matchType`, `matchedFieldCardId`, `capturedCardIds`, `selectableFieldCardIds`, `selectedFieldCardId`, `autoSelected`, `selectionTimeout`, `achievedYaku` |
| `TurnTransition` | 回合切換資訊 | `previousPlayerId`, `currentPlayerId`, `reason` |
| `YakuResult` | 役種結果 | `yaku`, `points`, `cardIds` |

### v2.0 優化說明

**優勢**：
- 減少事件數量：一次出牌從 3-4 個事件減少到 1-2 個事件
- 原子性更好：相關信息在同一事件中，避免 UI 接收到部分狀態
- 簡化 UI 邏輯：不需要跨事件維護狀態

**刪除的事件**（已合併到新結構中）：
- ❌ `DeckCardRevealedEvent` → 合併到 `CardPlayedEvent.deckMatch`
- ❌ `MatchSelectionRequiredEvent` → 合併到 `CardPlayedEvent.deckMatch` (`matchType: 'multiple_matches'`)
- ❌ `MatchSelectionTimeoutEvent` → 合併到 `MatchSelectedEvent.autoSelected`
- ❌ `PlayerTurnChangedEvent` → 嵌套到各事件的 `turnTransition`
- ❌ `YakuAchievedEvent` → 嵌套到 `MatchResult.achievedYaku`

詳細的事件結構請參考 `integration-events-schema.json` 和 `OPTIMIZATION_PROPOSAL.md`。

## 參考資料

- [JSON Schema 官方文件](https://json-schema.org/)
- [Ajv (JSON Schema Validator)](https://ajv.js.org/)
- [專案 data-model.md](../data-model.md) - 詳細的資料模型說明
- [專案 research.md](../research.md) - 架構決策與研究報告
