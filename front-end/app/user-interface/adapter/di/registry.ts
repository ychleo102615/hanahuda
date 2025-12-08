/**
 * DependencyRegistry - 依賴註冊函數
 *
 * @description
 * 統一管理所有依賴的註冊邏輯，根據遊戲模式註冊對應的 Adapters。
 *
 * 註冊順序:
 * 1. Stores (GameStateStore, UIStateStore, AnimationLayerStore, ZoneRegistry)
 * 2. Output Ports (GameStatePort, AnimationPort, NotificationPort, UIStatePort, TriggerUIEffectPort)
 * 3. Mode-specific Adapters (Backend / Mock / Local) - 提供 SendCommandPort
 * 4. Use Cases as Input Ports (18 個)
 * 5. Event Router (事件路由)
 * 6. SSE Client & Event Emitter (根據模式初始化)
 *
 * @example
 * ```typescript
 * import { container } from './container'
 * import { registerDependencies } from './registry'
 *
 * registerDependencies(container, 'backend')
 * ```
 */

import type { Pinia } from 'pinia'
import type { DIContainer } from './container'
import { TOKENS } from './tokens'
import { useGameStateStore, createUIStatePortAdapter } from '../stores/gameState'
import { useUIStateStore } from '../stores/uiState'
import { useAnimationLayerStore } from '../stores/animationLayerStore'
import { useMatchmakingStateStore } from '../stores/matchmakingState'
import { HandleGameStartedUseCase } from '../../application/use-cases/event-handlers/HandleGameStartedUseCase'
import { HandleRoundDealtUseCase } from '../../application/use-cases/event-handlers/HandleRoundDealtUseCase'
import { HandleTurnCompletedUseCase } from '../../application/use-cases/event-handlers/HandleTurnCompletedUseCase'
import { HandleSelectionRequiredUseCase } from '../../application/use-cases/event-handlers/HandleSelectionRequiredUseCase'
import { HandleTurnProgressAfterSelectionUseCase } from '../../application/use-cases/event-handlers/HandleTurnProgressAfterSelectionUseCase'
import { HandleDecisionRequiredUseCase } from '../../application/use-cases/event-handlers/HandleDecisionRequiredUseCase'
import { HandleDecisionMadeUseCase } from '../../application/use-cases/event-handlers/HandleDecisionMadeUseCase'
import { HandleRoundScoredUseCase } from '../../application/use-cases/event-handlers/HandleRoundScoredUseCase'
import { HandleRoundEndedInstantlyUseCase } from '../../application/use-cases/event-handlers/HandleRoundEndedInstantlyUseCase'
import { HandleRoundDrawnUseCase } from '../../application/use-cases/event-handlers/HandleRoundDrawnUseCase'
import { HandleGameFinishedUseCase } from '../../application/use-cases/event-handlers/HandleGameFinishedUseCase'
import { HandleTurnErrorUseCase } from '../../application/use-cases/event-handlers/HandleTurnErrorUseCase'
import { HandleReconnectionUseCase } from '../../application/use-cases/event-handlers/HandleReconnectionUseCase'
import { HandleGameErrorUseCase } from '../../application/use-cases/event-handlers/HandleGameErrorUseCase'
import { StartGameUseCase } from '../../application/use-cases/StartGameUseCase'
import { PlayHandCardUseCase } from '../../application/use-cases/player-operations/PlayHandCardUseCase'
import { SelectMatchTargetUseCase } from '../../application/use-cases/player-operations/SelectMatchTargetUseCase'
import { MakeKoiKoiDecisionUseCase } from '../../application/use-cases/player-operations/MakeKoiKoiDecisionUseCase'
import type { UIStatePort, GameStatePort, AnimationPort, NotificationPort, MatchmakingStatePort, NavigationPort } from '../../application/ports/output'
import type { DomainFacade } from '../../application/types/domain-facade'
import * as domain from '../../domain'
import { MockApiClient } from '../mock/MockApiClient'
import { MockEventEmitter } from '../mock/MockEventEmitter'
import { EventRouter } from '../sse/EventRouter'
import { GameApiClient } from '../api/GameApiClient'
import { GameEventClient } from '../sse/GameEventClient'
import { AnimationPortAdapter } from '../animation/AnimationPortAdapter'
import { zoneRegistry } from '../animation/ZoneRegistry'
import { createNotificationPortAdapter } from '../notification/NotificationPortAdapter'
import { createGameStatePortAdapter } from '../stores/GameStatePortAdapter'
import { createNavigationPortAdapter } from '../router/NavigationPortAdapter'
import { CountdownManager } from '../services/CountdownManager'

/**
 * 遊戲模式
 */
export type GameMode = 'backend' | 'local' | 'mock'

/**
 * 註冊所有依賴
 *
 * @param container - DI Container 實例
 * @param mode - 遊戲模式 (backend / local / mock)
 * @param pinia - Pinia 實例，明確傳遞以避免初始化順序問題
 */
export function registerDependencies(container: DIContainer, mode: GameMode, pinia: Pinia): void {
  // 1. 註冊 Stores（明確傳遞 pinia 實例）
  registerStores(container, pinia)

  // 2. 註冊 Output Ports
  registerOutputPorts(container)

  // 3. 根據模式註冊 Adapters (必須在 Input Ports 之前，提供 SendCommandPort)
  if (mode === 'backend') {
    registerBackendAdapters(container)
  } else if (mode === 'mock') {
    registerMockAdapters(container)
  } else if (mode === 'local') {
    registerLocalAdapters(container)
  }

  // 4. 註冊 Use Cases (作為 Input Ports)
  registerInputPorts(container)

  // 5. 註冊事件路由 (必須在 Input Ports 之後)
  registerEventRoutes(container)

  // 6. 根據模式初始化事件發射器 (必須在事件路由之後)
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
 *
 * @param container - DI Container 實例
 * @param pinia - Pinia 實例，明確傳遞以確保 store 正確初始化
 *
 * @note Nuxt 4: 僅在 client-side 註冊 Pinia stores
 */
function registerStores(container: DIContainer, pinia: Pinia): void {
  // Nuxt 4: 確保僅在 client-side 註冊 Pinia stores
  if (import.meta.server) {
    console.warn('[DI] Skipping Pinia stores registration on server-side')
    return
  }

  // 註冊 Stores 為單例（明確傳遞 pinia 實例）
  container.register(
    TOKENS.GameStateStore,
    () => useGameStateStore(pinia),
    { singleton: true },
  )

  container.register(
    TOKENS.UIStateStore,
    () => useUIStateStore(pinia),
    { singleton: true },
  )

  container.register(
    TOKENS.AnimationLayerStore,
    () => useAnimationLayerStore(pinia),
    { singleton: true },
  )

  container.register(
    TOKENS.ZoneRegistry,
    () => zoneRegistry,
    { singleton: true },
  )

  container.register(
    TOKENS.MatchmakingStateStore,
    () => useMatchmakingStateStore(pinia),
    { singleton: true },
  )

  // 註冊 CountdownManager 為單例
  container.register(
    TOKENS.CountdownManager,
    () => {
      const uiState = container.resolve(TOKENS.UIStateStore) as ReturnType<typeof useUIStateStore>
      return new CountdownManager(uiState)
    },
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

  // ===== New Output Ports (Phase 4+) =====

  // GameStatePort: 由 GameStateStore 實作
  container.register(
    TOKENS.GameStatePort,
    () => createGameStatePortAdapter(),
    { singleton: true },
  )

  // AnimationPort: 由 AnimationPortAdapter 實作
  // 從 container resolve 依賴，統一由 DI 管理
  container.register(
    TOKENS.AnimationPort,
    () => {
      const registry = container.resolve(TOKENS.ZoneRegistry) as typeof zoneRegistry
      const animationLayerStore = container.resolve(TOKENS.AnimationLayerStore) as ReturnType<typeof useAnimationLayerStore>
      return new AnimationPortAdapter(registry, animationLayerStore)
    },
    { singleton: true },
  )

  // NotificationPort: 由 NotificationPortAdapter 實作（注入 CountdownManager）
  container.register(
    TOKENS.NotificationPort,
    () => {
      const countdown = container.resolve(TOKENS.CountdownManager) as CountdownManager
      return createNotificationPortAdapter(countdown)
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
      getCardTypeFromId: domain.getCardTypeFromId,
    }),
    { singleton: true },
  )

  // MatchmakingStatePort: 由 MatchmakingStateStore 實作
  container.register(
    TOKENS.MatchmakingStatePort,
    () => {
      const store = container.resolve(TOKENS.MatchmakingStateStore) as ReturnType<typeof useMatchmakingStateStore>
      return store as MatchmakingStatePort
    },
    { singleton: true },
  )

  // NavigationPort: 由 NavigationPortAdapter 實作
  container.register(
    TOKENS.NavigationPort,
    () => createNavigationPortAdapter(),
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
 * 包含 3 個玩家操作 Use Cases 與 16 個事件處理 Use Cases。
 */
function registerInputPorts(container: DIContainer): void {
  // 取得 Output Ports (Legacy)
  const uiStatePort = container.resolve(TOKENS.UIStatePort) as UIStatePort
  const domainFacade = container.resolve(TOKENS.DomainFacade) as DomainFacade

  // 取得 Output Ports (New - Phase 4+)
  const gameStatePort = container.resolve(TOKENS.GameStatePort) as GameStatePort
  const animationPort = container.resolve(TOKENS.AnimationPort) as AnimationPort
  const notificationPort = container.resolve(TOKENS.NotificationPort) as NotificationPort
  const matchmakingStatePort = container.resolve(TOKENS.MatchmakingStatePort) as MatchmakingStatePort
  const navigationPort = container.resolve(TOKENS.NavigationPort) as NavigationPort

  // Game Initialization Use Cases
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendCommandPort = container.resolve(TOKENS.SendCommandPort) as any

  // 註冊 StartGamePort
  container.register(
    TOKENS.StartGamePort,
    () => new StartGameUseCase(sendCommandPort, matchmakingStatePort),
    { singleton: true }
  )

  // Player Operations Use Cases

  // 註冊 PlayHandCardPort
  // Phase 7: 加入 animationPort 用於檢查動畫狀態
  container.register(
    TOKENS.PlayHandCardPort,
    () => new PlayHandCardUseCase(sendCommandPort, notificationPort, domainFacade, animationPort),
    { singleton: true }
  )

  // 註冊 SelectMatchTargetPort
  // Phase 7: 加入 animationPort 用於檢查動畫狀態
  container.register(
    TOKENS.SelectMatchTargetPort,
    () => new SelectMatchTargetUseCase(sendCommandPort, domainFacade, animationPort),
    { singleton: true }
  )

  // 註冊 MakeKoiKoiDecisionPort (T068-T070)
  // Phase 7: 加入 animationPort 用於檢查動畫狀態
  // Pattern B: 加入 notification 用於停止倒數計時（Use Case 控制業務邏輯）
  container.register(
    TOKENS.MakeKoiKoiDecisionPort,
    () => {
      const notification = container.resolve<NotificationPort>(TOKENS.NotificationPort)
      return new MakeKoiKoiDecisionUseCase(sendCommandPort, domainFacade, animationPort, notification)
    },
    { singleton: true }
  )

  // Event Handlers

  // T030 [US1]: 註冊 GameStarted 事件處理器
  container.register(
    TOKENS.HandleGameStartedPort,
    () => new HandleGameStartedUseCase(uiStatePort, gameStatePort, matchmakingStatePort, navigationPort),
    { singleton: true }
  )

  // T030 [US1]: 註冊 RoundDealt 事件處理器
  // Phase 8: 使用 GameStatePort + AnimationPort（發牌動畫整合）
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  container.register(
    TOKENS.HandleRoundDealtPort,
    () => new HandleRoundDealtUseCase(gameStatePort, animationPort, notificationPort),
    { singleton: true }
  )

  // T050 [US2]: 註冊 TurnCompleted 事件處理器
  // Phase 7: 使用 GameStatePort + AnimationPort（配對動畫整合）
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  container.register(
    TOKENS.HandleTurnCompletedPort,
    () => new HandleTurnCompletedUseCase(gameStatePort, animationPort, notificationPort, domainFacade),
    { singleton: true }
  )

  // T051 [US2]: 註冊 SelectionRequired 事件處理器
  // Phase 7: 使用 GameStatePort + AnimationPort + DomainFacade（場牌選擇 UI 架構重構）
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  container.register(
    TOKENS.HandleSelectionRequiredPort,
    () => new HandleSelectionRequiredUseCase(gameStatePort, animationPort, domainFacade, notificationPort),
    { singleton: true }
  )

  // T052 [US2]: 註冊 TurnProgressAfterSelection 事件處理器
  // Phase 7: 使用 GameStatePort + AnimationPort（配對動畫整合）
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  container.register(
    TOKENS.HandleTurnProgressAfterSelectionPort,
    () => new HandleTurnProgressAfterSelectionUseCase(
      gameStatePort,
      animationPort,
      domainFacade,
      notificationPort
    ),
    { singleton: true }
  )

  // T068 [US3]: 註冊 DecisionRequired 事件處理器
  container.register(
    TOKENS.HandleDecisionRequiredPort,
    () => new HandleDecisionRequiredUseCase(uiStatePort, notificationPort, domainFacade),
    { singleton: true }
  )

  // T069 [US3]: 註冊 DecisionMade 事件處理器
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  container.register(
    TOKENS.HandleDecisionMadePort,
    () => new HandleDecisionMadeUseCase(uiStatePort, notificationPort),
    { singleton: true }
  )

  // T081 [US4]: 註冊 RoundScored 事件處理器
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  container.register(
    TOKENS.HandleRoundScoredPort,
    () => new HandleRoundScoredUseCase(uiStatePort, domainFacade, notificationPort),
    { singleton: true }
  )

  // T082 [US4]: 註冊 RoundEndedInstantly 事件處理器
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  container.register(
    TOKENS.HandleRoundEndedInstantlyPort,
    () => new HandleRoundEndedInstantlyUseCase(uiStatePort, notificationPort),
    { singleton: true }
  )

  // T083 [US4]: 註冊 RoundDrawn 事件處理器
  container.register(
    TOKENS.HandleRoundDrawnPort,
    () => new HandleRoundDrawnUseCase(notificationPort),
    { singleton: true }
  )

  // T084 [US4]: 註冊 GameFinished 事件處理器
  container.register(
    TOKENS.HandleGameFinishedPort,
    () => new HandleGameFinishedUseCase(notificationPort, uiStatePort),
    { singleton: true }
  )

  // T085 [US4]: 註冊 TurnError 事件處理器
  container.register(
    TOKENS.HandleTurnErrorPort,
    () => new HandleTurnErrorUseCase(notificationPort),
    { singleton: true }
  )

  // T086 [US4]: 註冊 GameSnapshotRestore (Reconnection) 事件處理器
  // Phase 8: 加入 AnimationPort 確保重連時清理動畫
  container.register(
    TOKENS.HandleGameSnapshotRestorePort,
    () => new HandleReconnectionUseCase(uiStatePort, notificationPort, animationPort, matchmakingStatePort),
    { singleton: true }
  )

  // T019: 註冊 GameError 事件處理器
  container.register(
    TOKENS.HandleGameErrorPort,
    () => new HandleGameErrorUseCase(notificationPort, matchmakingStatePort, navigationPort),
    { singleton: true }
  )

  console.info('[DI] Registered Player Operations, US2, US3, and US4 event handlers')
}

/**
 * 註冊 Backend 模式的 Adapters
 *
 * @description
 * 註冊 GameApiClient 作為 SendCommandPort 的實作。
 * Nuxt 4 前後端同域，baseURL 使用空字串。
 */
function registerBackendAdapters(container: DIContainer): void {
  console.info('[DI] 註冊 Backend 模式 Adapters')

  // Nuxt 同域，使用空字串作為 baseURL
  const baseURL = ''

  // SendCommandPort: GameApiClient
  container.register(
    TOKENS.SendCommandPort,
    () => new GameApiClient(baseURL),
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
 * 註冊 SSE 客戶端與事件路由
 *
 * @description
 * 註冊 GameEventClient，用於接收伺服器推送的遊戲事件。
 * 必須在 EventRouter 註冊後調用。
 */
function registerSSEClient(container: DIContainer): void {
  console.info('[DI] 註冊 SSE Client')

  // Nuxt 同域，使用空字串作為 baseURL
  const baseURL = ''

  // GameEventClient
  container.register(
    TOKENS.GameEventClient,
    () => {
      const router = container.resolve(TOKENS.EventRouter) as EventRouter
      return new GameEventClient(baseURL, router)
    },
    { singleton: true },
  )
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

  // T030 [US1]: 綁定 GameStarted 和 RoundDealt 事件
  const gameStartedPort = container.resolve(TOKENS.HandleGameStartedPort) as { execute: (payload: unknown) => void }
  const roundDealtPort = container.resolve(TOKENS.HandleRoundDealtPort) as { execute: (payload: unknown) => void }

  router.register('GameStarted', gameStartedPort)
  router.register('RoundDealt', roundDealtPort)

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

  // T081-T086 [US4]: 綁定 RoundScored、RoundEndedInstantly、RoundDrawn、GameFinished、TurnError、GameSnapshotRestore 事件
  const roundScoredPort = container.resolve(TOKENS.HandleRoundScoredPort) as { execute: (payload: unknown) => void }
  const roundEndedInstantlyPort = container.resolve(TOKENS.HandleRoundEndedInstantlyPort) as { execute: (payload: unknown) => void }
  const roundDrawnPort = container.resolve(TOKENS.HandleRoundDrawnPort) as { execute: (payload: unknown) => void }
  const gameFinishedPort = container.resolve(TOKENS.HandleGameFinishedPort) as { execute: (payload: unknown) => void }
  const turnErrorPort = container.resolve(TOKENS.HandleTurnErrorPort) as { execute: (payload: unknown) => void }
  const gameSnapshotRestorePort = container.resolve(TOKENS.HandleGameSnapshotRestorePort) as { execute: (payload: unknown) => void }

  router.register('RoundScored', roundScoredPort)
  router.register('RoundEndedInstantly', roundEndedInstantlyPort)
  router.register('RoundDrawn', roundDrawnPort)
  router.register('GameFinished', gameFinishedPort)
  router.register('TurnError', turnErrorPort)
  router.register('GameSnapshotRestore', gameSnapshotRestorePort)

  // T020: 綁定 GameError 事件
  const gameErrorPort = container.resolve(TOKENS.HandleGameErrorPort) as { execute: (payload: unknown) => void }
  router.register('GameError', gameErrorPort)

  console.info('[DI] Phase 6: Registered US2, US3, and US4 event routes')
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
