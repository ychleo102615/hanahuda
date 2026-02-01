/**
 * Shared Contracts Barrel File
 *
 * @description
 * 匯出所有前後端共用的型別定義（契約）。
 *
 * @example
 * ```typescript
 * import type { FlowState, GameStartedEvent } from '#shared/contracts'
 * ```
 */

// Flow State
export type { FlowState } from './flow-state'
export { FlowState as FlowStateEnum } from './flow-state'

// Errors
export type { ErrorCode, GameErrorCode, SuggestedAction, RoundEndReason, GameEndedReason } from './errors'
export { ERROR_MESSAGES, GAME_ERROR_MESSAGES, RECONNECTION_RETRY } from './errors'

// Shared Data Structures
export type {
  PlayerInfo,
  PlayerConnectionStatus,
  PlayerConnectionInfo,
  PlayerHand,
  PlayerDepository,
  PlayerScore,
  NextState,
  CardPlay,
  CardSelection,
  Yaku,
  YakuUpdate,
  ScoreMultipliers,
  KoiStatus,
  Ruleset,
  YakuSetting,
  SpecialRules,
  YakuScore,
  // Snapshot API Response Types
  SnapshotResponseType,
  GameFinishedInfo,
  SnapshotApiResponseSnapshot,
  SnapshotApiResponseFinished,
  SnapshotApiResponseExpired,
  SnapshotApiResponse,
} from './shared'

// Shared Helper Functions
export { deriveCapturedCards } from './shared'

// Commands
export type { TurnPlayHandCard, TurnSelectTarget, RoundMakeDecision } from './commands'

// Events
export type {
  BaseEvent,
  // Game Events
  GameStartedEvent,
  RoundDealtEvent,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  // RoundEnded (統一回合結束事件)
  RoundScoringData,
  RoundInstantEndData,
  RoundEndedEvent,
  GameFinishedEvent,
  TurnErrorEvent,
  GameErrorEvent,
  GameSnapshotRestore,
  GameEvent,
  // Snapshot Context Types
  SelectionContext,
  DecisionContext,
  RoundEndInfo,
  // Game Event Types
  GameEventType,
} from './events'

// Game Event Types Constant (for runtime use)
export { GAME_EVENT_TYPES, EVENT_TYPES } from './events'
export type { EventTypeValue } from './events'

// Matchmaking Events
export type {
  MatchmakingStatusEvent,
  MatchFoundEvent,
  MatchmakingErrorEvent,
  MatchFailedEvent,
  MatchmakingEvent,
  MatchmakingEventType,
} from './matchmaking-events'
export {
  MATCHMAKING_EVENT_TYPES,
  MATCHMAKING_EVENT_TYPE_LIST,
} from './matchmaking-events'

// Gateway Events
export type {
  GatewayEvent,
  GatewayEventDomain,
  GatewaySSEEventType,
} from './gateway-events'
export { GATEWAY_DOMAINS, GATEWAY_SSE_EVENT_TYPES } from './gateway-events'

