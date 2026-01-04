/**
 * Game Aggregate Tests
 *
 * @description
 * Game 聚合根的單元測試。
 * 測試遊戲建立、玩家加入、回合管理和遊戲狀態轉換。
 *
 * @module server/__tests__/domain/game/game.test
 */

import { describe, it, expect } from 'vitest'
import {
  createGame,
  addSecondPlayerAndStart,
  startRound,
  updateRound,
  finishRound,
  finishRoundDraw,
  finishGame,
  getDefaultRuleset,
  createPlayer,
} from '~/server/core-game/domain/game'
import {
  createTestWaitingGame,
  createTestInProgressGame,
  PLAYER_1_ID,
  PLAYER_2_ID,
  GAME_ID,
  DEFAULT_RULESET,
  createTestRound,
} from '../../fixtures/games'

describe('Game Aggregate', () => {
  describe('createGame', () => {
    it('應建立 WAITING 狀態的遊戲', () => {
      const player = createPlayer({ id: PLAYER_1_ID, name: 'Player 1', isAi: false })
      const game = createGame({
        id: GAME_ID,
        player,
      })

      expect(game.id).toBe(GAME_ID)
      expect(game.status).toBe('WAITING')
      expect(game.players).toHaveLength(1)
      expect(game.players[0]?.id).toBe(PLAYER_1_ID)
    })

    it('應初始化累積分數為 0', () => {
      const player = createPlayer({ id: PLAYER_1_ID, name: 'Player 1', isAi: false })
      const game = createGame({
        id: GAME_ID,
        player,
      })

      expect(game.cumulativeScores).toHaveLength(1)
      expect(game.cumulativeScores[0]?.player_id).toBe(PLAYER_1_ID)
      expect(game.cumulativeScores[0]?.score).toBe(0)
    })

    it('應初始化連線狀態為 CONNECTED', () => {
      const player = createPlayer({ id: PLAYER_1_ID, name: 'Player 1', isAi: false })
      const game = createGame({
        id: GAME_ID,
        player,
      })

      expect(game.playerConnectionStatuses).toHaveLength(1)
      expect(game.playerConnectionStatuses[0]?.status).toBe('CONNECTED')
    })

    it('應使用提供的規則集', () => {
      const player = createPlayer({ id: PLAYER_1_ID, name: 'Player 1', isAi: false })
      const customRuleset = { ...DEFAULT_RULESET, total_rounds: 6 }
      const game = createGame({
        id: GAME_ID,
        player,
        ruleset: customRuleset,
      })

      expect(game.totalRounds).toBe(6)
    })

    it('未提供規則集時應使用預設值', () => {
      const player = createPlayer({ id: PLAYER_1_ID, name: 'Player 1', isAi: false })
      const game = createGame({
        id: GAME_ID,
        player,
      })

      // 預設房間類型為 QUICK (2 局)
      expect(game.totalRounds).toBe(2)
    })
  })

  describe('addSecondPlayerAndStart', () => {
    it('應將遊戲狀態改為 IN_PROGRESS', () => {
      const waitingGame = createTestWaitingGame()
      const player2 = createPlayer({ id: PLAYER_2_ID, name: 'Player 2', isAi: false })

      const game = addSecondPlayerAndStart(waitingGame, player2)

      expect(game.status).toBe('IN_PROGRESS')
    })

    it('應加入第二位玩家', () => {
      const waitingGame = createTestWaitingGame()
      const player2 = createPlayer({ id: PLAYER_2_ID, name: 'Player 2', isAi: false })

      const game = addSecondPlayerAndStart(waitingGame, player2)

      expect(game.players).toHaveLength(2)
      expect(game.players[1]?.id).toBe(PLAYER_2_ID)
    })

    it('應初始化第二位玩家的分數', () => {
      const waitingGame = createTestWaitingGame()
      const player2 = createPlayer({ id: PLAYER_2_ID, name: 'Player 2', isAi: false })

      const game = addSecondPlayerAndStart(waitingGame, player2)

      expect(game.cumulativeScores).toHaveLength(2)
      expect(game.cumulativeScores[1]?.player_id).toBe(PLAYER_2_ID)
      expect(game.cumulativeScores[1]?.score).toBe(0)
    })

    it('非 WAITING 狀態應拋出錯誤', () => {
      const inProgressGame = createTestInProgressGame()
      const player = createPlayer({ id: 'player-3', name: 'Player 3', isAi: false })

      expect(() => addSecondPlayerAndStart(inProgressGame, player)).toThrow(
        'Cannot add player to game with status: IN_PROGRESS'
      )
    })

    it('已有 2 位玩家應拋出錯誤', () => {
      const fullGame = createTestWaitingGame({
        players: [
          { id: PLAYER_1_ID, name: 'Player 1', isAi: false },
          { id: PLAYER_2_ID, name: 'Player 2', isAi: false },
        ],
      })
      const player = createPlayer({ id: 'player-3', name: 'Player 3', isAi: false })

      expect(() => addSecondPlayerAndStart(fullGame, player)).toThrow(
        'Expected 1 player'
      )
    })
  })

  describe('startRound', () => {
    it('應建立新的 currentRound', () => {
      const game = createTestInProgressGame({ currentRound: null })

      const updatedGame = startRound(game)

      expect(updatedGame.currentRound).not.toBeNull()
    })

    it('應發牌給兩位玩家', () => {
      const game = createTestInProgressGame({ currentRound: null })

      const updatedGame = startRound(game)

      expect(updatedGame.currentRound?.playerStates).toHaveLength(2)
      expect(updatedGame.currentRound?.playerStates[0]?.hand).toHaveLength(8)
      expect(updatedGame.currentRound?.playerStates[1]?.hand).toHaveLength(8)
    })

    it('場牌應有 8 張', () => {
      const game = createTestInProgressGame({ currentRound: null })

      const updatedGame = startRound(game)

      expect(updatedGame.currentRound?.field).toHaveLength(8)
    })

    it('牌堆應有 24 張', () => {
      const game = createTestInProgressGame({ currentRound: null })

      const updatedGame = startRound(game)

      expect(updatedGame.currentRound?.deck).toHaveLength(24)
    })

    it('莊家應輪替', () => {
      // 第一局（roundsPlayed = 0）: 玩家 1 為莊家
      const game0 = createTestInProgressGame({ roundsPlayed: 0, currentRound: null })
      const round0 = startRound(game0)
      expect(round0.currentRound?.dealerId).toBe(PLAYER_1_ID)

      // 第二局（roundsPlayed = 1）: 玩家 2 為莊家
      const game1 = createTestInProgressGame({ roundsPlayed: 1, currentRound: null })
      const round1 = startRound(game1)
      expect(round1.currentRound?.dealerId).toBe(PLAYER_2_ID)
    })

    it('非 IN_PROGRESS 狀態應拋出錯誤', () => {
      const waitingGame = createTestWaitingGame()

      expect(() => startRound(waitingGame)).toThrow(
        'Cannot start round for game with status: WAITING'
      )
    })

    it('使用測試牌組應產生固定順序', () => {
      const game = createTestInProgressGame({ currentRound: null })

      const round1 = startRound(game, true)
      const round2 = startRound(game, true)

      expect(round1.currentRound?.deck).toEqual(round2.currentRound?.deck)
    })
  })

  describe('updateRound', () => {
    it('應更新 currentRound', () => {
      const game = createTestInProgressGame()
      const newRound = createTestRound({ flowState: 'AWAITING_SELECTION' })

      const updatedGame = updateRound(game, newRound)

      expect(updatedGame.currentRound?.flowState).toBe('AWAITING_SELECTION')
    })

    it('非 IN_PROGRESS 狀態應拋出錯誤', () => {
      const waitingGame = createTestWaitingGame()
      const round = createTestRound()

      expect(() => updateRound(waitingGame, round)).toThrow(
        'Cannot update round for game with status: WAITING'
      )
    })
  })

  describe('finishRound', () => {
    it('應增加 roundsPlayed', () => {
      const game = createTestInProgressGame({ roundsPlayed: 0 })

      const updatedGame = finishRound(game, PLAYER_1_ID, 10)

      expect(updatedGame.roundsPlayed).toBe(1)
    })

    it('應更新勝者分數', () => {
      const game = createTestInProgressGame()

      const updatedGame = finishRound(game, PLAYER_1_ID, 15)

      const playerScore = updatedGame.cumulativeScores.find(
        (s) => s.player_id === PLAYER_1_ID
      )
      expect(playerScore?.score).toBe(15)
    })

    it('應清除 currentRound', () => {
      const game = createTestInProgressGame()

      const updatedGame = finishRound(game, PLAYER_1_ID, 10)

      expect(updatedGame.currentRound).toBeNull()
    })

    it('達到總局數應將狀態改為 FINISHED', () => {
      const game = createTestInProgressGame({
        roundsPlayed: 11,
        totalRounds: 12,
      })

      const updatedGame = finishRound(game, PLAYER_1_ID, 10)

      expect(updatedGame.status).toBe('FINISHED')
    })

    it('未達到總局數應維持 IN_PROGRESS', () => {
      const game = createTestInProgressGame({
        roundsPlayed: 5,
        totalRounds: 12,
      })

      const updatedGame = finishRound(game, PLAYER_1_ID, 10)

      expect(updatedGame.status).toBe('IN_PROGRESS')
    })
  })

  describe('finishRoundDraw', () => {
    it('應增加 roundsPlayed', () => {
      const game = createTestInProgressGame({ roundsPlayed: 0 })

      const updatedGame = finishRoundDraw(game)

      expect(updatedGame.roundsPlayed).toBe(1)
    })

    it('不應改變分數', () => {
      const game = createTestInProgressGame({
        cumulativeScores: [
          { player_id: PLAYER_1_ID, score: 10 },
          { player_id: PLAYER_2_ID, score: 5 },
        ],
      })

      const updatedGame = finishRoundDraw(game)

      expect(updatedGame.cumulativeScores[0]?.score).toBe(10)
      expect(updatedGame.cumulativeScores[1]?.score).toBe(5)
    })

    it('應清除 currentRound', () => {
      const game = createTestInProgressGame()

      const updatedGame = finishRoundDraw(game)

      expect(updatedGame.currentRound).toBeNull()
    })
  })

  describe('finishGame', () => {
    it('應將狀態改為 FINISHED', () => {
      const game = createTestInProgressGame()

      const updatedGame = finishGame(game)

      expect(updatedGame.status).toBe('FINISHED')
    })

    it('應清除 currentRound', () => {
      const game = createTestInProgressGame()

      const updatedGame = finishGame(game)

      expect(updatedGame.currentRound).toBeNull()
    })
  })

  describe('getDefaultRuleset', () => {
    it('應返回預設規則集', () => {
      const ruleset = getDefaultRuleset()

      // 預設房間類型為 QUICK (2 局)
      expect(ruleset.total_rounds).toBe(2)
      expect(ruleset.yaku_settings).toBeDefined()
      expect(ruleset.special_rules).toBeDefined()
    })
  })

  describe('createPlayer', () => {
    it('應建立人類玩家', () => {
      const player = createPlayer({
        id: PLAYER_1_ID,
        name: 'Human Player',
        isAi: false,
      })

      expect(player.id).toBe(PLAYER_1_ID)
      expect(player.name).toBe('Human Player')
      expect(player.isAi).toBe(false)
    })

    it('應建立 AI 玩家', () => {
      const player = createPlayer({
        id: 'ai-player',
        name: 'AI Opponent',
        isAi: true,
      })

      expect(player.isAi).toBe(true)
    })
  })
})
