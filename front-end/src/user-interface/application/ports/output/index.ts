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
 *   UpdateUIStatePort,
 *   TriggerUIEffectPort,
 *   AnimationType,
 *   AnimationParams
 * } from '@/user-interface/application/ports/output'
 * ```
 */

export type { SendCommandPort } from './send-command.port'
export type { UpdateUIStatePort } from './update-ui-state.port'
export type {
  TriggerUIEffectPort,
  AnimationType,
  AnimationParams,
} from './trigger-ui-effect.port'
