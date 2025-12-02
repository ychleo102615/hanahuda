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
 *   PlayHandCardPort,
 *   HandleGameStartedPort,
 *   HandleRoundDealtPort
 * } from '@/user-interface/application/ports/input'
 * ```
 */

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
  HandleRoundScoredPort,
  HandleRoundDrawnPort,
  HandleRoundEndedInstantlyPort,
  HandleGameFinishedPort,
  HandleTurnErrorPort,
  HandleGameErrorPort,
  HandleReconnectionPort,
} from './event-handlers.port'
