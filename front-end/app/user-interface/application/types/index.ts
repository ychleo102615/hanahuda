/**
 * Application Layer Types Barrel File
 *
 * @description
 * 匯出所有 Application Layer 的型別定義，
 * 提供統一的導入入口。
 *
 * 共用型別從 ~/shared/types 重新匯出，
 * 確保前後端型別一致。
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

// ============================================
// Re-export from #shared/types (前後端共用)
// ============================================

// Flow State
export type { FlowState } from '#shared/types'
export { FlowStateEnum } from '#shared/types'

// Errors
export type { ErrorCode, GameErrorCode, SuggestedAction, RoundEndReason } from '#shared/types'
export { ERROR_MESSAGES, GAME_ERROR_MESSAGES, RECONNECTION_RETRY } from '#shared/types'

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
} from '#shared/types'

// Commands
export type { TurnPlayHandCard, TurnSelectTarget, RoundMakeDecision } from '#shared/types'

// Events
export type {
  BaseEvent,
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
  GameEvent,
} from '#shared/types'

// ============================================
// Frontend-specific types (不共用)
// ============================================

// Result Type (前端 Use Case 用)
export type { Result } from './result'

// Domain Facade (前端 Domain Layer 介面)
export type { DomainFacade } from './domain-facade'
