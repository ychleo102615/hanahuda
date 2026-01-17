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
 * } from '~/game-client/application/ports/output'
 * ```
 */

export type { SendCommandPort } from './send-command.port'

// Output Ports (Phase 4+ refactor)
export type { GameStatePort } from './game-state.port'
export type { AnimationPort, DealAnimationParams } from './animation.port'
export type { NotificationPort } from './notification.port'
export type { MatchmakingStatePort, MatchmakingStatus, OnlineMatchmakingState } from './matchmaking-state.port'
export type { NavigationPort } from './navigation.port'
export type { SessionContextPort } from './session-context.port'

// Game Connection (GameConnectionPort is an abstract class, needs value export)
export { GameConnectionPort, type GameConnectionParams } from './game-connection.port'

// Error Handling
export type { ErrorHandlerPort } from './error-handler.port'

// Operation & Timing Ports
export type { OperationSessionPort } from './operation-session.port'
export type { DelayPort } from './delay.port'
export type { LayoutPort } from './layout.port'

// Legacy Output Ports
export type { UIStatePort } from './ui-state.port'

// Telegram Ports
export type { TelegramAuthPort, TelegramAuthResult, TelegramAuthPlayer } from './telegram-auth.port'

// Connection Ready Port
export type { ConnectionReadyPort, ConnectionReadyPayload, PlayerInitialStatus } from './connection-ready.port'
