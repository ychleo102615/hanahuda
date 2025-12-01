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
 *   GameStatePort,
 *   AnimationPort,
 *   NotificationPort,
 * } from '@/user-interface/application/ports/output'
 * ```
 */

export type { SendCommandPort } from './send-command.port'

// Output Ports (Phase 4+ refactor)
export type { GameStatePort } from './game-state.port'
export type { AnimationPort, DealAnimationParams } from './animation.port'
export type { NotificationPort } from './notification.port'
export type { MatchmakingStatePort, MatchmakingStatus } from './matchmaking-state.port'
export type { NavigationPort } from './navigation.port'

// Legacy Output Ports
export type { UIStatePort } from './ui-state.port'
