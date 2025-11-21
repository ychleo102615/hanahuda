/**
 * GameStatePort 單元測試
 *
 * T019 [US2] - 測試 GameStatePort 介面定義（原 UIStatePort 重新命名）
 *
 * 測試重點：
 * 1. Port 介面符合 data-model.md 定義
 * 2. 所有狀態更新方法皆可呼叫
 * 3. 查詢方法返回正確類型
 */

import { describe, it, expect, vi } from 'vitest'

import type { GameStatePort } from '@/user-interface/application/ports/output/game-state.port'

describe('GameStatePort Interface', () => {
  describe('Initialization Methods', () => {
    it('should define initializeGameContext method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      expect(mockPort.initializeGameContext).toBeDefined()
      expect(typeof mockPort.initializeGameContext).toBe('function')
    })

    it('initializeGameContext should accept gameId, players, and ruleset', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      const players = [
        { player_id: 'p1', player_name: 'Alice', is_ai: false },
        { player_id: 'p2', player_name: 'Bot', is_ai: true },
      ]
      const ruleset = {
        target_score: 100,
        yaku_settings: [],
        special_rules: { teshi_enabled: false, field_kuttsuki_enabled: false },
      }

      mockPort.initializeGameContext('game-123', players, ruleset)

      expect(mockPort.initializeGameContext).toHaveBeenCalledWith('game-123', players, ruleset)
    })

    it('should define restoreGameState method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      expect(mockPort.restoreGameState).toBeDefined()
      expect(typeof mockPort.restoreGameState).toBe('function')
    })
  })

  describe('State Update Methods', () => {
    it('should define setFlowStage method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      mockPort.setFlowStage('AWAITING_HAND_PLAY')

      expect(mockPort.setFlowStage).toHaveBeenCalledWith('AWAITING_HAND_PLAY')
    })

    it('should define setActivePlayer method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      mockPort.setActivePlayer('player-2')

      expect(mockPort.setActivePlayer).toHaveBeenCalledWith('player-2')
    })

    it('should define updateFieldCards method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      mockPort.updateFieldCards(['0101', '0102', '0201'])

      expect(mockPort.updateFieldCards).toHaveBeenCalledWith(['0101', '0102', '0201'])
    })

    it('should define updateHandCards method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      mockPort.updateHandCards(['0301', '0302', '0401'])

      expect(mockPort.updateHandCards).toHaveBeenCalledWith(['0301', '0302', '0401'])
    })

    it('should define updateOpponentHandCount method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      mockPort.updateOpponentHandCount(7)

      expect(mockPort.updateOpponentHandCount).toHaveBeenCalledWith(7)
    })

    it('should define updateDepositoryCards method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      mockPort.updateDepositoryCards(['0101'], ['0201'])

      expect(mockPort.updateDepositoryCards).toHaveBeenCalledWith(['0101'], ['0201'])
    })

    it('should define updateScores method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      mockPort.updateScores(10, 5)

      expect(mockPort.updateScores).toHaveBeenCalledWith(10, 5)
    })

    it('should define updateDeckRemaining method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      mockPort.updateDeckRemaining(20)

      expect(mockPort.updateDeckRemaining).toHaveBeenCalledWith(20)
    })

    it('should define updateYaku method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      const playerYaku = [{ yaku_type: 'INOU_SHIKO', base_points: 5 }]
      const opponentYaku = [{ yaku_type: 'TANE_ZAKU', base_points: 1 }]

      mockPort.updateYaku(playerYaku, opponentYaku)

      expect(mockPort.updateYaku).toHaveBeenCalledWith(playerYaku, opponentYaku)
    })
  })

  describe('Query Methods', () => {
    it('should define getLocalPlayerId method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      expect(mockPort.getLocalPlayerId).toBeDefined()
      expect(typeof mockPort.getLocalPlayerId).toBe('function')
    })

    it('getLocalPlayerId should return string', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-123'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      const result = mockPort.getLocalPlayerId()

      expect(typeof result).toBe('string')
      expect(result).toBe('player-123')
    })

    it('should define getFieldCards method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue(['0101', '0201']),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      const result = mockPort.getFieldCards()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual(['0101', '0201'])
    })

    it('should define getDepositoryCards method', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue(['0101', '0102']),
      }

      const result = mockPort.getDepositoryCards('player-1')

      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual(['0101', '0102'])
    })

    it('getDepositoryCards should accept playerId parameter', () => {
      const mockPort: GameStatePort = {
        initializeGameContext: vi.fn(),
        restoreGameState: vi.fn(),
        setFlowStage: vi.fn(),
        setActivePlayer: vi.fn(),
        updateFieldCards: vi.fn(),
        updateHandCards: vi.fn(),
        updateOpponentHandCount: vi.fn(),
        updateDepositoryCards: vi.fn(),
        updateScores: vi.fn(),
        updateDeckRemaining: vi.fn(),
        updateYaku: vi.fn(),
        getLocalPlayerId: vi.fn().mockReturnValue('player-1'),
        getFieldCards: vi.fn().mockReturnValue([]),
        getDepositoryCards: vi.fn().mockReturnValue([]),
      }

      mockPort.getDepositoryCards('player-2')

      expect(mockPort.getDepositoryCards).toHaveBeenCalledWith('player-2')
    })
  })
})
