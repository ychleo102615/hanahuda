/**
 * Game Module - Domain Layer
 *
 * @description
 * Game 模組的統一匯出入口。
 * 提供向後兼容的 API，讓外部模組可以從單一位置 import 所有 game 相關函數。
 *
 * @module server/domain/game
 */

// Game 核心類型與生命週期管理
export type {
  Game,
  GameStatus,
  CreateGameParams,
} from './game'
export {
  getDefaultRuleset,
  createGame,
  addSecondPlayerAndStart,
  addAiOpponentAndStart,
  startRound,
  updateRound,
  finishRound,
  finishRoundDraw,
  finishGame,
} from './game'

// 查詢函數
export {
  getHumanPlayer,
  getAiPlayer,
  canContinue,
  getPlayerScore,
  isPlayerTurn,
  getCurrentFlowState,
  getActivePlayerId,
  getOpponentPlayer,
  getPlayerDepositoryFromGame,
} from './gameQueries'

// 結束條件與勝者計算
export type { GameWinnerResult } from './gameEndConditions'
export {
  determineWinner,
  calculateWinner,
  isDeckEmpty,
  hasPlayerWithEmptyHand,
  haveBothPlayersEmptyHand,
  shouldEndRound,
} from './gameEndConditions'

// 快照序列化
export type { GameSnapshot } from './gameSnapshot'
export { toSnapshot } from './gameSnapshot'

// Player 相關（re-export from player）
export type { Player } from './player'
export { createPlayer, createAiPlayer } from './player'
