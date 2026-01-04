/**
 * Round Module - Domain Layer
 *
 * @description
 * Round 模組的統一匯出入口。
 * 提供向後兼容的 API，讓外部模組可以從單一位置 import 所有 round 相關函數。
 *
 * @module server/domain/round
 */

// Round 核心類型與建立
export type {
  Round,
  PlayerRoundState,
  PendingSelection,
  PendingDecision,
  CreateRoundParams,
  RoundSettlementInfo,
} from './round'
export { createRound } from './round'

// 查詢函數
export {
  getPlayerHand,
  getPlayerDepository,
  getOpponentId,
  isActivePlayer,
  getPlayerKoiStatus,
  canPlayerKoiKoi,
} from './roundQueries'

// 狀態偵測
export type { TeshiResult, KuttsukiResult, FieldTeshiResult } from './roundDetection'
export { detectTeshi, detectKuttsuki, detectFieldTeshi } from './roundDetection'

// 回合操作
export type {
  PlayHandCardResult,
  PlayHandCardOptions,
  DrawResult,
  SelectTargetResult,
  DecisionResult,
} from './roundOperations'
export {
  playHandCard,
  selectTarget,
  handleDecision,
  advanceToNextPlayer,
  setAwaitingDecision,
} from './roundOperations'

// 局結束邏輯
export type { RoundEndResult } from './roundEnd'
export {
  calculateRoundEndResult,
  calculateRoundDrawResult,
  calculateSpecialRuleEndResult,
} from './roundEnd'

// KoiStatus 相關（re-export from koiStatus）
export type { KoiStatus } from './koiStatus'
export { createInitialKoiStatus, applyKoiKoi } from './koiStatus'
