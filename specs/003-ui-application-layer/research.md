# Technical Research: User Interface BC - Application Layer

**Feature**: 003-ui-application-layer
**Date**: 2025-11-14
**Status**: Complete

## Research Summary

本文檔記錄 Application Layer 實作過程中的技術決策研究結果，涵蓋 Port 介面設計、Use Case 模式、Protocol 型別定義、錯誤處理策略和測試方法。

---

## 1. TypeScript Port 介面設計模式

### 研究問題
如何設計清晰、可維護的 Input/Output Ports，確保 Application Layer 與 Adapter Layer 的解耦？

### 決策：介面優先 + 依賴注入模式

**選擇的方案**:
```typescript
// Output Port（由 Application Layer 定義，Adapter Layer 實作）
export interface SendCommandPort {
  playHandCard(cardId: string, target?: string): Promise<void>
  selectTarget(source: string, target: string): Promise<void>
  makeDecision(decision: 'KOI_KOI' | 'END_ROUND'): Promise<void>
}

// Input Port（由 Application Layer 定義並實作為 Use Case）
export interface PlayHandCardPort {
  execute(input: PlayHandCardInput): PlayHandCardOutput
}

// Use Case 通過建構子注入依賴
export class PlayHandCardUseCase implements PlayHandCardPort {
  constructor(
    private readonly sendCommand: SendCommandPort,
    private readonly triggerUIEffect: TriggerUIEffectPort,
    private readonly domainFacade: DomainFacade // Domain Layer 函數集合
  ) {}

  execute(input: PlayHandCardInput): PlayHandCardOutput {
    // 業務流程編排
  }
}
```

**理由**:
1. **依賴反轉原則**: Application Layer 定義 Output Ports，Adapter Layer 實作，符合 Clean Architecture
2. **可測試性**: 建構子注入使得 Mock 依賴非常簡單（`new PlayHandCardUseCase(mockSendCommand, mockTriggerUIEffect, mockDomainFacade)`）
3. **型別安全**: TypeScript 介面提供編譯時檢查，防止介面不一致

**替代方案（已拒絕）**:
- **函數式方案**（將 Ports 作為參數傳入每次 execute 調用）: 拒絕理由是每次調用都需要傳遞依賴，增加呼叫複雜度
- **全域單例模式**: 拒絕理由是難以測試，違反依賴注入原則

### Domain Services 包裝策略

**決策**: 將 Domain Layer 的純函數包裝為介面

```typescript
// domain-facade.ts（Application Layer）
import {
  canMatch,
  findMatchableCards,
  validateCardExists,
  calculateYakuProgress
} from '@/user-interface/domain'

export interface DomainFacade {
  canMatch(card1: Card, card2: Card): boolean
  findMatchableCards(handCard: Card, fieldCards: Card[]): Card[]
  validateCardExists(card: Card, handCards: Card[]): boolean
  calculateYakuProgress(yakuType: YakuType, depositoryCards: Card[]): YakuProgress
}

// 實作（可用於生產環境）
export const domainFacade: DomainFacade = {
  canMatch,
  findMatchableCards,
  validateCardExists,
  calculateYakuProgress
}
```

**理由**: 將 Domain Layer 函數包裝為介面，使得測試時可以輕鬆 Mock（與 Output Ports 一致）

---

## 2. Use Case 類別設計模式

### 研究問題
Use Cases 應該採用類別還是純函數？如何組織依賴？

### 決策：類別 + 建構子注入

**選擇的方案**:
```typescript
export class HandleRoundDealtUseCase implements HandleRoundDealtPort {
  constructor(
    private readonly updateUIState: UpdateUIStatePort,
    private readonly triggerUIEffect: TriggerUIEffectPort
  ) {}

  execute(event: RoundDealtEvent): void {
    // 1. 觸發發牌動畫
    this.triggerUIEffect.triggerAnimation('DEAL_CARDS', {
      fieldCards: event.field,
      hands: event.hands
    })

    // 2. 更新場牌狀態
    this.updateUIState.updateFieldCards(event.field)

    // 3. 更新手牌狀態（假設 player-1 是當前玩家）
    const playerHand = event.hands.find(h => h.player_id === 'player-1')
    if (playerHand) {
      this.updateUIState.updateHandCards(playerHand.cards)
    }

    // 4. 更新牌堆剩餘數量
    this.updateUIState.updateDeckRemaining(event.deck_remaining)

    // 5. 更新 FlowStage
    this.updateUIState.setFlowStage(event.next_state.state_type)
  }
}
```

**理由**:
1. **清晰的依賴管理**: 建構子明確列出所有依賴，易於理解和維護
2. **單一職責**: 每個 Use Case 類別只負責一個特定流程
3. **可測試性**: 建構子注入使得測試時可以輕鬆替換依賴
4. **符合 OOP 原則**: 類別作為行為載體，符合物件導向設計

**替代方案（已拒絕）**:
- **純函數方案**（所有依賴作為參數）:
  ```typescript
  export function handleRoundDealt(
    event: RoundDealtEvent,
    updateUIState: UpdateUIStatePort,
    triggerUIEffect: TriggerUIEffectPort
  ): void { ... }
  ```
  拒絕理由：
  - 函數簽名過長（多依賴時難以閱讀）
  - 每次調用都需傳遞依賴，Adapter Layer 呼叫繁瑣
  - 不符合 Port 介面模式（Input Port 期望一個可實例化的對象）

### Use Case 命名慣例

**決策**:
- 玩家操作: `{Action}UseCase`（如 `PlayHandCardUseCase`）
- 事件處理: `Handle{Event}UseCase`（如 `HandleGameStartedUseCase`）

**理由**: 清晰表達 Use Case 的職責類型

---

## 3. Protocol 型別定義策略

### 研究問題
如何從 protocol.md 的事件定義轉換為 TypeScript 介面？如何確保與後端契約一致？

### 決策：嚴格型別映射 + 文檔同步檢查

**選擇的方案**:
```typescript
// types/events.ts

/**
 * GameStarted 事件
 *
 * 參考: doc/shared/protocol.md#GameStarted
 *
 * 觸發時機: 遊戲初始化完成
 */
export interface GameStartedEvent {
  readonly event_type: 'GameStarted'
  readonly event_id: string
  readonly timestamp: string
  readonly game_id: string
  readonly players: ReadonlyArray<{
    readonly player_id: string
    readonly player_name: string
    readonly is_ai: boolean
  }>
  readonly ruleset: Ruleset
  readonly starting_player_id: string
}

// 共用資料結構
export interface Ruleset {
  readonly target_score: number
  readonly yaku_settings: ReadonlyArray<{
    readonly yaku_type: string
    readonly base_points: number
    readonly enabled: boolean
  }>
  readonly special_rules: {
    readonly teshi_enabled: boolean
    readonly field_kuttsuki_enabled: boolean
  }
}
```

**理由**:
1. **readonly 修飾符**: 確保事件數據不可變，符合事件溯源原則
2. **JSDoc 註解**: 標註 protocol.md 參考位置，便於維護時同步檢查
3. **明確的 event_type 字面量**: 利用 TypeScript 的 discriminated unions 進行型別窄化
4. **ReadonlyArray**: 確保陣列元素不可變

### FlowState 定義策略

**決策**: 使用字面量聯合型別 + 常數枚舉

```typescript
// types/flow-state.ts

/**
 * 遊戲流程狀態
 *
 * 參考: doc/shared/protocol.md#FlowState
 */
export type FlowState =
  | 'AWAITING_HAND_PLAY'
  | 'AWAITING_SELECTION'
  | 'AWAITING_DECISION'

// 常數枚舉（用於程式碼可讀性）
export const FlowState = {
  AWAITING_HAND_PLAY: 'AWAITING_HAND_PLAY' as const,
  AWAITING_SELECTION: 'AWAITING_SELECTION' as const,
  AWAITING_DECISION: 'AWAITING_DECISION' as const
} as const

// 使用範例:
// const state: FlowState = FlowState.AWAITING_HAND_PLAY
```

**理由**:
- 型別與常數並存，提供編譯時檢查和執行時可讀性
- 避免使用 TypeScript enum（執行時產生額外程式碼）

**替代方案（已拒絕）**:
- **TypeScript enum**: 拒絕理由是產生額外的 JavaScript 程式碼，增加 bundle size
- **純字面量型別**（無常數）: 拒絕理由是程式碼中需要硬編碼字串，可讀性差

---

## 4. 錯誤處理模式

### 研究問題
Application Layer 應該使用 Result 型別模式還是直接拋出例外？

### 決策：同步操作返回 Result 型別，異步操作拋出例外

**選擇的方案**:

```typescript
// 同步操作：返回 Result 型別（用於即時驗證）
export type Result<T, E = string> =
  | { success: true; value: T }
  | { success: false; error: E }

export class PlayHandCardUseCase implements PlayHandCardPort {
  execute(input: PlayHandCardInput): Result<PlayHandCardOutput> {
    // 預驗證（同步）
    const cardExists = this.domainFacade.validateCardExists(
      input.cardId,
      input.handCards
    )

    if (!cardExists) {
      return {
        success: false,
        error: 'CARD_NOT_IN_HAND'
      }
    }

    // 業務邏輯
    const matchable = this.domainFacade.findMatchableCards(...)

    if (matchable.length > 1) {
      // 觸發選擇 UI（異步，但不等待）
      this.triggerUIEffect.showSelectionUI(matchable)
      return {
        success: true,
        value: {
          needSelection: true,
          possibleTargets: matchable
        }
      }
    }

    // 發送命令（異步，可能拋出例外）
    this.sendCommand.playHandCard(input.cardId, matchable[0])
      .catch(error => {
        // 錯誤由 Adapter Layer 處理（顯示 toast 等）
        console.error('Failed to send command:', error)
      })

    return {
      success: true,
      value: {
        needSelection: false,
        selectedTarget: matchable[0] || null
      }
    }
  }
}

// 事件處理：無返回值（錯誤僅記錄日誌）
export class HandleTurnErrorUseCase implements HandleTurnErrorPort {
  execute(event: TurnErrorEvent): void {
    // 解析錯誤訊息
    const friendlyMessage = this.getFriendlyErrorMessage(event.error_code)

    // 顯示錯誤提示
    this.triggerUIEffect.showErrorMessage(friendlyMessage)

    // 記錄日誌（生產環境可整合 Sentry 等）
    console.error('[TurnError]', {
      code: event.error_code,
      message: event.error_message,
      retryAllowed: event.retry_allowed
    })
  }
}
```

**理由**:
1. **同步驗證使用 Result 型別**: 避免 try-catch 巢狀，明確表達成功/失敗兩條路徑
2. **異步操作不返回 Result**: 因為 Output Ports 已經是 Promise，錯誤自然通過 Promise rejection 處理
3. **事件處理無返回值**: 事件處理器的職責是觸發副作用（更新 UI、記錄日誌），不需要返回值

**替代方案（已拒絕）**:
- **統一使用例外**: 拒絕理由是同步驗證使用例外會導致 try-catch 過多，降低可讀性
- **統一使用 Result 型別**: 拒絕理由是異步操作已有 Promise rejection 機制，再包一層 Result 過於繁瑣

### 錯誤碼設計

**決策**: 使用字面量聯合型別 + 友善訊息映射

```typescript
// types/errors.ts
export type ErrorCode =
  | 'INVALID_CARD'
  | 'INVALID_TARGET'
  | 'WRONG_PLAYER'
  | 'INVALID_STATE'
  | 'INVALID_SELECTION'
  | 'CARD_NOT_IN_HAND'  // 客戶端預驗證錯誤

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_CARD: '該卡片不在您的手牌中',
  INVALID_TARGET: '無效的配對目標',
  WRONG_PLAYER: '還沒輪到您的回合',
  INVALID_STATE: '當前無法執行此操作',
  INVALID_SELECTION: '選擇的配對目標不合法',
  CARD_NOT_IN_HAND: '該卡片不在您的手牌中'
}
```

---

## 5. Vitest Mock 策略

### 研究問題
如何有效地 Mock Domain Layer 和 Output Ports？如何確保測試隔離性？

### 決策：工廠函數 + Vitest Mock Utilities

**選擇的方案**:

```typescript
// __tests__/user-interface/application/test-helpers/mock-factories.ts

import { vi } from 'vitest'
import type { SendCommandPort, UpdateUIStatePort, TriggerUIEffectPort, DomainFacade } from '@/user-interface/application'

/**
 * 建立 Mock SendCommandPort
 */
export function createMockSendCommandPort(): SendCommandPort {
  return {
    playHandCard: vi.fn().mockResolvedValue(undefined),
    selectTarget: vi.fn().mockResolvedValue(undefined),
    makeDecision: vi.fn().mockResolvedValue(undefined)
  }
}

/**
 * 建立 Mock UpdateUIStatePort
 */
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

/**
 * 建立 Mock TriggerUIEffectPort
 */
export function createMockTriggerUIEffectPort(): TriggerUIEffectPort {
  return {
    showSelectionUI: vi.fn(),
    showDecisionModal: vi.fn(),
    showErrorMessage: vi.fn(),
    showReconnectionMessage: vi.fn(),
    triggerAnimation: vi.fn()
  }
}

/**
 * 建立 Mock DomainFacade
 */
export function createMockDomainFacade(overrides?: Partial<DomainFacade>): DomainFacade {
  return {
    canMatch: vi.fn().mockReturnValue(true),
    findMatchableCards: vi.fn().mockReturnValue([]),
    validateCardExists: vi.fn().mockReturnValue(true),
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

**測試範例**:

```typescript
// __tests__/user-interface/application/use-cases/player-operations/PlayHandCardUseCase.test.ts

import { describe, it, expect } from 'vitest'
import { PlayHandCardUseCase } from '@/user-interface/application'
import {
  createMockSendCommandPort,
  createMockTriggerUIEffectPort,
  createMockDomainFacade
} from '../../test-helpers/mock-factories'

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

**理由**:
1. **工廠函數**: 減少測試程式碼重複，統一 Mock 創建邏輯
2. **Vitest Mock Utilities**: 使用 `vi.fn()` 提供的 spy 功能，驗證方法調用
3. **型別安全**: Mock 工廠函數返回正確的介面型別，編譯時檢查
4. **測試隔離**: 每個測試創建獨立的 Mock 實例，避免測試間干擾

**替代方案（已拒絕）**:
- **手動創建 Mock 對象**: 拒絕理由是每個測試都需重複程式碼，難以維護
- **使用第三方 Mock 函式庫**（如 ts-mockito）: 拒絕理由是 Vitest 內建 Mock 功能已足夠，引入額外依賴增加複雜度

---

## 6. 補充決策：動畫參數設計

### 研究問題
TriggerUIEffectPort 的 triggerAnimation 方法應該如何定義 AnimationParams？

### 決策：抽象動畫型別 + 泛型參數

```typescript
// ports/output/trigger-ui-effect.port.ts

export type AnimationType =
  | 'DEAL_CARDS'
  | 'CARD_MOVE'
  | 'YAKU_EFFECT'
  | 'SCORE_UPDATE'

export type AnimationParams<T extends AnimationType = AnimationType> =
  T extends 'DEAL_CARDS' ? {
    fieldCards: string[]
    hands: Array<{ player_id: string; cards: string[] }>
  } :
  T extends 'CARD_MOVE' ? {
    cardId: string
    from: 'hand' | 'field' | 'deck'
    to: 'field' | 'depository'
  } :
  T extends 'YAKU_EFFECT' ? {
    yakuType: string
    affectedCards: string[]
  } :
  T extends 'SCORE_UPDATE' ? {
    playerId: string
    oldScore: number
    newScore: number
  } :
  never

export interface TriggerUIEffectPort {
  triggerAnimation<T extends AnimationType>(
    type: T,
    params: AnimationParams<T>
  ): void
  // ... 其他方法
}
```

**理由**:
- Application Layer 定義抽象的動畫類型，不關心具體實作（CSS、Canvas、WebGL）
- Adapter Layer 根據動畫類型實作具體邏輯
- 型別安全：泛型確保 params 與 type 匹配

---

## 研究結論

所有技術決策均已明確，無待解決問題（NEEDS CLARIFICATION）。主要決策摘要：

| 領域 | 決策 | 理由 |
|------|------|------|
| Port 設計 | 介面 + 建構子注入 | 依賴反轉、可測試性 |
| Use Case 設計 | 類別模式 | 清晰的依賴管理、符合 OOP |
| Protocol 型別 | 嚴格型別映射 + readonly | 型別安全、不可變性 |
| 錯誤處理 | 同步 Result、異步 Exception | 平衡可讀性與實用性 |
| 測試策略 | 工廠函數 + Vitest Mock | 減少重複、型別安全 |

**下一步**: 進入 Phase 1，生成 data-model.md 和 contracts/
