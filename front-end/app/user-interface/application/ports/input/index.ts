/**
 * Input Ports Barrel File
 *
 * @description
 * 匯出所有 Input Ports 介面，
 * 由 Application Layer 定義並實作為 Use Cases，
 * 供 Adapter Layer 呼叫。
 *
 * @example
 * ```typescript
 * import type {
 *   StartGamePort,
 *   PlayHandCardPort,
 *   HandleGameStartedPort,
 *   HandleRoundDealtPort,
 *   ExecuteOptions,
 *   EventHandlerPort
 * } from '~/user-interface/application/ports/input'
 * ```
 */

// Event Handler Base Types
export type { ExecuteOptions } from './execute-options'
export type { EventHandlerPort } from './event-handler.interface'

// Game Initialization Input Ports
export type { StartGamePort, StartGameOptions } from './start-game.port'

// Player Operations Input Ports
export type {
  PlayHandCardPort,
  PlayHandCardInput,
  PlayHandCardOutput,
  SelectMatchTargetPort,
  SelectMatchTargetInput,
  SelectMatchTargetOutput,
  MakeKoiKoiDecisionPort,
  MakeKoiKoiDecisionInput,
  MakeKoiKoiDecisionOutput,
} from './player-operations.port'

// Event Handlers Input Ports
export type {
  HandleGameStartedPort,
  HandleRoundDealtPort,
  HandleTurnCompletedPort,
  HandleSelectionRequiredPort,
  HandleTurnProgressAfterSelectionPort,
  HandleDecisionRequiredPort,
  HandleDecisionMadePort,
  HandleRoundEndedPort,
  HandleGameFinishedPort,
  HandleTurnErrorPort,
  HandleGameErrorPort,
} from './event-handlers.port'

// InitialState Handler Input Port (SSE-First Architecture)
export { HandleInitialStatePort } from './handle-initial-state.port'

// State Recovery Input Port (for SSE GameSnapshotRestore event)
export { HandleStateRecoveryPort } from './handle-state-recovery.port'

// Matchmaking Event Handlers Input Ports
export type {
  HandleMatchmakingStatusPort,
  HandleMatchFoundPort,
  HandleMatchmakingCancelledPort,
  HandleMatchmakingErrorPort,
} from './matchmaking-event-handlers.port'
