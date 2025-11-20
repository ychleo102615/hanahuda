/**
 * DependencyRegistry - 依賴註冊函數
 *
 * @description
 * 統一管理所有依賴的註冊邏輯，根據遊戲模式註冊對應的 Adapters。
 *
 * 註冊順序:
 * 1. Stores (GameStateStore, UIStateStore)
 * 2. Output Ports (UIStatePort, TriggerUIEffectPort, SendCommandPort)
 * 3. Use Cases as Input Ports (18 個)
 * 4. Mode-specific Adapters (Backend / Mock / Local)
 * 5. Animation System
 * 6. SSE Client & Event Router (僅 Backend 模式)
 *
 * @example
 * ```typescript
 * import { container } from './container'
 * import { registerDependencies } from './registry'
 *
 * registerDependencies(container, 'backend')
 * ```
 */

import type { DIContainer } from './container'
import { TOKENS } from './tokens'
import { useGameStateStore, createUIStatePortAdapter } from '../stores/gameState'
import { useUIStateStore, createTriggerUIEffectPortAdapter } from '../stores/uiState'
import { HandleTurnCompletedUseCase } from '../../application/use-cases/event-handlers/HandleTurnCompletedUseCase'
import { HandleSelectionRequiredUseCase } from '../../application/use-cases/event-handlers/HandleSelectionRequiredUseCase'
import { HandleTurnProgressAfterSelectionUseCase } from '../../application/use-cases/event-handlers/HandleTurnProgressAfterSelectionUseCase'
import type { UIStatePort, TriggerUIEffectPort } from '../../application/ports/output'
import type { DomainFacade } from '../../application/types/domain-facade'
import * as domain from '../../domain'
import { MockApiClient } from '../mock/MockApiClient'
import { MockEventEmitter } from '../mock/MockEventEmitter'
import { EventRouter } from '../sse/EventRouter'

/**
 * 遊戲模式
 */
export type GameMode = 'backend' | 'local' | 'mock'

/**
 * 註冊所有依賴
 *
 * @param container - DI Container 實例
 * @param mode - 遊戲模式 (backend / local / mock)
 */
export function registerDependencies(container: DIContainer, mode: GameMode): void {
  // 1. 註冊 Stores
  registerStores(container)

  // 2. 註冊 Output Ports
  registerOutputPorts(container)

  // 3. 註冊 Use Cases (作為 Input Ports)
  registerInputPorts(container)

  // 4. 根據模式註冊 Adapters
  if (mode === 'backend') {
    registerBackendAdapters(container)
    registerSSEClient(container)
  } else if (mode === 'mock') {
    registerMockAdapters(container)
  } else if (mode === 'local') {
    registerLocalAdapters(container)
  }

  // 5. 註冊動畫系統
  registerAnimationSystem(container)
}

/**
 * 註冊 Pinia Stores
 *
 * @description
 * 註冊 GameStateStore 與 UIStateStore 為單例。
 * 這兩個 Store 在整個應用程式生命週期中只有一個實例。
 */
function registerStores(container: DIContainer): void {
  // 註冊 Stores 為單例
  container.register(
    TOKENS.GameStateStore,
    () => useGameStateStore(),
    { singleton: true },
  )

  container.register(
    TOKENS.UIStateStore,
    () => useUIStateStore(),
    { singleton: true },
  )
}

/**
 * 註冊 Output Ports
 *
 * @description
 * 將 Stores 與 AnimationService 適配為 Output Ports 介面。
 */
function registerOutputPorts(container: DIContainer): void {
  // UIStatePort: 由 GameStateStore 實作
  container.register(
    TOKENS.UIStatePort,
    () => createUIStatePortAdapter(),
    { singleton: true },
  )

  // TriggerUIEffectPort: 由 UIStateStore + AnimationService 組合實作
  // 注意: AnimationService 需要先註冊 (在 registerAnimationSystem 中)
  // Phase 2 使用 stub AnimationService，Phase 3+ 將替換為真實實作
  container.register(
    TOKENS.TriggerUIEffectPort,
    () => {

      const animationService = container.resolve(TOKENS.AnimationService) as {
        trigger: (type: unknown, params: unknown) => void
      }
      return createTriggerUIEffectPortAdapter(animationService)
    },
    { singleton: true },
  )

  // DomainFacade: 包裝 Domain Layer 函數
  container.register(
    TOKENS.DomainFacade,
    (): DomainFacade => ({
      canMatch: domain.canMatch,
      findMatchableCards: domain.findMatchableCards,
      validateCardExists: domain.validateCardExists,
      validateTargetInList: domain.validateTargetInList,
      calculateYakuProgress: domain.calculateYakuProgress,
    }),
    { singleton: true },
  )

  // SendCommandPort: 根據模式由不同的 Adapter 實作
  // 在 registerBackendAdapters / registerMockAdapters 中註冊
}

/**
 * 註冊 Input Ports (Use Cases)
 *
 * @description
 * 註冊所有 Use Cases 為 Input Ports 的實作。
 * 包含 3 個玩家操作 Use Cases 與 15 個事件處理 Use Cases。
 */
function registerInputPorts(container: DIContainer): void {
  // 取得 Output Ports
  const uiStatePort = container.resolve(TOKENS.UIStatePort) as UIStatePort
  const triggerUIEffectPort = container.resolve(TOKENS.TriggerUIEffectPort) as TriggerUIEffectPort

  // T050 [US2]: 註冊 TurnCompleted 事件處理器
  container.register(
    TOKENS.HandleTurnCompletedPort,
    () => new HandleTurnCompletedUseCase(uiStatePort, triggerUIEffectPort),
    { singleton: true }
  )

  // T051 [US2]: 註冊 SelectionRequired 事件處理器
  container.register(
    TOKENS.HandleSelectionRequiredPort,
    () => new HandleSelectionRequiredUseCase(uiStatePort, triggerUIEffectPort),
    { singleton: true }
  )

  // T052 [US2]: 註冊 TurnProgressAfterSelection 事件處理器
  const domainFacade = container.resolve(TOKENS.DomainFacade) as DomainFacade

  container.register(
    TOKENS.HandleTurnProgressAfterSelectionPort,
    () => new HandleTurnProgressAfterSelectionUseCase(
      uiStatePort,
      triggerUIEffectPort,
      domainFacade
    ),
    { singleton: true }
  )

  console.info('[DI] Phase 4: Registered US2 event handlers (TurnCompleted, SelectionRequired, TurnProgressAfterSelection)')
}

/**
 * 註冊 Backend 模式的 Adapters
 *
 * @description
 * 註冊 GameApiClient 作為 SendCommandPort 的實作。
 *
 * TODO: Phase 3+ - 等待 GameApiClient 實作後啟用
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function registerBackendAdapters(_container: DIContainer): void {
  // Phase 2 暫時跳過 Backend Adapters 註冊
  console.info('[DI] Phase 2: Skipping Backend Adapters registration (will be enabled in Phase 3+)')
}

/**
 * 註冊 SSE 客戶端與事件路由
 *
 * @description
 * 註冊 EventRouter 與 GameEventClient，並綁定所有 SSE 事件處理器。
 *
 * TODO: Phase 3+ - 等待 SSE Client 實作後啟用
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function registerSSEClient(_container: DIContainer): void {
  // Phase 2 暫時跳過 SSE Client 註冊
  console.info('[DI] Phase 2: Skipping SSE Client registration (will be enabled in Phase 3+)')
}

/**
 * 註冊 Mock 模式的 Adapters
 *
 * @description
 * 註冊 MockApiClient 與 MockEventEmitter，用於開發測試。
 */
function registerMockAdapters(container: DIContainer): void {
  console.info('[DI] 註冊 Mock 模式 Adapters')

  // SendCommandPort: MockApiClient
  container.register(
    TOKENS.SendCommandPort,
    () => new MockApiClient(),
    { singleton: true },
  )

  // EventRouter (共用)
  container.register(
    TOKENS.EventRouter,
    () => new EventRouter(),
    { singleton: true },
  )

  // T053 [US2]: 註冊事件路由
  registerEventRoutes(container)

  // MockEventEmitter
  container.register(
    TOKENS.MockEventEmitter,
    () => {
      const router = container.resolve(TOKENS.EventRouter) as EventRouter
      return new MockEventEmitter(router)
    },
    { singleton: true },
  )
}

/**
 * 註冊事件路由
 *
 * @description
 * 將 SSE 事件類型綁定到對應的 Input Ports。
 */
function registerEventRoutes(container: DIContainer): void {
  const router = container.resolve(TOKENS.EventRouter) as {
    register: (eventType: string, port: { execute: (payload: unknown) => void }) => void
  }

  // T053 [US2]: 綁定 TurnCompleted、SelectionRequired、TurnProgressAfterSelection 事件
  const turnCompletedPort = container.resolve(TOKENS.HandleTurnCompletedPort) as { execute: (payload: unknown) => void }
  const selectionRequiredPort = container.resolve(TOKENS.HandleSelectionRequiredPort) as { execute: (payload: unknown) => void }
  const turnProgressPort = container.resolve(TOKENS.HandleTurnProgressAfterSelectionPort) as { execute: (payload: unknown) => void }

  router.register('TurnCompleted', turnCompletedPort)
  router.register('SelectionRequired', selectionRequiredPort)
  router.register('TurnProgressAfterSelection', turnProgressPort)

  console.info('[DI] Phase 4: Registered US2 event routes (TurnCompleted, SelectionRequired, TurnProgressAfterSelection)')
}

/**
 * 註冊 Local 模式的 Adapters
 *
 * @description
 * 架構預留：等待 Local Game BC 完成後實作。
 * 目前暫時使用 Mock 模式替代。
 *
 * TODO: Post-MVP - Local Game BC 實作後啟用
 */
function registerLocalAdapters(container: DIContainer): void {
  console.warn('[DI] Local mode not implemented, using Mock mode fallback (Post-MVP)')
  registerMockAdapters(container)
}

/**
 * 註冊動畫系統
 *
 * @description
 * 註冊 AnimationQueue 與 AnimationService。
 *
 * TODO: Phase 3+ - 等待 Animation System 實作後啟用
 */
function registerAnimationSystem(container: DIContainer): void {
  // Phase 2 暫時跳過 Animation System 註冊
  // 暫時提供一個 Mock AnimationService 避免 TriggerUIEffectPort 註冊失敗
  container.register(
    TOKENS.AnimationService,
    () => ({
      trigger: (type: unknown, params: unknown) => {
        console.warn('[AnimationService] Phase 2 stub: Animation not yet implemented', {
          type,
          params,
        })
      },
    }),
    { singleton: true },
  )
  console.info('[DI] Phase 2: Using stub AnimationService (full implementation in Phase 3+)')
}
