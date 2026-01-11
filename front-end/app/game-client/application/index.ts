/**
 * User Interface BC - Application Layer
 *
 * @description
 * Application Layer 公開 API 匯出入口。
 *
 * 包含：
 * - Types: Protocol 型別、錯誤型別、Result 型別等（40+ 個）
 * - Ports: Input Ports (18 個) + Output Ports (3 個)
 * - Use Cases: 將在 Phase 3-5 實作（18 個）
 *
 * @example
 * ```typescript
 * // 導入型別
 * import type {
 *   FlowState,
 *   GameStartedEvent,
 *   TurnPlayHandCard,
 *   DomainFacade
 * } from '~/game-client/application'
 *
 * // 導入 Ports
 * import type {
 *   SendCommandPort,
 *   UIStatePort,
 *   PlayHandCardPort,
 *   HandleGameStartedPort
 * } from '~/game-client/application'
 *
 * // 導入常數
 * import { ERROR_MESSAGES, FlowStateEnum } from '~/game-client/application'
 * ```
 */

// ============================================================================
// Types
// ============================================================================

// Application Layer 專屬型別
export type { Result } from './types/result'
export type { DomainFacade } from './types/domain-facade'

// 共用型別（從 #shared/contracts 重新匯出）
export type {
  // Flow State
  FlowState,
  // Errors
  ErrorCode,
  RoundEndReason,
  // Shared Data Structures
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
  // Commands
  TurnPlayHandCard,
  TurnSelectTarget,
  RoundMakeDecision,
  // Events
  GameStartedEvent,
  RoundDealtEvent,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  RoundEndedEvent,
  GameFinishedEvent,
  TurnErrorEvent,
  GameSnapshotRestore,
} from '#shared/contracts'

// Constants（從 #shared/contracts 重新匯出）
export { ERROR_MESSAGES, RECONNECTION_RETRY, FlowStateEnum } from '#shared/contracts'

// ============================================================================
// Ports
// ============================================================================

export type {
  // Output Ports
  SendCommandPort,
  UIStatePort,
  GameStatePort,
  AnimationPort,
  NotificationPort,
  DealAnimationParams,
  // Input Ports - Player Operations (3)
  PlayHandCardPort,
  PlayHandCardInput,
  PlayHandCardOutput,
  SelectMatchTargetPort,
  SelectMatchTargetInput,
  SelectMatchTargetOutput,
  MakeKoiKoiDecisionPort,
  MakeKoiKoiDecisionInput,
  MakeKoiKoiDecisionOutput,
  // Input Ports - Event Handlers (13)
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
} from './ports'

// ============================================================================
// Use Cases
// ============================================================================

// Player Operations (User Story 1)
export { PlayHandCardUseCase } from './use-cases/player-operations'
export { SelectMatchTargetUseCase } from './use-cases/player-operations'
export { MakeKoiKoiDecisionUseCase } from './use-cases/player-operations'

// Event Handlers (User Story 2)
export { HandleGameStartedUseCase } from './use-cases/event-handlers'
export { HandleRoundDealtUseCase } from './use-cases/event-handlers'
export { HandleTurnCompletedUseCase } from './use-cases/event-handlers'
export { HandleSelectionRequiredUseCase } from './use-cases/event-handlers'
export { HandleTurnProgressAfterSelectionUseCase } from './use-cases/event-handlers'
export { HandleDecisionRequiredUseCase } from './use-cases/event-handlers'
export { HandleDecisionMadeUseCase } from './use-cases/event-handlers'
export { HandleRoundEndedUseCase } from './use-cases/event-handlers'
export { HandleGameFinishedUseCase } from './use-cases/event-handlers'
export { HandleTurnErrorUseCase } from './use-cases/event-handlers'
