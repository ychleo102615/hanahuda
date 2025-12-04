/**
 * Application Layer Types Barrel File
 *
 * @description
 * 匯出所有 Application Layer 的型別定義，
 * 提供統一的導入入口。
 *
 * @example
 * ```typescript
 * import type {
 *   FlowState,
 *   Result,
 *   ErrorCode,
 *   GameStartedEvent,
 *   TurnPlayHandCard,
 *   DomainFacade
 * } from '~/user-interface/application/types'
 * ```
 */

// Flow State
export type { FlowState } from './flow-state'
export { FlowState as FlowStateEnum } from './flow-state'

// Result Type
export type { Result } from './result'

// Errors
export type { ErrorCode, RoundEndReason } from './errors'
export { ERROR_MESSAGES, RECONNECTION_RETRY } from './errors'

// Shared Data Structures
export type {
  PlayerInfo,
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
} from './shared'

// Commands
export type { TurnPlayHandCard, TurnSelectTarget, RoundMakeDecision } from './commands'

// Events
export type {
  GameStartedEvent,
  RoundDealtEvent,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  RoundScoredEvent,
  RoundDrawnEvent,
  RoundEndedInstantlyEvent,
  GameFinishedEvent,
  TurnErrorEvent,
  GameErrorEvent,
  GameSnapshotRestore,
} from './events'

// Domain Facade
export type { DomainFacade } from './domain-facade'
