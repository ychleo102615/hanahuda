# Quickstart Guide: User Interface BC - Application Layer

**Feature**: 003-ui-application-layer
**Date**: 2025-11-14
**Purpose**: 開發者快速上手指南

## 目錄

1. [快速開始](#快速開始)
2. [專案結構](#專案結構)
3. [如何新增 Use Case](#如何新增-use-case)
4. [如何撰寫測試](#如何撰寫測試)
5. [常見開發模式](#常見開發模式)
6. [除錯與日誌](#除錯與日誌)
7. [常見問題](#常見問題)
8. [參考資源](#參考資源)

---

## 快速開始

### 前置需求

- Node.js 18+
- pnpm / npm
- TypeScript 5.9+
- Vitest（已設定）

### 安裝與設定

```bash
# 進入前端專案目錄
cd front-end

# 安裝依賴
pnpm install

# 執行測試
pnpm test

# 執行類型檢查
pnpm type-check
```

### 第一個 Use Case

以下範例展示如何實作一個簡單的 Use Case：

```typescript
// src/user-interface/application/use-cases/player-operations/PlayHandCardUseCase.ts

import type {
  PlayHandCardPort,
  SendCommandPort,
  TriggerUIEffectPort
} from '../../ports'
import type { DomainFacade } from '../../types'
import type { Result } from '../../types/result'

export class PlayHandCardUseCase implements PlayHandCardPort {
  constructor(
    private readonly sendCommand: SendCommandPort,
    private readonly triggerUIEffect: TriggerUIEffectPort,
    private readonly domainFacade: DomainFacade
  ) {}

  execute(input: PlayHandCardInput): Result<PlayHandCardOutput> {
    // 1. 預驗證
    if (!this.domainFacade.validateCardExists(input.cardId, input.handCards)) {
      return { success: false, error: 'CARD_NOT_IN_HAND' }
    }

    // 2. 檢查配對
    const matchable = this.domainFacade.findMatchableCards(
      input.cardId,
      input.fieldCards
    )

    // 3. 多重配對處理
    if (matchable.length > 1) {
      this.triggerUIEffect.showSelectionUI(matchable)
      return {
        success: true,
        value: {
          needSelection: true,
          possibleTargets: matchable
        }
      }
    }

    // 4. 單一配對或無配對處理
    const target = matchable.length === 1 ? matchable[0] : undefined
    this.sendCommand.playHandCard(input.cardId, target)

    return {
      success: true,
      value: {
        needSelection: false,
        selectedTarget: target || null
      }
    }
  }
}
```

---

## 專案結構

### 目錄結構

```
front-end/src/user-interface/application/
├── index.ts                    # 公開 API 匯出
├── types/                      # Protocol 事件型別定義
│   ├── events.ts              # SSE 事件型別
│   ├── commands.ts            # 命令型別
│   ├── flow-state.ts          # FlowState 枚舉
│   ├── result.ts              # Result 型別
│   ├── domain-facade.ts     # Domain Services 介面
│   └── index.ts
├── ports/                      # Port 介面定義
│   ├── input/                 # Input Ports
│   │   ├── player-operations.port.ts
│   │   ├── event-handlers.port.ts
│   │   └── index.ts
│   ├── output/                # Output Ports
│   │   ├── send-command.port.ts
│   │   ├── update-ui-state.port.ts
│   │   ├── trigger-ui-effect.port.ts
│   │   └── index.ts
│   └── index.ts
└── use-cases/                  # Use Case 實作
    ├── player-operations/     # 玩家操作 Use Cases
    │   ├── PlayHandCardUseCase.ts
    │   ├── SelectMatchTargetUseCase.ts
    │   ├── MakeKoiKoiDecisionUseCase.ts
    │   └── index.ts
    ├── event-handlers/        # 事件處理 Use Cases
    │   ├── HandleGameStartedUseCase.ts
    │   ├── HandleRoundDealtUseCase.ts
    │   └── ... (13+ 其他)
    │   └── index.ts
    └── index.ts
```

### 匯出模式

Application Layer 使用統一的匯出介面：

```typescript
// src/user-interface/application/index.ts

// 型別匯出
export type {
  GameStartedEvent,
  RoundDealtEvent,
  FlowState
} from './types'

// Port 介面匯出
export type {
  PlayHandCardPort,
  SendCommandPort,
  UpdateUIStatePort
} from './ports'

// Use Case 匯出
export {
  PlayHandCardUseCase,
  HandleGameStartedUseCase
} from './use-cases'
```

**使用範例**（Adapter Layer）:
```typescript
import {
  PlayHandCardUseCase,
  type SendCommandPort,
  type TriggerUIEffectPort
} from '@/user-interface/application'
```

---

## 如何新增 Use Case

### Step 1: 定義 Input Port 介面

```typescript
// ports/input/player-operations.port.ts

export interface NewFeaturePort {
  execute(input: NewFeatureInput): NewFeatureOutput
}

export interface NewFeatureInput {
  // 定義輸入參數
}

export type NewFeatureOutput = Result<{
  // 定義輸出結果
}>
```

### Step 2: 實作 Use Case 類別

```typescript
// use-cases/player-operations/NewFeatureUseCase.ts

import type { NewFeaturePort } from '../../ports'
import type { SendCommandPort, UpdateUIStatePort } from '../../ports/output'
import type { DomainFacade } from '../../types'

export class NewFeatureUseCase implements NewFeaturePort {
  constructor(
    private readonly sendCommand: SendCommandPort,
    private readonly updateUIState: UpdateUIStatePort,
    private readonly domainFacade: DomainFacade
  ) {}

  execute(input: NewFeatureInput): NewFeatureOutput {
    // 1. 業務邏輯編排
    // 2. 調用 Domain Layer
    // 3. 調用 Output Ports
    // 4. 返回結果
  }
}
```

### Step 3: 更新匯出

```typescript
// use-cases/player-operations/index.ts
export { NewFeatureUseCase } from './NewFeatureUseCase'

// use-cases/index.ts
export { NewFeatureUseCase } from './player-operations'

// index.ts
export { NewFeatureUseCase } from './use-cases'
```

### Step 4: 撰寫測試（見下節）

---

## 如何撰寫測試

### 測試檔案結構

```
src/__tests__/user-interface/application/
├── test-helpers/
│   └── mock-factories.ts      # Mock 工廠函數
└── use-cases/
    ├── player-operations/
    │   └── PlayHandCardUseCase.test.ts
    └── event-handlers/
        └── HandleGameStartedUseCase.test.ts
```

### 建立 Mock 工廠函數

```typescript
// __tests__/user-interface/application/test-helpers/mock-factories.ts

import { vi } from 'vitest'
import type {
  SendCommandPort,
  UpdateUIStatePort,
  TriggerUIEffectPort,
  DomainFacade
} from '@/user-interface/application'

export function createMockSendCommandPort(): SendCommandPort {
  return {
    playHandCard: vi.fn().mockResolvedValue(undefined),
    selectTarget: vi.fn().mockResolvedValue(undefined),
    makeDecision: vi.fn().mockResolvedValue(undefined)
  }
}

export function createMockUpdateUIStatePort(): UpdateUIStatePort {
  return {
    setFlowStage: vi.fn(),
    updateFieldCards: vi.fn(),
    updateHandCards: vi.fn(),
    updateDepositoryCards: vi.fn(),
    updateScores: vi.fn(),
    updateDeckRemaining: vi.fn(),
    updateKoiKoiMultiplier: vi.fn()
  }
}

export function createMockTriggerUIEffectPort(): TriggerUIEffectPort {
  return {
    showSelectionUI: vi.fn(),
    showDecisionModal: vi.fn(),
    showErrorMessage: vi.fn(),
    showReconnectionMessage: vi.fn(),
    triggerAnimation: vi.fn()
  }
}

export function createMockDomainFacade(
  overrides?: Partial<DomainFacade>
): DomainFacade {
  return {
    canMatch: vi.fn().mockReturnValue(true),
    findMatchableCards: vi.fn().mockReturnValue([]),
    validateCardExists: vi.fn().mockReturnValue(true),
    validateTargetInList: vi.fn().mockReturnValue(true),
    calculateYakuProgress: vi.fn().mockReturnValue({
      required: [],
      obtained: [],
      missing: [],
      progress: 0
    }),
    ...overrides
  }
}
```

### 撰寫測試案例

```typescript
// __tests__/user-interface/application/use-cases/player-operations/PlayHandCardUseCase.test.ts

import { describe, it, expect, vi } from 'vitest'
import { PlayHandCardUseCase } from '@/user-interface/application'
import {
  createMockSendCommandPort,
  createMockTriggerUIEffectPort,
  createMockDomainFacade
} from '../../../test-helpers/mock-factories'

describe('PlayHandCardUseCase', () => {
  describe('多重配對情況', () => {
    it('應該觸發選擇 UI 並返回可選目標列表', () => {
      // Arrange
      const mockSendCommand = createMockSendCommandPort()
      const mockTriggerUIEffect = createMockTriggerUIEffectPort()
      const mockDomainFacade = createMockDomainFacade({
        findMatchableCards: vi.fn().mockReturnValue(['0343', '0344'])
      })

      const useCase = new PlayHandCardUseCase(
        mockSendCommand,
        mockTriggerUIEffect,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        cardId: '0341',
        handCards: ['0341', '0342'],
        fieldCards: ['0343', '0344']
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.needSelection).toBe(true)
        expect(result.value.possibleTargets).toEqual(['0343', '0344'])
      }
      expect(mockTriggerUIEffect.showSelectionUI).toHaveBeenCalledWith(['0343', '0344'])
      expect(mockSendCommand.playHandCard).not.toHaveBeenCalled()
    })
  })

  describe('單一配對情況', () => {
    it('應該直接發送命令並返回選中目標', () => {
      // Arrange
      const mockSendCommand = createMockSendCommandPort()
      const mockTriggerUIEffect = createMockTriggerUIEffectPort()
      const mockDomainFacade = createMockDomainFacade({
        findMatchableCards: vi.fn().mockReturnValue(['0343'])
      })

      const useCase = new PlayHandCardUseCase(
        mockSendCommand,
        mockTriggerUIEffect,
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        cardId: '0341',
        handCards: ['0341'],
        fieldCards: ['0343']
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.value.needSelection).toBe(false)
        expect(result.value.selectedTarget).toBe('0343')
      }
      expect(mockSendCommand.playHandCard).toHaveBeenCalledWith('0341', '0343')
      expect(mockTriggerUIEffect.showSelectionUI).not.toHaveBeenCalled()
    })
  })

  describe('預驗證失敗', () => {
    it('應該返回錯誤當卡片不在手牌中', () => {
      // Arrange
      const mockDomainFacade = createMockDomainFacade({
        validateCardExists: vi.fn().mockReturnValue(false)
      })

      const useCase = new PlayHandCardUseCase(
        createMockSendCommandPort(),
        createMockTriggerUIEffectPort(),
        mockDomainFacade
      )

      // Act
      const result = useCase.execute({
        cardId: '0341',
        handCards: ['0342'],
        fieldCards: []
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CARD_NOT_IN_HAND')
      }
    })
  })
})
```

### 執行測試

```bash
# 執行所有測試
pnpm test

# 執行特定測試
pnpm test PlayHandCardUseCase

# 生成覆蓋率報告
pnpm test --coverage

# 監視模式（自動重新執行）
pnpm test --watch
```

---

## 常見開發模式

### 模式 1: 同步操作返回 Result 型別

適用於：客戶端預驗證、業務邏輯編排

```typescript
execute(input: SomeInput): Result<SomeOutput> {
  // 驗證
  if (!this.domainFacade.validate(input)) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  // 業務邏輯
  const result = this.domainFacade.processLogic(input)

  // 成功返回
  return { success: true, value: result }
}
```

### 模式 2: 異步操作使用 Promise

適用於：調用 Output Ports（發送命令、觸發動畫）

```typescript
async execute(input: SomeInput): Promise<void> {
  // 調用 Output Port（異步）
  await this.sendCommand.someCommand(input)

  // 觸發 UI 效果（同步，但不等待）
  this.triggerUIEffect.someEffect(input)
}
```

### 模式 3: 事件處理 Use Case

適用於：SSE 事件處理

```typescript
execute(event: SomeEvent): void {
  // 1. 解析事件數據
  const { field_cards, hands, next_state } = event

  // 2. 觸發動畫
  this.triggerUIEffect.triggerAnimation('SOME_TYPE', { ... })

  // 3. 更新 UI 狀態
  this.updateUIState.updateFieldCards(field_cards)
  this.updateUIState.updateHandCards(hands[0].cards)

  // 4. 更新 FlowStage
  this.updateUIState.setFlowStage(next_state.state_type)
}
```

### 模式 4: 條件分支處理

```typescript
execute(input: SomeInput): Result<SomeOutput> {
  const matchable = this.domainFacade.findMatchableCards(...)

  if (matchable.length === 0) {
    // 處理無配對情況
    return this.handleNoMatch(input)
  } else if (matchable.length === 1) {
    // 處理單一配對情況
    return this.handleSingleMatch(input, matchable[0])
  } else {
    // 處理多重配對情況
    return this.handleMultipleMatches(input, matchable)
  }
}
```

---

## 除錯與日誌

### 日誌規範

**Development 環境**:
```typescript
// 正常流程
console.log('[PlayHandCardUseCase] Executing with input:', input)

// 錯誤情況
console.error('[PlayHandCardUseCase] Validation failed:', error)

// 警告情況
console.warn('[PlayHandCardUseCase] Unexpected state:', state)
```

**Production 環境**:
- 移除 `console.log`
- 保留 `console.error` 並整合 Sentry 等錯誤追蹤工具
- 使用結構化日誌格式

### 除錯技巧

#### 1. 使用 Vitest Debug

```bash
# 進入除錯模式
pnpm test --inspect-brk

# 在 Chrome 開啟 chrome://inspect
```

#### 2. 檢查 Mock 調用

```typescript
it('應該調用正確的方法', () => {
  // ...測試邏輯

  // 檢查 Mock 是否被調用
  expect(mockSendCommand.playHandCard).toHaveBeenCalled()

  // 檢查調用次數
  expect(mockSendCommand.playHandCard).toHaveBeenCalledTimes(1)

  // 檢查調用參數
  expect(mockSendCommand.playHandCard).toHaveBeenCalledWith('0341', '0343')
})
```

#### 3. 驗證狀態變化

```typescript
// 測試前
const initialState = { flowStage: 'AWAITING_HAND_PLAY' }

// 執行 Use Case
useCase.execute(input)

// 驗證狀態更新
expect(mockUpdateUIState.setFlowStage).toHaveBeenCalledWith('AWAITING_SELECTION')
```

---

## 常見問題

### Q1: Use Case 應該調用多個 Domain Layer 函數嗎？

**A**: 可以。Use Cases 負責編排業務流程，可以調用多個 Domain Layer 函數，但不應包含業務邏輯實作。

**範例**:
```typescript
execute(input: SomeInput): SomeOutput {
  // ✅ 正確：調用多個 Domain 函數進行編排
  const isValid = this.domainFacade.validateCard(input.cardId)
  const matchable = this.domainFacade.findMatchableCards(input)
  const progress = this.domainFacade.calculateProgress(input)

  // ❌ 錯誤：在 Use Case 中實作業務邏輯
  const isValid = input.cardId.length === 4 && ...
}
```

### Q2: Use Case 之間可以互相調用嗎？

**A**: **不建議**。Use Cases 應該是獨立的業務流程單元，由 Adapter Layer 調用。若需要共用邏輯，應該：
- 抽取到 Domain Layer（業務邏輯）
- 抽取到輔助函數（技術邏輯）

### Q3: 如何處理 Output Port 的異步錯誤？

**A**: 使用 Promise rejection 處理，並記錄日誌：

```typescript
this.sendCommand.playHandCard(cardId, target)
  .catch(error => {
    console.error('[PlayHandCardUseCase] Failed to send command:', error)
    // 可選：通知 UI（通過 TriggerUIEffectPort）
    this.triggerUIEffect.showErrorMessage('操作失敗，請重試')
  })
```

### Q4: 如何測試異步 Use Case？

**A**: 使用 `async/await` 或返回 Promise：

```typescript
it('應該成功發送命令', async () => {
  const mockSendCommand = createMockSendCommandPort()
  const useCase = new SomeUseCase(mockSendCommand)

  await useCase.execute(input)

  expect(mockSendCommand.someCommand).toHaveBeenCalled()
})
```

### Q5: Protocol 型別與 Domain 型別不一致怎麼辦？

**A**: 在 Application Layer 進行型別轉換：

```typescript
// Protocol 型別（SSE 事件）
const eventCards: string[] = event.field_cards

// 轉換為 Domain 型別
const domainCards: Card[] = eventCards.map(id => this.domainFacade.getCardById(id))
```

---

## 參考資源

### 專案文檔

- [Feature Specification](./spec.md) - 功能需求規格
- [Implementation Plan](./plan.md) - 實作計劃
- [Research](./research.md) - 技術決策研究
- [Data Model](./data-model.md) - 實體定義
- [Contracts](./contracts/) - Port 介面規範

### 外部文檔

- [Protocol Definition](../../doc/shared/protocol.md) - 通訊協議
- [Domain Layer](../../doc/frontend/user-interface/domain.md) - Domain Layer 文檔
- [Application Layer](../../doc/frontend/user-interface/application.md) - Application Layer 文檔

### 技術資源

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## 下一步

1. **閱讀 spec.md** - 了解功能需求和驗收標準
2. **閱讀 research.md** - 了解技術決策背景
3. **查看 data-model.md** - 了解所有實體定義
4. **參考測試範例** - 學習測試模式
5. **開始實作** - 按照 User Story 優先順序開發

**祝開發順利！**
