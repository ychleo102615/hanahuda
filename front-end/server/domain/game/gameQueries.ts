/**
 * Game Queries - Domain Layer
 *
 * @description
 * Game 聚合根的查詢函數。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/game/gameQueries
 */

import type { FlowState } from '#shared/contracts'
import type { Game } from './game'
import type { Player } from './player'

/**
 * 取得人類玩家
 *
 * @param game - 遊戲
 * @returns 人類玩家（若找不到則回傳 null）
 */
export function getHumanPlayer(game: Game): Player | null {
  return game.players.find((p) => !p.isAi) ?? null
}

/**
 * 取得 AI 玩家
 *
 * @param game - 遊戲
 * @returns AI 玩家（若找不到則回傳 null）
 */
export function getAiPlayer(game: Game): Player | null {
  return game.players.find((p) => p.isAi) ?? null
}

/**
 * 檢查遊戲是否可以繼續（有足夠局數）
 *
 * @param game - 遊戲
 * @returns 是否可以繼續
 */
export function canContinue(game: Game): boolean {
  return game.status === 'IN_PROGRESS' && game.roundsPlayed < game.totalRounds
}

/**
 * 檢查當前是否為最後一局
 *
 * @description
 * 用於判斷當前回合結束後是否還能繼續遊戲。
 * 當 roundsPlayed + 1 >= totalRounds 時，表示這是最後一局。
 *
 * @param game - 遊戲
 * @returns 是否為最後一局
 */
export function isLastRound(game: Game): boolean {
  return game.roundsPlayed + 1 >= game.totalRounds
}

/**
 * 取得玩家累積分數
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 玩家累積分數（若找不到則回傳 0）
 */
export function getPlayerScore(game: Game, playerId: string): number {
  const score = game.cumulativeScores.find((s) => s.player_id === playerId)
  return score?.score ?? 0
}

/**
 * 檢查是否為指定玩家的回合
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 是否為該玩家的回合
 */
export function isPlayerTurn(game: Game, playerId: string): boolean {
  if (game.status !== 'IN_PROGRESS' || !game.currentRound) {
    return false
  }
  return game.currentRound.activePlayerId === playerId
}

/**
 * 取得目前流程狀態
 *
 * @param game - 遊戲
 * @returns 目前的 FlowState（若遊戲未進行中則回傳 null）
 */
export function getCurrentFlowState(game: Game): FlowState | null {
  if (game.status !== 'IN_PROGRESS' || !game.currentRound) {
    return null
  }
  return game.currentRound.flowState
}

/**
 * 取得目前行動玩家 ID
 *
 * @param game - 遊戲
 * @returns 目前行動玩家 ID（若遊戲未進行中則回傳 null）
 */
export function getActivePlayerId(game: Game): string | null {
  if (game.status !== 'IN_PROGRESS' || !game.currentRound) {
    return null
  }
  return game.currentRound.activePlayerId
}

/**
 * 取得對手玩家
 *
 * @param game - 遊戲
 * @param playerId - 目前玩家 ID
 * @returns 對手玩家（若找不到則回傳 null）
 */
export function getOpponentPlayer(game: Game, playerId: string): Player | null {
  return game.players.find((p) => p.id !== playerId) ?? null
}

/**
 * 取得玩家的獲得區（透過 Game 取得）
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 玩家獲得區（若找不到則回傳空陣列）
 */
export function getPlayerDepositoryFromGame(game: Game, playerId: string): readonly string[] {
  if (!game.currentRound) {
    return []
  }
  const playerState = game.currentRound.playerStates.find((ps) => ps.playerId === playerId)
  return playerState?.depository ?? []
}
