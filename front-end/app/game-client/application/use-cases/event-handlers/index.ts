/**
 * Event Handler Use Cases
 *
 * @description
 * 匯出所有事件處理器 Use Cases（10 個 SSE 事件處理器）。
 *
 * 分類：
 * - Core Game Flow Events (7): GameStarted, RoundDealt, TurnCompleted, SelectionRequired, TurnProgressAfterSelection, DecisionRequired, DecisionMade
 * - Round Ending Events (2): RoundEnded, GameFinished
 * - Error Events (1): TurnError
 *
 * @see specs/003-ui-application-layer/contracts/events.md
 */

// Core Game Flow Events
export { HandleGameStartedUseCase } from './HandleGameStartedUseCase'
export { HandleRoundDealtUseCase } from './HandleRoundDealtUseCase'
export { HandleTurnCompletedUseCase } from './HandleTurnCompletedUseCase'
export { HandleSelectionRequiredUseCase } from './HandleSelectionRequiredUseCase'
export { HandleTurnProgressAfterSelectionUseCase } from './HandleTurnProgressAfterSelectionUseCase'
export { HandleDecisionRequiredUseCase } from './HandleDecisionRequiredUseCase'
export { HandleDecisionMadeUseCase } from './HandleDecisionMadeUseCase'

// Round Ending Events
export { HandleRoundEndedUseCase } from './HandleRoundEndedUseCase'
export { HandleGameFinishedUseCase } from './HandleGameFinishedUseCase'

// Error Events
export { HandleTurnErrorUseCase } from './HandleTurnErrorUseCase'
