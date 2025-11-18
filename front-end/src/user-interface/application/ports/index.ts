/**
 * Ports Barrel File
 *
 * @description
 * 匯出所有 Port 介面（Input Ports + Output Ports），
 * 提供統一的導入入口。
 *
 * @example
 * ```typescript
 * // 導入 Input Ports
 * import type {
 *   PlayHandCardPort,
 *   HandleGameStartedPort
 * } from '@/user-interface/application/ports'
 *
 * // 導入 Output Ports
 * import type {
 *   SendCommandPort,
 *   UIStatePort,
 *   TriggerUIEffectPort
 * } from '@/user-interface/application/ports'
 * ```
 */

// Input Ports (18 個)
export type {
  // Player Operations (3 個)
  PlayHandCardPort,
  PlayHandCardInput,
  PlayHandCardOutput,
  SelectMatchTargetPort,
  SelectMatchTargetInput,
  SelectMatchTargetOutput,
  MakeKoiKoiDecisionPort,
  MakeKoiKoiDecisionInput,
  MakeKoiKoiDecisionOutput,
  // Event Handlers (15 個)
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
  HandleReconnectionPort,
} from './input'

// Output Ports (3 個)
export type { SendCommandPort, UIStatePort, TriggerUIEffectPort, AnimationType, AnimationParams } from './output'
