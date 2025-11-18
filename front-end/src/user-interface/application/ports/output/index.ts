/**
 * Output Ports Barrel File
 *
 * @description
 * 匯出所有 Output Ports 介面，
 * 由 Application Layer 定義，Adapter Layer 實作。
 *
 * @example
 * ```typescript
 * import type {
 *   SendCommandPort,
 *   UIStatePort,
 *   TriggerUIEffectPort,
 *   AnimationType,
 *   AnimationParams
 * } from '@/user-interface/application/ports/output'
 * ```
 */

export type { SendCommandPort } from './send-command.port'
export type { UIStatePort } from './ui-state.port'
export type {
  TriggerUIEffectPort,
  AnimationType,
  AnimationParams,
} from './trigger-ui-effect.port'
