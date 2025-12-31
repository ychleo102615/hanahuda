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
 * } from '~/user-interface/application/ports'
 *
 * // 導入 Output Ports
 * import type {
 *   SendCommandPort,
 *   GameStatePort,
 *   AnimationPort,
 *   NotificationPort
 * } from '~/user-interface/application/ports'
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
  // Event Handlers (10 個)
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
} from './input'

// Output Ports
export type {
  SendCommandPort,
  UIStatePort,
  GameStatePort,
  AnimationPort,
  NotificationPort,
  DealAnimationParams
} from './output'
