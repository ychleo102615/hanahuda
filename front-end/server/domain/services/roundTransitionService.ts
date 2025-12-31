/**
 * Round Transition Service - Domain Layer
 *
 * @description
 * 處理局結束後的遊戲狀態轉換邏輯。
 * 判斷是否繼續下一局或結束遊戲，並更新遊戲狀態。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/services/roundTransitionService
 */

import {
  canContinue,
  startRound,
  finishRound,
  finishRoundDraw,
  finishGame,
  calculateWinner,
  type Game,
  type GameWinnerResult,
} from '../game'

/**
 * 局轉換類型
 */
export type RoundTransitionType = 'NEXT_ROUND' | 'GAME_FINISHED'

/**
 * 局轉換結果
 */
export interface RoundTransitionResult {
  /** 更新後的遊戲狀態 */
  readonly game: Game
  /** 轉換類型 */
  readonly transitionType: RoundTransitionType
  /** 遊戲勝者資訊（僅當 transitionType === 'GAME_FINISHED' 時有值） */
  readonly winner: GameWinnerResult | null
}

/**
 * 處理有勝者的局結束後的遊戲轉換
 *
 * @param game - 目前遊戲狀態
 * @param winnerId - 本局勝者 ID
 * @param score - 本局得分
 * @returns 局轉換結果
 */
export function transitionAfterRoundScored(
  game: Game,
  winnerId: string,
  score: number
): RoundTransitionResult {
  // 結束本局並更新分數
  let updatedGame = finishRound(game, winnerId, score)

  // 檢查是否可以繼續下一局
  if (canContinue(updatedGame)) {
    // 開始新局
    updatedGame = startRound(updatedGame)

    return {
      game: updatedGame,
      transitionType: 'NEXT_ROUND',
      winner: null,
    }
  } else {
    // 遊戲結束
    const winner = calculateWinner(updatedGame)

    return {
      game: updatedGame,
      transitionType: 'GAME_FINISHED',
      winner,
    }
  }
}

/**
 * 處理平局（無勝者）的局結束後的遊戲轉換
 *
 * @param game - 目前遊戲狀態
 * @returns 局轉換結果
 */
export function transitionAfterRoundDraw(game: Game): RoundTransitionResult {
  // 結束本局（無得分）
  let updatedGame = finishRoundDraw(game)

  // 檢查是否可以繼續下一局
  if (canContinue(updatedGame)) {
    // 開始新局
    updatedGame = startRound(updatedGame)

    return {
      game: updatedGame,
      transitionType: 'NEXT_ROUND',
      winner: null,
    }
  } else {
    // 遊戲結束
    const winner = calculateWinner(updatedGame)

    return {
      game: updatedGame,
      transitionType: 'GAME_FINISHED',
      winner,
    }
  }
}

/**
 * 處理玩家離開後的遊戲轉換
 *
 * @param game - 目前遊戲狀態
 * @param leavingPlayerId - 離開的玩家 ID
 * @returns 局轉換結果（遊戲立即結束，對手獲勝）
 */
export function transitionAfterPlayerLeave(
  game: Game,
  leavingPlayerId: string
): RoundTransitionResult {
  // 找出對手 ID
  const opponentId = game.players.find((p) => p.id !== leavingPlayerId)?.id ?? null

  // 強制結束遊戲
  const updatedGame = finishGame(game, opponentId ?? undefined)

  // 計算勝者（對手獲勝）
  const finalScores = game.cumulativeScores
  const winner: GameWinnerResult = {
    winnerId: opponentId,
    margin: 0, // 離開時不計算分差
    finalScores,
  }

  return {
    game: updatedGame,
    transitionType: 'GAME_FINISHED',
    winner,
  }
}

/**
 * 判斷遊戲是否可以繼續下一局
 *
 * @param game - 遊戲狀態
 * @returns 是否可以繼續
 */
export function canGameContinue(game: Game): boolean {
  return canContinue(game)
}

/**
 * 從 ROUND_ENDED 狀態完成局轉換
 *
 * @description
 * 當局處於 ROUND_ENDED 狀態（結算展示倒數結束後）時，
 * 執行實際的局轉換：finishRound() 並開始下一局或結束遊戲。
 *
 * 此函數在 RoundEnded 倒數結束時被調用，負責：
 * 1. 從 settlementInfo 取得結算資訊
 * 2. 執行 finishRound() 或 finishRoundDraw()
 * 3. 判斷是否繼續下一局
 * 4. 返回 RoundTransitionResult
 *
 * @param game - 處於 ROUND_ENDED 狀態的遊戲
 * @returns 局轉換結果
 * @throws 若 currentRound 不在 ROUND_ENDED 狀態
 */
export function finalizeRoundAndTransition(game: Game): RoundTransitionResult {
  if (!game.currentRound) {
    throw new Error('Cannot finalize: no current round')
  }

  if (game.currentRound.flowState !== 'ROUND_ENDED') {
    throw new Error(`Cannot finalize: round not in ROUND_ENDED state, current: ${game.currentRound.flowState}`)
  }

  const settlementInfo = game.currentRound.settlementInfo
  if (!settlementInfo) {
    throw new Error('Cannot finalize: no settlement info available')
  }

  // 根據結算資訊執行實際的局結束
  let updatedGame: Game

  if (settlementInfo.winnerId && settlementInfo.awardedPoints > 0) {
    // 有勝者且有得分
    updatedGame = finishRound(game, settlementInfo.winnerId, settlementInfo.awardedPoints)
  } else {
    // 平局或特殊規則無得分
    updatedGame = finishRoundDraw(game)
  }

  // 檢查是否可以繼續下一局
  if (canContinue(updatedGame)) {
    // 開始新局
    updatedGame = startRound(updatedGame)

    return {
      game: updatedGame,
      transitionType: 'NEXT_ROUND',
      winner: null,
    }
  } else {
    // 遊戲結束
    const winner = calculateWinner(updatedGame)

    return {
      game: updatedGame,
      transitionType: 'GAME_FINISHED',
      winner,
    }
  }
}
