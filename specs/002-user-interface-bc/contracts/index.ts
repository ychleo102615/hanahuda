/**
 * User Interface BC - Domain Layer Type Contracts
 *
 * 統一導出所有 Domain Layer 型別定義
 */

// Card types
export type { Card, CardType } from './card.types'
export { CARD_POINTS, CARD_TYPE_CODE } from './card.types'

// Yaku types
export type { YakuScore, YakuType, YakuProgress } from './yaku.types'
export { YAKU_BASE_POINTS, YAKU_DISPLAY_NAMES } from './yaku.types'

// Opponent analysis types
export type {
  ThreatLevel,
  ThreatLevelType,
  CardDistribution,
  OpponentYakuAnalysis,
} from './opponent.types'

// Game progress types
export type {
  ScoreGapAnalysis,
  AdvantageStatus,
  StrategyType,
} from './progress.types'
