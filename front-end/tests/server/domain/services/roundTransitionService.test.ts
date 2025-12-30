/**
 * RoundTransitionService Tests
 *
 * @description
 * 回合轉換服務的單元測試。
 * 測試局結束後的遊戲狀態轉換邏輯。
 *
 * @module server/__tests__/domain/services/roundTransitionService.test
 */

import { describe, it, expect } from 'vitest'
import {
  transitionAfterRoundScored,
  transitionAfterRoundDraw,
  transitionAfterPlayerLeave,
  canGameContinue,
} from '~/server/domain/services/roundTransitionService'
import {
  createTestInProgressGame,
  createMidGameState,
  createLastRoundGame,
  PLAYER_1_ID,
  PLAYER_2_ID,
  GAME_ID,
} from '../../fixtures/games'

describe('roundTransitionService', () => {
  describe('transitionAfterRoundScored', () => {
    it('中途局應繼續下一局', () => {
      const game = createMidGameState(5) // 已打 5 局

      const result = transitionAfterRoundScored(game, PLAYER_1_ID, 10)

      expect(result.transitionType).toBe('NEXT_ROUND')
      expect(result.winner).toBeNull()
      expect(result.game.roundsPlayed).toBe(6)
      expect(result.game.status).toBe('IN_PROGRESS')
      expect(result.game.currentRound).not.toBeNull() // 開始了新局
    })

    it('最後一局應結束遊戲', () => {
      const game = createLastRoundGame() // 已打 11 局，共 12 局

      const result = transitionAfterRoundScored(game, PLAYER_1_ID, 10)

      expect(result.transitionType).toBe('GAME_FINISHED')
      expect(result.winner).not.toBeNull()
      expect(result.game.roundsPlayed).toBe(12)
      expect(result.game.status).toBe('FINISHED')
      expect(result.game.currentRound).toBeNull()
    })

    it('應正確更新累積分數', () => {
      const game = createTestInProgressGame()

      const result = transitionAfterRoundScored(game, PLAYER_1_ID, 15)

      const playerScore = result.game.cumulativeScores.find(
        (s) => s.player_id === PLAYER_1_ID
      )
      expect(playerScore?.score).toBe(15)
    })

    it('高分勝者應被正確記錄', () => {
      const game = createMidGameState(11) // 最後一局

      const result = transitionAfterRoundScored(game, PLAYER_1_ID, 20)

      expect(result.winner?.winnerId).toBe(PLAYER_1_ID)
    })
  })

  describe('transitionAfterRoundDraw', () => {
    it('中途局平局應繼續下一局', () => {
      const game = createMidGameState(5)

      const result = transitionAfterRoundDraw(game)

      expect(result.transitionType).toBe('NEXT_ROUND')
      expect(result.winner).toBeNull()
      expect(result.game.roundsPlayed).toBe(6)
      expect(result.game.status).toBe('IN_PROGRESS')
    })

    it('最後一局平局應結束遊戲', () => {
      const game = createLastRoundGame()

      const result = transitionAfterRoundDraw(game)

      expect(result.transitionType).toBe('GAME_FINISHED')
      expect(result.game.roundsPlayed).toBe(12)
      expect(result.game.status).toBe('FINISHED')
    })

    it('平局不應改變分數', () => {
      const game = createMidGameState(5)
      const scoresBefore = game.cumulativeScores

      const result = transitionAfterRoundDraw(game)

      // 分數應與之前相同
      result.game.cumulativeScores.forEach((score, index) => {
        expect(score.score).toBe(scoresBefore[index]?.score)
      })
    })
  })

  describe('transitionAfterPlayerLeave', () => {
    it('玩家離開應結束遊戲', () => {
      const game = createTestInProgressGame()

      const result = transitionAfterPlayerLeave(game, PLAYER_1_ID)

      expect(result.transitionType).toBe('GAME_FINISHED')
      expect(result.game.status).toBe('FINISHED')
      expect(result.game.currentRound).toBeNull()
    })

    it('對手應獲勝', () => {
      const game = createTestInProgressGame()

      const result = transitionAfterPlayerLeave(game, PLAYER_1_ID)

      expect(result.winner?.winnerId).toBe(PLAYER_2_ID)
    })

    it('另一方離開時另一方對手獲勝', () => {
      const game = createTestInProgressGame()

      const result = transitionAfterPlayerLeave(game, PLAYER_2_ID)

      expect(result.winner?.winnerId).toBe(PLAYER_1_ID)
    })

    it('分差應為 0', () => {
      const game = createTestInProgressGame()

      const result = transitionAfterPlayerLeave(game, PLAYER_1_ID)

      expect(result.winner?.margin).toBe(0)
    })
  })

  describe('canGameContinue', () => {
    it('尚有剩餘局數應可繼續', () => {
      const game = createMidGameState(5)

      expect(canGameContinue(game)).toBe(true)
    })

    it('已完成所有局數應不可繼續', () => {
      const game = createTestInProgressGame({
        roundsPlayed: 12,
        totalRounds: 12,
      })

      expect(canGameContinue(game)).toBe(false)
    })

    it('只差一局應可繼續', () => {
      const game = createLastRoundGame() // 11/12

      expect(canGameContinue(game)).toBe(true)
    })

    it('第一局應可繼續', () => {
      const game = createTestInProgressGame({
        roundsPlayed: 0,
      })

      expect(canGameContinue(game)).toBe(true)
    })
  })
})
