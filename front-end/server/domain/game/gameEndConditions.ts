/**
 * Game End Conditions - Domain Layer
 *
 * @description
 * 遊戲結束條件判斷與勝者計算。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/game/gameEndConditions
 */

import type { PlayerScore } from '#shared/contracts'
import type { Game } from './game'

/**
 * 遊戲勝者計算結果
 */
export interface GameWinnerResult {
  /** 勝者 ID（平局時為 null） */
  readonly winnerId: string | null
  /** 分差（絕對值） */
  readonly margin: number
  /** 最終分數 */
  readonly finalScores: readonly PlayerScore[]
}

/**
 * 判斷遊戲勝者
 *
 * @param game - 已結束的遊戲
 * @returns 勝者 ID（若平局則回傳 null）
 */
export function determineWinner(game: Game): string | null {
  if (game.cumulativeScores.length !== 2) {
    return null
  }

  const score1 = game.cumulativeScores[0]
  const score2 = game.cumulativeScores[1]

  if (!score1 || !score2) {
    return null
  }

  if (score1.score > score2.score) {
    return score1.player_id
  } else if (score2.score > score1.score) {
    return score2.player_id
  }

  return null // 平局
}

/**
 * 計算遊戲最終勝者
 *
 * 比較雙方累積分數，計算勝者和分差。
 *
 * @param game - 遊戲（通常為已結束或即將結束的遊戲）
 * @returns 勝者計算結果
 */
export function calculateWinner(game: Game): GameWinnerResult {
  const finalScores = game.cumulativeScores

  if (finalScores.length !== 2) {
    return {
      winnerId: null,
      margin: 0,
      finalScores,
    }
  }

  const score1 = finalScores[0]
  const score2 = finalScores[1]

  if (!score1 || !score2) {
    return {
      winnerId: null,
      margin: 0,
      finalScores,
    }
  }

  const margin = Math.abs(score1.score - score2.score)

  if (score1.score > score2.score) {
    return {
      winnerId: score1.player_id,
      margin,
      finalScores,
    }
  } else if (score2.score > score1.score) {
    return {
      winnerId: score2.player_id,
      margin,
      finalScores,
    }
  }

  // 平局
  return {
    winnerId: null,
    margin: 0,
    finalScores,
  }
}

/**
 * 檢查牌堆是否已空（局結束條件之一）
 *
 * @param game - 遊戲
 * @returns 牌堆是否已空
 */
export function isDeckEmpty(game: Game): boolean {
  if (!game.currentRound) {
    return true
  }
  return game.currentRound.deck.length === 0
}

/**
 * 檢查是否有玩家手牌已空
 *
 * @param game - 遊戲
 * @returns 是否有玩家手牌已空
 */
export function hasPlayerWithEmptyHand(game: Game): boolean {
  if (!game.currentRound) {
    return false
  }
  return game.currentRound.playerStates.some((ps) => ps.hand.length === 0)
}

/**
 * 檢查是否雙方玩家手牌都已空
 *
 * @param game - 遊戲
 * @returns 是否雙方手牌都為空
 */
export function haveBothPlayersEmptyHand(game: Game): boolean {
  if (!game.currentRound) {
    return false
  }
  return game.currentRound.playerStates.every((ps) => ps.hand.length === 0)
}

/**
 * 檢查是否應該結束局
 *
 * 花札規則：只有雙方手牌都打完時才結束局。
 * 標準規則下牌堆不會空（24張 - 16次翻牌 = 剩8張）。
 *
 * @param game - 遊戲
 * @returns 是否應該結束局
 */
export function shouldEndRound(game: Game): boolean {
  return haveBothPlayersEmptyHand(game)
}
