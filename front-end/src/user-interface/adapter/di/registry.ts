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
import { HandleDecisionRequiredUseCase } from '../../application/use-cases/event-handlers/HandleDecisionRequiredUseCase'
import { HandleDecisionMadeUseCase } from '../../application/use-cases/event-handlers/HandleDecisionMadeUseCase'
import { PlayHandCardUseCase } from '../../application/use-cases/player-operations/PlayHandCardUseCase'
import { SelectMatchTargetUseCase } from '../../application/use-cases/player-operations/SelectMatchTargetUseCase'
import { MakeKoiKoiDecisionUseCase } from '../../application/use-cases/player-operations/MakeKoiKoiDecisionUseCase'
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

  // 2. 註冊動畫系統 (必須在 Output Ports 之前)
  registerAnimationSystem(container)

  // 3. 註冊 Output Ports
  registerOutputPorts(container)

  // 4. 根據模式註冊 Adapters (必須在 Input Ports 之前，提供 SendCommandPort)
  if (mode === 'backend') {
    registerBackendAdapters(container)
  } else if (mode === 'mock') {
    registerMockAdapters(container)
  } else if (mode === 'local') {
    registerLocalAdapters(container)
  }

  // 5. 註冊 Use Cases (作為 Input Ports)
  registerInputPorts(container)

  // 6. 註冊事件路由 (必須在 Input Ports 之後)
  registerEventRoutes(container)

  // 7. 根據模式初始化事件發射器 (必須在事件路由之後)
  if (mode === 'backend') {
    registerSSEClient(container)
  } else if (mode === 'mock') {
    initializeMockEventEmitter(container)
  }
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
  const domainFacade = container.resolve(TOKENS.DomainFacade) as DomainFacade

  // Player Operations Use Cases
  const sendCommandPort = container.resolve(TOKENS.SendCommandPort) as any

  // 註冊 PlayHandCardPort
  container.register(
    TOKENS.PlayHandCardPort,
    () => new PlayHandCardUseCase(sendCommandPort, triggerUIEffectPort, domainFacade),
    { singleton: true }
  )

  // 註冊 SelectMatchTargetPort
  container.register(
    TOKENS.SelectMatchTargetPort,
    () => new SelectMatchTargetUseCase(sendCommandPort, domainFacade),
    { singleton: true }
  )

  // 註冊 MakeKoiKoiDecisionPort (T068-T070)
  container.register(
    TOKENS.MakeKoiKoiDecisionPort,
    () => new MakeKoiKoiDecisionUseCase(sendCommandPort, triggerUIEffectPort, domainFacade),
    { singleton: true }
  )

  // Event Handlers

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
  container.register(
    TOKENS.HandleTurnProgressAfterSelectionPort,
    () => new HandleTurnProgressAfterSelectionUseCase(
      uiStatePort,
      triggerUIEffectPort,
      domainFacade
    ),
    { singleton: true }
  )

  // T068 [US3]: 註冊 DecisionRequired 事件處理器
  container.register(
    TOKENS.HandleDecisionRequiredPort,
    () => new HandleDecisionRequiredUseCase(uiStatePort, triggerUIEffectPort, domainFacade),
    { singleton: true }
  )

  // T069 [US3]: 註冊 DecisionMade 事件處理器
  container.register(
    TOKENS.HandleDecisionMadePort,
    () => new HandleDecisionMadeUseCase(uiStatePort, triggerUIEffectPort),
    { singleton: true }
  )

  console.info('[DI] Registered Player Operations, US2, and US3 event handlers')
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
 * 註冊 MockApiClient 與 EventRouter，用於開發測試。
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
}

/**
 * 初始化 Mock 事件發射器
 *
 * @description
 * 註冊 MockEventEmitter，必須在事件路由註冊後呼叫。
 */
function initializeMockEventEmitter(container: DIContainer): void {
  console.info('[DI] 初始化 Mock 事件發射器')

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

  // T070-T071 [US3]: 綁定 DecisionRequired、DecisionMade 事件
  const decisionRequiredPort = container.resolve(TOKENS.HandleDecisionRequiredPort) as { execute: (payload: unknown) => void }
  const decisionMadePort = container.resolve(TOKENS.HandleDecisionMadePort) as { execute: (payload: unknown) => void }

  router.register('DecisionRequired', decisionRequiredPort)
  router.register('DecisionMade', decisionMadePort)

  console.info('[DI] Phase 5: Registered US2 and US3 event routes')
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
