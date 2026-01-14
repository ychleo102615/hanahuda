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
import { HandleRoundEndedUseCase } from '../../application/use-cases/event-handlers/HandleRoundEndedUseCase'
import { HandleGameFinishedUseCase } from '../../application/use-cases/event-handlers/HandleGameFinishedUseCase'
import { HandleTurnErrorUseCase } from '../../application/use-cases/event-handlers/HandleTurnErrorUseCase'
import { HandleGameErrorUseCase } from '../../application/use-cases/event-handlers/HandleGameErrorUseCase'
import { HandleInitialStateUseCase } from '../../application/use-cases/HandleInitialStateUseCase'
import { StartGameUseCase } from '../../application/use-cases/StartGameUseCase'
import { HandleStateRecoveryUseCase } from '../../application/use-cases/HandleStateRecoveryUseCase'
import { PlayHandCardUseCase } from '../../application/use-cases/player-operations/PlayHandCardUseCase'
import { SelectMatchTargetUseCase } from '../../application/use-cases/player-operations/SelectMatchTargetUseCase'
import { MakeKoiKoiDecisionUseCase } from '../../application/use-cases/player-operations/MakeKoiKoiDecisionUseCase'
import type { UIStatePort, GameStatePort, AnimationPort, NotificationPort, MatchmakingStatePort, NavigationPort, SessionContextPort, ErrorHandlerPort } from '../../application/ports/output'
import type { HandleStateRecoveryPort } from '../../application/ports/input'
import { createSessionContextAdapter } from '../session/SessionContextAdapter'
import type { DomainFacade } from '../../application/types/domain-facade'
import * as domain from '../../domain'
import { MockApiClient } from '../mock/MockApiClient'
import { MockEventEmitter } from '../mock/MockEventEmitter'
import { EventRouter } from '../ws/EventRouter'
import { MatchmakingEventRouter } from '../ws/MatchmakingEventRouter'
import { GatewayEventRouter } from '../ws/GatewayEventRouter'
import { GatewayWebSocketClient } from '../ws/GatewayWebSocketClient'
import { WsSendCommandAdapter } from '../ws/WsSendCommandAdapter'
import { AnimationPortAdapter } from '../animation/AnimationPortAdapter'
import { zoneRegistry } from '../animation/ZoneRegistry'
import { createNotificationPortAdapter } from '../notification/NotificationPortAdapter'
import { createGameStatePortAdapter } from '../stores/GameStatePortAdapter'
import { createNavigationPortAdapter } from '../router/NavigationPortAdapter'
import { createApiErrorHandler } from '../api/ApiErrorHandler'
import { CountdownManager } from '../services/CountdownManager'
import { OperationSessionManager, OperationSessionPortAdapter, DelayPortAdapter, LayoutPortAdapter } from '../abort'
import type { OperationSessionPort, DelayPort, LayoutPort } from '../../application/ports/output'
import { RoomApiClient } from '../api/RoomApiClient'
import { MatchmakingApiClient } from '../api/MatchmakingApiClient'
import { GameConnectionPort } from '../../application/ports/output'
import type { GameConnectionParams } from '../../application/ports/output'
import type { SSEEventType } from '#shared/contracts'
import { MATCHMAKING_EVENT_TYPES } from '#shared/contracts'
import {
  HandleMatchmakingStatusUseCase,
  HandleMatchFoundUseCase,
  HandleMatchmakingCancelledUseCase,
  HandleMatchmakingErrorUseCase,
  HandleMatchFailedUseCase,
} from '../../application/use-cases/matchmaking'
import { HandleGatewayConnectedUseCase } from '../../application/use-cases/HandleGatewayConnectedUseCase'
import { ClearOrphanedSessionUseCase } from '../../application/use-cases/ClearOrphanedSessionUseCase'

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

  // 5.1 註冊配對事件路由 (僅 Backend 模式)
  if (mode === 'backend') {
    registerMatchmakingEventRoutes(container)
  }

  // 6. 根據模式初始化事件發射器 (必須在事件路由之後)
  if (mode === 'mock') {
    initializeMockEventEmitter(container)
  }
  // Backend 模式的 SSE 相關元件已在 registerBackendAdapters 中註冊
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

  // 註冊 OperationSessionManager 為單例
  // 管理全域的 AbortController，用於協調所有可取消操作
  container.register(
    TOKENS.OperationSessionManager,
    () => new OperationSessionManager(),
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
  // Phase 10: 改用 OperationSessionManager 取代 DelayManagerPort
  container.register(
    TOKENS.AnimationPort,
    () => {
      const registry = container.resolve(TOKENS.ZoneRegistry) as typeof zoneRegistry
      const animationLayerStore = container.resolve(TOKENS.AnimationLayerStore) as ReturnType<typeof useAnimationLayerStore>
      const operationSession = container.resolve(TOKENS.OperationSessionManager) as OperationSessionManager
      const uiState = container.resolve(TOKENS.UIStateStore) as ReturnType<typeof useUIStateStore>
      return new AnimationPortAdapter(registry, animationLayerStore, operationSession, uiState)
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

  // SessionContextPort: 由 SessionContextAdapter 實作
  // 管理非敏感的 session 識別資訊（gameId, playerId）
  // session_token 由 HttpOnly Cookie 管理，不在此介面中
  container.register(
    TOKENS.SessionContextPort,
    () => createSessionContextAdapter(),
    { singleton: true },
  )

  // ErrorHandlerPort: 統一 API 錯誤處理器
  // 由 ApiErrorHandler Adapter 實作，根據錯誤類型決定處理策略：Toast / 重導向 / 錯誤 Modal
  container.register(
    TOKENS.ErrorHandlerPort,
    () => {
      const notification = container.resolve(TOKENS.NotificationPort) as NotificationPort
      const navigation = container.resolve(TOKENS.NavigationPort) as NavigationPort
      const sessionContext = container.resolve(TOKENS.SessionContextPort) as SessionContextPort
      const matchmakingState = container.resolve(TOKENS.MatchmakingStatePort) as MatchmakingStatePort
      return createApiErrorHandler({
        notification,
        navigation,
        sessionContext,
        matchmakingState,
      })
    },
    { singleton: true },
  )

  // SendCommandPort: 根據模式由不同的 Adapter 實作
  // 在 registerBackendAdapters / registerMockAdapters 中註冊

  // ===== Operation & Timing Ports =====

  // OperationSessionPort: 管理全域 AbortController，協調可取消操作
  container.register(
    TOKENS.OperationSessionPort,
    () => {
      const manager = container.resolve(TOKENS.OperationSessionManager) as OperationSessionManager
      return new OperationSessionPortAdapter(manager)
    },
    { singleton: true },
  )

  // DelayPort: 提供可取消的延遲函數
  container.register(
    TOKENS.DelayPort,
    () => new DelayPortAdapter(),
    { singleton: true },
  )

  // LayoutPort: 提供等待瀏覽器 layout 的函數
  container.register(
    TOKENS.LayoutPort,
    () => new LayoutPortAdapter(),
    { singleton: true },
  )
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

  // SessionContextPort: 管理 session 識別資訊
  const sessionContextPort = container.resolve(TOKENS.SessionContextPort) as SessionContextPort

  // Operation & Timing Ports
  const operationSessionPort = container.resolve(TOKENS.OperationSessionPort) as OperationSessionPort
  const delayPort = container.resolve(TOKENS.DelayPort) as DelayPort
  const layoutPort = container.resolve(TOKENS.LayoutPort) as LayoutPort

  // SendCommandPort: 用於玩家操作 Use Cases
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendCommandPort = container.resolve(TOKENS.SendCommandPort) as any

  // 註冊 StartGamePort（SSE-First Architecture）
  // 依賴 GameConnectionPort、GameStatePort、NotificationPort、AnimationPort、OperationSessionPort
  container.register(
    TOKENS.StartGamePort,
    () => {
      const gameConnectionPort = container.resolve(TOKENS.GameConnectionPort) as GameConnectionPort
      return new StartGameUseCase(
        gameConnectionPort,
        gameStatePort,
        notificationPort,
        animationPort,
        operationSessionPort,
      )
    },
    { singleton: true }
  )

  // ErrorHandlerPort: 統一 API 錯誤處理
  const errorHandler = container.resolve(TOKENS.ErrorHandlerPort) as ErrorHandlerPort

  // Player Operations Use Cases

  // 註冊 PlayHandCardPort
  // Phase 7: 加入 animationPort 用於檢查動畫狀態
  // 整合 ErrorHandlerPort 處理 API 錯誤
  container.register(
    TOKENS.PlayHandCardPort,
    () => new PlayHandCardUseCase(sendCommandPort, notificationPort, domainFacade, animationPort, errorHandler),
    { singleton: true }
  )

  // 註冊 SelectMatchTargetPort
  // Phase 7: 加入 animationPort 用於檢查動畫狀態
  // 整合 ErrorHandlerPort 處理 API 錯誤
  container.register(
    TOKENS.SelectMatchTargetPort,
    () => new SelectMatchTargetUseCase(sendCommandPort, domainFacade, animationPort, errorHandler),
    { singleton: true }
  )

  // 註冊 MakeKoiKoiDecisionPort (T068-T070)
  // Phase 7: 加入 animationPort 用於檢查動畫狀態
  // Pattern B: 加入 notification 用於停止倒數計時（Use Case 控制業務邏輯）
  // 整合 ErrorHandlerPort 處理 API 錯誤
  container.register(
    TOKENS.MakeKoiKoiDecisionPort,
    () => {
      const notification = container.resolve<NotificationPort>(TOKENS.NotificationPort)
      return new MakeKoiKoiDecisionUseCase(sendCommandPort, domainFacade, animationPort, notification, errorHandler)
    },
    { singleton: true }
  )

  // Event Handlers

  // T030 [US1]: 註冊 GameStarted 事件處理器
  container.register(
    TOKENS.HandleGameStartedPort,
    () => new HandleGameStartedUseCase(uiStatePort, gameStatePort, matchmakingStatePort, navigationPort, notificationPort),
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
  // Phase 10: 改用 AbortableDelay（Use Case 內部 import delay）
  container.register(
    TOKENS.HandleTurnCompletedPort,
    () => new HandleTurnCompletedUseCase(gameStatePort, animationPort, notificationPort, domainFacade),
    { singleton: true }
  )

  // T051 [US2]: 註冊 SelectionRequired 事件處理器
  // Phase 7: 使用 GameStatePort + AnimationPort + DomainFacade（場牌選擇 UI 架構重構）
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  // 改用 LayoutPort 取代直接 import waitForLayout
  container.register(
    TOKENS.HandleSelectionRequiredPort,
    () => new HandleSelectionRequiredUseCase(gameStatePort, animationPort, domainFacade, notificationPort, layoutPort),
    { singleton: true }
  )

  // T052 [US2]: 註冊 TurnProgressAfterSelection 事件處理器
  // Phase 7: 使用 GameStatePort + AnimationPort（配對動畫整合）
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  // 改用 DelayPort 取代直接 import delay
  container.register(
    TOKENS.HandleTurnProgressAfterSelectionPort,
    () => new HandleTurnProgressAfterSelectionUseCase(
      gameStatePort,
      animationPort,
      domainFacade,
      notificationPort,
      delayPort
    ),
    { singleton: true }
  )

  // T068 [US3]: 註冊 DecisionRequired 事件處理器
  // 加入 gameStatePort 以檢查是否為自己的回合，animationPort 以播放動畫
  // Phase 10: 改用 AbortableDelay（Use Case 內部 import delay）
  container.register(
    TOKENS.HandleDecisionRequiredPort,
    () => new HandleDecisionRequiredUseCase(uiStatePort, notificationPort, domainFacade, gameStatePort, animationPort),
    { singleton: true }
  )

  // T069 [US3]: 註冊 DecisionMade 事件處理器
  // Phase 9: 加入 NotificationPort（倒數計時整合）
  container.register(
    TOKENS.HandleDecisionMadePort,
    // 注入 GameStatePort 以設置 activePlayerId
    () => new HandleDecisionMadeUseCase(uiStatePort, notificationPort, gameStatePort),
    { singleton: true }
  )

  // 註冊 RoundEnded 事件處理器（統一處理 SCORED / DRAWN / INSTANT_*）
  container.register(
    TOKENS.HandleRoundEndedPort,
    () => new HandleRoundEndedUseCase(uiStatePort, notificationPort, gameStatePort, sendCommandPort),
    { singleton: true }
  )

  // T084 [US4]: 註冊 GameFinished 事件處理器
  // 需要 GameConnectionPort 以設定預期斷線標記（後端會在發送此事件後主動關閉 WebSocket）
  container.register(
    TOKENS.HandleGameFinishedPort,
    () => {
      const gameConnectionPort = container.resolve(TOKENS.GameConnectionPort) as GameConnectionPort
      return new HandleGameFinishedUseCase(notificationPort, uiStatePort, gameStatePort, gameConnectionPort)
    },
    { singleton: true }
  )

  // T085 [US4]: 註冊 TurnError 事件處理器
  container.register(
    TOKENS.HandleTurnErrorPort,
    () => new HandleTurnErrorUseCase(notificationPort),
    { singleton: true }
  )

  // T019: 註冊 GameError 事件處理器
  // GameError 是各 Use Case 的 fallback，統一顯示錯誤 Modal
  container.register(
    TOKENS.HandleGameErrorPort,
    () => new HandleGameErrorUseCase(notificationPort, gameStatePort, matchmakingStatePort, sessionContextPort),
    { singleton: true }
  )

  // SSE-First: 註冊 HandleInitialStatePort（處理 SSE 連線後的第一個事件）
  // 改用 OperationSessionPort 取代 OperationSessionManager
  container.register(
    TOKENS.HandleInitialStatePort,
    () => new HandleInitialStateUseCase(
      uiStatePort,
      notificationPort,
      navigationPort,
      animationPort,
      matchmakingStatePort,
      gameStatePort,
      operationSessionPort
    ),
    { singleton: true }
  )

  // 註冊 HandleStateRecoveryPort（統一處理快照恢復）
  // 改用 OperationSessionPort 取代 OperationSessionManager
  container.register(
    TOKENS.HandleStateRecoveryPort,
    () => new HandleStateRecoveryUseCase(uiStatePort, notificationPort, navigationPort, animationPort, matchmakingStatePort, operationSessionPort),
    { singleton: true }
  )

  // Gateway: 註冊 HandleGatewayConnectedPort（處理 Gateway 連線後的初始狀態）
  container.register(
    TOKENS.HandleGatewayConnectedPort,
    () => new HandleGatewayConnectedUseCase(matchmakingStatePort, sessionContextPort, navigationPort, gameStatePort),
    { singleton: true }
  )

  // Session Management: 註冊 ClearOrphanedSessionPort（清除孤立會話）
  container.register(
    TOKENS.ClearOrphanedSessionPort,
    () => new ClearOrphanedSessionUseCase(gameStatePort, sessionContextPort, matchmakingStatePort),
    { singleton: true }
  )

}

/**
 * 註冊 Backend 模式的 Adapters
 *
 * @description
 * 註冊 WsSendCommandAdapter 作為 SendCommandPort 的實作。
 * 透過 WebSocket 發送命令到後端伺服器。
 *
 * 同時註冊 WebSocket 相關元件：
 * - GatewayWebSocketClient
 * - GatewayEventRouter
 * - GameConnectionPort
 */
function registerBackendAdapters(container: DIContainer): void {

  // Nuxt 同域，使用空字串作為 baseURL
  const baseURL = ''

  // RoomApiClient: 取得房間類型列表
  container.register(
    TOKENS.RoomApiClient,
    () => new RoomApiClient(baseURL),
    { singleton: true },
  )

  // MatchmakingApiClient: 線上配對 API（011-online-matchmaking）
  container.register(
    TOKENS.MatchmakingApiClient,
    () => new MatchmakingApiClient(),
    { singleton: true },
  )

  // EventRouter (共用)
  // 設置 OperationSessionManager 以便傳遞 AbortSignal 給 Use Cases
  container.register(
    TOKENS.EventRouter,
    () => {
      const router = new EventRouter()
      const operationSession = container.resolve(TOKENS.OperationSessionManager) as OperationSessionManager
      router.setOperationSession(operationSession)
      return router
    },
    { singleton: true },
  )

  // ===== Matchmaking Event Router =====

  // MatchmakingEventRouter: 配對事件路由器
  container.register(
    TOKENS.MatchmakingEventRouter,
    () => new MatchmakingEventRouter(),
    { singleton: true },
  )

  // ===== Gateway WebSocket (Game Gateway 統一架構) =====

  // GatewayEventRouter: 統一 Gateway 事件路由器
  // 整合 EventRouter (遊戲) 與 MatchmakingEventRouter (配對)
  container.register(
    TOKENS.GatewayEventRouter,
    () => {
      const gameRouter = container.resolve(TOKENS.EventRouter) as EventRouter
      const matchmakingRouter = container.resolve(TOKENS.MatchmakingEventRouter) as MatchmakingEventRouter
      return new GatewayEventRouter(gameRouter, matchmakingRouter)
    },
    { singleton: true },
  )

  // GatewayWebSocketClient: 統一 Gateway WebSocket 客戶端
  // 連線到 /_ws，接收所有遊戲相關事件並發送命令
  container.register(
    TOKENS.GatewayWebSocketClient,
    () => {
      const router = container.resolve(TOKENS.GatewayEventRouter) as GatewayEventRouter
      const wsClient = new GatewayWebSocketClient(router)

      // 注入 WebSocket 客戶端到 MatchmakingApiClient
      // 這確保配對操作透過 WebSocket 進行，避免 Race Condition
      const matchmakingClient = container.resolve(TOKENS.MatchmakingApiClient) as MatchmakingApiClient
      matchmakingClient.setWebSocketClient(wsClient)

      return wsClient
    },
    { singleton: true },
  )

  // SendCommandPort: WsSendCommandAdapter（透過 WebSocket 發送命令）
  // 必須在 GatewayWebSocketClient 之後註冊
  container.register(
    TOKENS.SendCommandPort,
    () => {
      const wsClient = container.resolve(TOKENS.GatewayWebSocketClient) as GatewayWebSocketClient
      const gameState = container.resolve(TOKENS.GameStatePort) as GameStatePort
      return new WsSendCommandAdapter(wsClient, gameState)
    },
    { singleton: true },
  )

  // GameConnectionPort: 包裝 GatewayWebSocketClient 提供 Application Layer 介面
  // Gateway 架構下，connect() 參數由 Cookie 身份驗證取代
  container.register(
    TOKENS.GameConnectionPort,
    () => {
      const gatewayClient = container.resolve(TOKENS.GatewayWebSocketClient) as GatewayWebSocketClient

      // 建立內聯 Adapter，將 GatewayWebSocketClient 適配為 GameConnectionPort
      return new (class extends GameConnectionPort {
        connect(_params: GameConnectionParams): void {
          // Gateway 架構：身份由 Cookie 驗證，不需要傳遞參數
          gatewayClient.connect()
        }

        disconnect(): void {
          gatewayClient.disconnect()
        }

        isConnected(): boolean {
          return gatewayClient.isConnected()
        }

        setExpectingDisconnect(expecting: boolean): void {
          gatewayClient.setExpectingDisconnect(expecting)
        }
      })()
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

  // Mock 模式也使用空字串作為 baseURL
  const baseURL = ''

  // SendCommandPort: MockApiClient
  container.register(
    TOKENS.SendCommandPort,
    () => new MockApiClient(),
    { singleton: true },
  )

  // RoomApiClient: 取得房間類型列表
  container.register(
    TOKENS.RoomApiClient,
    () => new RoomApiClient(baseURL),
    { singleton: true },
  )

  // EventRouter (共用)
  // 設置 OperationSessionManager 以便傳遞 AbortSignal 給 Use Cases
  container.register(
    TOKENS.EventRouter,
    () => {
      const router = new EventRouter()
      const operationSession = container.resolve(TOKENS.OperationSessionManager) as OperationSessionManager
      router.setOperationSession(operationSession)
      return router
    },
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
    register: (eventType: SSEEventType, port: { execute: (payload: unknown) => void }) => void
  }

  // SSE-First: 綁定 InitialState 事件（SSE 連線後的第一個事件）
  const handleInitialStatePort = container.resolve(TOKENS.HandleInitialStatePort) as { execute: (payload: unknown) => void }
  router.register('InitialState', handleInitialStatePort)

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

  // T081-T086 [US4]: 綁定 RoundEnded、GameFinished、TurnError 事件
  const roundEndedPort = container.resolve(TOKENS.HandleRoundEndedPort) as { execute: (payload: unknown) => void }
  const gameFinishedPort = container.resolve(TOKENS.HandleGameFinishedPort) as { execute: (payload: unknown) => void }
  const turnErrorPort = container.resolve(TOKENS.HandleTurnErrorPort) as { execute: (payload: unknown) => void }

  router.register('RoundEnded', roundEndedPort)
  router.register('GameFinished', gameFinishedPort)
  router.register('TurnError', turnErrorPort)

  // GameSnapshotRestore 事件：使用 HandleStateRecoveryPort.handleSnapshotRestore()
  const handleStateRecoveryPort = container.resolve(TOKENS.HandleStateRecoveryPort) as HandleStateRecoveryPort
  router.register('GameSnapshotRestore', {
    execute: (payload: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleStateRecoveryPort.handleSnapshotRestore(payload as any)
    },
  })

  // T020: 綁定 GameError 事件
  const gameErrorPort = container.resolve(TOKENS.HandleGameErrorPort) as { execute: (payload: unknown) => void }
  router.register('GameError', gameErrorPort)

  // Gateway: 綁定 GatewayConnected 事件（Gateway SSE 連線後的初始狀態）
  const gatewayConnectedPort = container.resolve(TOKENS.HandleGatewayConnectedPort) as { execute: (payload: unknown) => void }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router.register('GatewayConnected' as any, gatewayConnectedPort)

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
  registerMockAdapters(container)
}

/**
 * 註冊配對事件路由
 *
 * @description
 * 將配對 SSE 事件類型綁定到對應的 Input Ports (Use Cases)。
 * 僅在 Backend 模式下呼叫。
 *
 * 事件類型:
 * - MatchmakingStatus: 更新配對狀態（搜尋中、低可用性）
 * - MatchFound: 配對成功，導航至遊戲
 * - MatchmakingCancelled: 配對取消
 * - MatchmakingError: 配對錯誤
 */
function registerMatchmakingEventRoutes(container: DIContainer): void {
  const router = container.resolve(TOKENS.MatchmakingEventRouter) as MatchmakingEventRouter

  // 取得 Output Ports
  const matchmakingStatePort = container.resolve(TOKENS.MatchmakingStatePort) as MatchmakingStatePort
  const navigationPort = container.resolve(TOKENS.NavigationPort) as NavigationPort
  const gameStatePort = container.resolve(TOKENS.GameStatePort) as GameStatePort
  const sessionContextPort = container.resolve(TOKENS.SessionContextPort) as SessionContextPort

  // 建立 Use Cases
  const handleMatchmakingStatusUseCase = new HandleMatchmakingStatusUseCase(matchmakingStatePort)
  const handleMatchFoundUseCase = new HandleMatchFoundUseCase(matchmakingStatePort, navigationPort, gameStatePort, sessionContextPort)
  const handleMatchmakingCancelledUseCase = new HandleMatchmakingCancelledUseCase(matchmakingStatePort, sessionContextPort)
  const handleMatchmakingErrorUseCase = new HandleMatchmakingErrorUseCase(matchmakingStatePort)
  const handleMatchFailedUseCase = new HandleMatchFailedUseCase(matchmakingStatePort, sessionContextPort)

  // 註冊事件處理器
  router.register(MATCHMAKING_EVENT_TYPES.MatchmakingStatus, handleMatchmakingStatusUseCase)
  router.register(MATCHMAKING_EVENT_TYPES.MatchFound, handleMatchFoundUseCase)
  router.register(MATCHMAKING_EVENT_TYPES.MatchmakingCancelled, handleMatchmakingCancelledUseCase)
  router.register(MATCHMAKING_EVENT_TYPES.MatchmakingError, handleMatchmakingErrorUseCase)
  router.register(MATCHMAKING_EVENT_TYPES.MatchFailed, handleMatchFailedUseCase)
}
