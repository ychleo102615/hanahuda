/**
 * Event Handlers Input Ports
 *
 * @description
 * 由 Application Layer 定義並實作為 Use Cases，
 * 供 Adapter Layer（EventRouter）呼叫。
 *
 * 所有 Port 都繼承自 EventHandlerPort<T>，統一 execute 方法簽名：
 * - execute(event: T, options: ExecuteOptions): void | Promise<void>
 *
 * 包含 10 個事件處理器 Input Ports（對應 10 種推送事件）：
 * - HandleGameStartedPort
 * - HandleRoundDealtPort
 * - HandleTurnCompletedPort
 * - HandleSelectionRequiredPort
 * - HandleTurnProgressAfterSelectionPort
 * - HandleDecisionRequiredPort
 * - HandleDecisionMadePort
 * - HandleRoundEndedPort
 * - HandleGameFinishedPort
 * - HandleTurnErrorPort
 * - HandleGameErrorPort
 *
 * 注意：GameSnapshotRestore 事件由 HandleStateRecoveryPort 處理（見 handle-state-recovery.port.ts）
 */

import type {
  GameStartedEvent,
  RoundDealtEvent,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  RoundEndedEvent,
  GameFinishedEvent,
  TurnErrorEvent,
  GameErrorEvent,
} from '#shared/contracts'
import type { EventHandlerPort } from './event-handler.interface'

/**
 * HandleGameStartedPort - Input Port
 *
 * @description
 * 處理 GameStarted 事件。
 *
 * 實作: HandleGameStartedUseCase
 */
export interface HandleGameStartedPort extends EventHandlerPort<GameStartedEvent> {}

/**
 * HandleRoundDealtPort - Input Port
 *
 * @description
 * 處理 RoundDealt 事件。
 *
 * 實作: HandleRoundDealtUseCase
 */
export interface HandleRoundDealtPort extends EventHandlerPort<RoundDealtEvent> {}

/**
 * HandleTurnCompletedPort - Input Port
 *
 * @description
 * 處理 TurnCompleted 事件（無中斷、無役種形成）。
 *
 * 實作: HandleTurnCompletedUseCase
 */
export interface HandleTurnCompletedPort extends EventHandlerPort<TurnCompletedEvent> {}

/**
 * HandleSelectionRequiredPort - Input Port
 *
 * @description
 * 處理 SelectionRequired 事件（翻牌雙重配對）。
 *
 * 實作: HandleSelectionRequiredUseCase
 */
export interface HandleSelectionRequiredPort extends EventHandlerPort<SelectionRequiredEvent> {}

/**
 * HandleTurnProgressAfterSelectionPort - Input Port
 *
 * @description
 * 處理 TurnProgressAfterSelection 事件。
 *
 * 實作: HandleTurnProgressAfterSelectionUseCase
 */
export interface HandleTurnProgressAfterSelectionPort extends EventHandlerPort<TurnProgressAfterSelectionEvent> {}

/**
 * HandleDecisionRequiredPort - Input Port
 *
 * @description
 * 處理 DecisionRequired 事件（形成役種，需決策）。
 *
 * 實作: HandleDecisionRequiredUseCase
 */
export interface HandleDecisionRequiredPort extends EventHandlerPort<DecisionRequiredEvent> {}

/**
 * HandleDecisionMadePort - Input Port
 *
 * @description
 * 處理 DecisionMade 事件（僅在選擇 KOI_KOI 時）。
 *
 * 實作: HandleDecisionMadeUseCase
 */
export interface HandleDecisionMadePort extends EventHandlerPort<DecisionMadeEvent> {}

/**
 * HandleGameFinishedPort - Input Port
 *
 * @description
 * 處理 GameFinished 事件（遊戲結束）。
 *
 * 實作: HandleGameFinishedUseCase
 */
export interface HandleGameFinishedPort extends EventHandlerPort<GameFinishedEvent> {}

/**
 * HandleTurnErrorPort - Input Port
 *
 * @description
 * 處理 TurnError 事件（操作錯誤）。
 *
 * 實作: HandleTurnErrorUseCase
 */
export interface HandleTurnErrorPort extends EventHandlerPort<TurnErrorEvent> {}

/**
 * HandleGameErrorPort - Input Port
 *
 * @description
 * 處理 GameError 事件（遊戲層級錯誤）。
 *
 * 處理流程：
 * 1. 顯示錯誤通知（NotificationPort）
 * 2. 更新配對狀態為 'error'（MatchmakingStatePort）
 * 3. 若不可恢復，清除會話並導航回首頁
 *
 * 實作: HandleGameErrorUseCase
 */
export interface HandleGameErrorPort extends EventHandlerPort<GameErrorEvent> {}

/**
 * HandleRoundEndedPort - Input Port
 *
 * @description
 * 處理 RoundEnded 統一事件（取代 RoundScored、RoundDrawn、RoundEndedInstantly）。
 * 根據 event.reason 決定顯示哪種 Modal。
 *
 * 實作: HandleRoundEndedUseCase
 */
export interface HandleRoundEndedPort extends EventHandlerPort<RoundEndedEvent> {}

