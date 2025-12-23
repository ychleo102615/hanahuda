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
  // InitialState Types (SSE-First)
  InitialStateResponseType,
  GameWaitingData,
  GameStartedData,
} from './shared'

// Commands
export type { TurnPlayHandCard, TurnSelectTarget, RoundMakeDecision } from './commands'

// Events
export type {
  BaseEvent,
  // InitialState (SSE-First)
  InitialStateData,
  InitialStateEvent,
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
  // SSE Event Types
  SSEEventType,
} from './events'

// SSE Event Types Constant (for runtime use)
export { SSE_EVENT_TYPES, EVENT_TYPES } from './events'
export type { EventTypeValue } from './events'
