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
 * } from '@/user-interface/application'
 *
 * // 導入 Ports
 * import type {
 *   SendCommandPort,
 *   UpdateUIStatePort,
 *   PlayHandCardPort,
 *   HandleGameStartedPort
 * } from '@/user-interface/application'
 *
 * // 導入常數
 * import { ERROR_MESSAGES, FlowStateEnum } from '@/user-interface/application'
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Flow State
  FlowState,
  // Result Type
  Result,
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
  RoundScoredEvent,
  RoundDrawnEvent,
  RoundEndedInstantlyEvent,
  GameFinishedEvent,
  TurnErrorEvent,
  GameSnapshotRestore,
  // Domain Facade
  DomainFacade,
} from './types'

// Constants
export { ERROR_MESSAGES, RECONNECTION_RETRY, FlowStateEnum } from './types'

// ============================================================================
// Ports
// ============================================================================

export type {
  // Output Ports (3)
  SendCommandPort,
  UpdateUIStatePort,
  TriggerUIEffectPort,
  AnimationType,
  AnimationParams,
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
  // Input Ports - Event Handlers (15)
  HandleGameStartedPort,
  HandleRoundDealtPort,
  HandleTurnCompletedPort,
  HandleSelectionRequiredPort,
  HandleTurnProgressAfterSelectionPort,
  HandleDecisionRequiredPort,
  HandleDecisionMadePort,
  HandleRoundScoredPort,
  HandleRoundDrawnPort,
  HandleRoundEndedInstantlyPort,
  HandleGameFinishedPort,
  HandleTurnErrorPort,
  HandleReconnectionPort,
} from './ports'

// ============================================================================
// Use Cases (將在 Phase 3-5 實作)
// ============================================================================

// TODO: Phase 3 - User Story 1 (玩家操作流程)
// export { PlayHandCardUseCase } from './use-cases/player-operations'
// export { SelectMatchTargetUseCase } from './use-cases/player-operations'
// export { MakeKoiKoiDecisionUseCase } from './use-cases/player-operations'

// TODO: Phase 4 - User Story 2 (SSE 遊戲事件處理)
// export { HandleGameStartedUseCase } from './use-cases/event-handlers'
// export { HandleRoundDealtUseCase } from './use-cases/event-handlers'
// ... (13 more event handlers)

// TODO: Phase 5 - User Story 3 (錯誤處理與重連機制)
// Integration & Edge Case Testing
