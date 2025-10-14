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

本專案定義以下整合事件：

| 事件類型 | 描述 | 傳輸模式 |
|---------|------|---------|
| `GameInitializedEvent` | 遊戲初始化 | 完整快照 |
| `CardPlayedEvent` | 玩家出牌 | 增量事件 |
| `DeckCardRevealedEvent` | 牌堆翻牌（多重配對） | 增量事件 |
| `MatchSelectionRequiredEvent` | 需要選擇配對 | 增量事件 |
| `MatchSelectionTimeoutEvent` | 選擇配對逾時 | 增量事件 |
| `PlayerTurnChangedEvent` | 玩家回合切換 | 增量事件 |
| `YakuAchievedEvent` | 役種達成 | 增量事件 |
| `KoikoiDeclaredEvent` | Koi-Koi 宣告 | 增量事件 |
| `RoundEndedEvent` | 回合結束 | 增量事件 |
| `GameEndedEvent` | 遊戲結束 | 增量事件 |
| `GameAbandonedEvent` | 玩家放棄遊戲 | 增量事件 |

詳細的事件結構請參考 `integration-events-schema.json`。

## 參考資料

- [JSON Schema 官方文件](https://json-schema.org/)
- [Ajv (JSON Schema Validator)](https://ajv.js.org/)
- [專案 data-model.md](../data-model.md) - 詳細的資料模型說明
- [專案 research.md](../research.md) - 架構決策與研究報告
