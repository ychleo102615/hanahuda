/**
 * GameStateStore Unit Tests
 *
 * @description
 * 測試 GameStateStore 的所有 actions 與 getters
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStateStore, createUIStatePortAdapter } from '../../../src/user-interface/adapter/stores/gameState'
import type { PlayerInfo, Ruleset, GameSnapshotRestore } from '../../../src/user-interface/application/types'

describe('GameStateStore', () => {
  beforeEach(() => {
    // 建立新的 Pinia 實例
    setActivePinia(createPinia())
  })

  describe('初始狀態', () => {
    it('應該有正確的初始狀態', () => {
      const store = useGameStateStore()

      expect(store.gameId).toBeNull()
      expect(store.localPlayerId).toBeNull()
      expect(store.opponentPlayerId).toBeNull()
      expect(store.ruleset).toBeNull()
      expect(store.flowStage).toBeNull()
      expect(store.activePlayerId).toBeNull()
      expect(store.fieldCards).toEqual([])
      expect(store.myHandCards).toEqual([])
      expect(store.opponentHandCount).toBe(0)
      expect(store.myDepository).toEqual([])
      expect(store.opponentDepository).toEqual([])
      expect(store.deckRemaining).toBe(24)
      expect(store.myScore).toBe(0)
      expect(store.opponentScore).toBe(0)
      expect(store.myYaku).toEqual([])
      expect(store.opponentYaku).toEqual([])
      expect(store.koiKoiMultipliers).toEqual({})
    })
  })

  describe('initializeGameContext', () => {
    it('應該正確初始化遊戲上下文', () => {
      const store = useGameStateStore()

      const players: PlayerInfo[] = [
        { player_id: 'player-1', player_name: 'Alice', is_ai: false },
        { player_id: 'player-2', player_name: 'Bob', is_ai: true },
      ]

      const ruleset: Ruleset = {
        target_score: 100,
        yaku_settings: [],
        special_rules: {
          teshi_enabled: false,
          field_kuttsuki_enabled: false,
        },
      }

      store.initializeGameContext('game-123', players, ruleset)

      expect(store.gameId).toBe('game-123')
      expect(store.localPlayerId).toBe('player-1')
      expect(store.opponentPlayerId).toBe('player-2')
      expect(store.ruleset).toEqual(ruleset)
    })

    it('應該正確辨識本地玩家（非 AI）', () => {
      const store = useGameStateStore()

      const players: PlayerInfo[] = [
        { player_id: 'player-1', player_name: 'AI', is_ai: true },
        { player_id: 'player-2', player_name: 'Human', is_ai: false },
      ]

      const ruleset: Ruleset = {
        target_score: 100,
        yaku_settings: [],
        special_rules: {
          teshi_enabled: false,
          field_kuttsuki_enabled: false,
        },
      }

      store.initializeGameContext('game-123', players, ruleset)

      expect(store.localPlayerId).toBe('player-2')
      expect(store.opponentPlayerId).toBe('player-1')
    })
  })

  describe('restoreGameState', () => {
    it('應該正確恢復遊戲狀態', () => {
      const store = useGameStateStore()

      // 先初始化遊戲上下文
      store.initializeGameContext(
        'game-123',
        [
          { player_id: 'player-1', player_name: 'Alice', is_ai: false },
          { player_id: 'player-2', player_name: 'Bob', is_ai: true },
        ],
        {
          target_score: 100,
          yaku_settings: [],
          special_rules: { teshi_enabled: false, field_kuttsuki_enabled: false },
        },
      )

      const snapshot: GameSnapshotRestore = {
        game_id: 'game-123',
        players: [
          { player_id: 'player-1', player_name: 'Alice', is_ai: false },
          { player_id: 'player-2', player_name: 'Bob', is_ai: true },
        ],
        ruleset: {
          target_score: 100,
          yaku_settings: [],
          special_rules: { teshi_enabled: false, field_kuttsuki_enabled: false },
        },
        current_flow_stage: 'AWAITING_HAND_PLAY',
        active_player_id: 'player-1',
        field_cards: ['0111', '0112', '0113', '0114'],
        player_hands: [
          { player_id: 'player-1', cards: ['0121', '0122'] },
          { player_id: 'player-2', cards: ['0131', '0132'] },
        ],
        player_depositories: [
          { player_id: 'player-1', cards: ['0211', '0212'] },
          { player_id: 'player-2', cards: ['0221', '0222'] },
        ],
        deck_remaining: 20,
        player_scores: [
          { player_id: 'player-1', score: 10 },
          { player_id: 'player-2', score: 5 },
        ],
        koi_statuses: [
          { player_id: 'player-1', koi_multiplier: 2, times_continued: 1 },
          { player_id: 'player-2', koi_multiplier: 1, times_continued: 0 },
        ],
      }

      store.restoreGameState(snapshot)

      expect(store.gameId).toBe('game-123')
      expect(store.flowStage).toBe('AWAITING_HAND_PLAY')
      expect(store.activePlayerId).toBe('player-1')
      expect(store.fieldCards).toEqual(['0111', '0112', '0113', '0114'])
      expect(store.myHandCards).toEqual(['0121', '0122'])
      expect(store.opponentHandCount).toBe(2)
      expect(store.myDepository).toEqual(['0211', '0212'])
      expect(store.opponentDepository).toEqual(['0221', '0222'])
      expect(store.deckRemaining).toBe(20)
      expect(store.myScore).toBe(10)
      expect(store.opponentScore).toBe(5)
      expect(store.koiKoiMultipliers).toEqual({ 'player-1': 2, 'player-2': 1 })
    })
  })

  describe('setFlowStage', () => {
    it('應該正確設定流程階段', () => {
      const store = useGameStateStore()

      store.setFlowStage('AWAITING_HAND_PLAY')
      expect(store.flowStage).toBe('AWAITING_HAND_PLAY')

      store.setFlowStage('AWAITING_SELECTION')
      expect(store.flowStage).toBe('AWAITING_SELECTION')

      store.setFlowStage('AWAITING_DECISION')
      expect(store.flowStage).toBe('AWAITING_DECISION')
    })
  })

  describe('updateFieldCards', () => {
    it('應該正確更新場牌', () => {
      const store = useGameStateStore()

      store.updateFieldCards(['0111', '0112', '0113'])
      expect(store.fieldCards).toEqual(['0111', '0112', '0113'])

      store.updateFieldCards(['0121', '0122'])
      expect(store.fieldCards).toEqual(['0121', '0122'])
    })
  })

  describe('updateHandCards', () => {
    it('應該正確更新手牌', () => {
      const store = useGameStateStore()

      store.updateHandCards(['0211', '0212'])
      expect(store.myHandCards).toEqual(['0211', '0212'])

      store.updateHandCards(['0221'])
      expect(store.myHandCards).toEqual(['0221'])
    })
  })

  describe('updateDepositoryCards', () => {
    it('應該正確更新獲得區', () => {
      const store = useGameStateStore()

      store.updateDepositoryCards(['0311', '0312'], ['0321', '0322'])
      expect(store.myDepository).toEqual(['0311', '0312'])
      expect(store.opponentDepository).toEqual(['0321', '0322'])
    })
  })

  describe('updateScores', () => {
    it('應該正確更新分數', () => {
      const store = useGameStateStore()

      store.updateScores(10, 5)
      expect(store.myScore).toBe(10)
      expect(store.opponentScore).toBe(5)

      store.updateScores(20, 15)
      expect(store.myScore).toBe(20)
      expect(store.opponentScore).toBe(15)
    })
  })

  describe('updateDeckRemaining', () => {
    it('應該正確更新牌堆剩餘數量', () => {
      const store = useGameStateStore()

      expect(store.deckRemaining).toBe(24) // 初始值

      store.updateDeckRemaining(20)
      expect(store.deckRemaining).toBe(20)

      store.updateDeckRemaining(0)
      expect(store.deckRemaining).toBe(0)
    })
  })

  describe('updateKoiKoiMultiplier', () => {
    it('應該正確更新 Koi-Koi 倍率', () => {
      const store = useGameStateStore()

      store.updateKoiKoiMultiplier('player-1', 2)
      expect(store.koiKoiMultipliers['player-1']).toBe(2)

      store.updateKoiKoiMultiplier('player-2', 3)
      expect(store.koiKoiMultipliers['player-2']).toBe(3)
    })
  })

  describe('getLocalPlayerId', () => {
    it('應該返回本地玩家 ID', () => {
      const store = useGameStateStore()

      store.initializeGameContext(
        'game-123',
        [
          { player_id: 'player-1', player_name: 'Alice', is_ai: false },
          { player_id: 'player-2', player_name: 'Bob', is_ai: true },
        ],
        {
          target_score: 100,
          yaku_settings: [],
          special_rules: { teshi_enabled: false, field_kuttsuki_enabled: false },
        },
      )

      expect(store.getLocalPlayerId()).toBe('player-1')
    })

    it('應該在未初始化時拋出錯誤', () => {
      const store = useGameStateStore()

      expect(() => store.getLocalPlayerId()).toThrow('[GameStateStore] LocalPlayerId not initialized')
    })
  })

  describe('Getters', () => {
    it('isMyTurn 應該正確判斷是否為玩家回合', () => {
      const store = useGameStateStore()

      store.initializeGameContext(
        'game-123',
        [
          { player_id: 'player-1', player_name: 'Alice', is_ai: false },
          { player_id: 'player-2', player_name: 'Bob', is_ai: true },
        ],
        {
          target_score: 100,
          yaku_settings: [],
          special_rules: { teshi_enabled: false, field_kuttsuki_enabled: false },
        },
      )

      store.activePlayerId = 'player-1'
      expect(store.isMyTurn).toBe(true)

      store.activePlayerId = 'player-2'
      expect(store.isMyTurn).toBe(false)
    })

    it('currentFlowStage 應該返回當前流程階段', () => {
      const store = useGameStateStore()

      store.setFlowStage('AWAITING_HAND_PLAY')
      expect(store.currentFlowStage).toBe('AWAITING_HAND_PLAY')
    })

    it('myKoiKoiMultiplier 應該返回玩家倍率', () => {
      const store = useGameStateStore()

      store.initializeGameContext(
        'game-123',
        [
          { player_id: 'player-1', player_name: 'Alice', is_ai: false },
          { player_id: 'player-2', player_name: 'Bob', is_ai: true },
        ],
        {
          target_score: 100,
          yaku_settings: [],
          special_rules: { teshi_enabled: false, field_kuttsuki_enabled: false },
        },
      )

      expect(store.myKoiKoiMultiplier).toBe(1) // 預設為 1

      store.updateKoiKoiMultiplier('player-1', 3)
      expect(store.myKoiKoiMultiplier).toBe(3)
    })

    it('opponentKoiKoiMultiplier 應該返回對手倍率', () => {
      const store = useGameStateStore()

      store.initializeGameContext(
        'game-123',
        [
          { player_id: 'player-1', player_name: 'Alice', is_ai: false },
          { player_id: 'player-2', player_name: 'Bob', is_ai: true },
        ],
        {
          target_score: 100,
          yaku_settings: [],
          special_rules: { teshi_enabled: false, field_kuttsuki_enabled: false },
        },
      )

      expect(store.opponentKoiKoiMultiplier).toBe(1) // 預設為 1

      store.updateKoiKoiMultiplier('player-2', 2)
      expect(store.opponentKoiKoiMultiplier).toBe(2)
    })
  })

  describe('reset', () => {
    it('應該重置所有狀態', () => {
      const store = useGameStateStore()

      // 先設定一些狀態
      store.initializeGameContext(
        'game-123',
        [
          { player_id: 'player-1', player_name: 'Alice', is_ai: false },
          { player_id: 'player-2', player_name: 'Bob', is_ai: true },
        ],
        {
          target_score: 100,
          yaku_settings: [],
          special_rules: { teshi_enabled: false, field_kuttsuki_enabled: false },
        },
      )
      store.updateFieldCards(['0111', '0112'])
      store.updateScores(10, 5)

      // 重置
      store.reset()

      // 驗證所有狀態已重置
      expect(store.gameId).toBeNull()
      expect(store.localPlayerId).toBeNull()
      expect(store.opponentPlayerId).toBeNull()
      expect(store.ruleset).toBeNull()
      expect(store.flowStage).toBeNull()
      expect(store.activePlayerId).toBeNull()
      expect(store.fieldCards).toEqual([])
      expect(store.myHandCards).toEqual([])
      expect(store.opponentHandCount).toBe(0)
      expect(store.myDepository).toEqual([])
      expect(store.opponentDepository).toEqual([])
      expect(store.deckRemaining).toBe(24)
      expect(store.myScore).toBe(0)
      expect(store.opponentScore).toBe(0)
      expect(store.myYaku).toEqual([])
      expect(store.opponentYaku).toEqual([])
      expect(store.koiKoiMultipliers).toEqual({})
    })
  })

  describe('createUIStatePortAdapter', () => {
    it('應該建立正確的 UIStatePort Adapter', () => {
      const adapter = createUIStatePortAdapter()

      expect(adapter).toHaveProperty('initializeGameContext')
      expect(adapter).toHaveProperty('restoreGameState')
      expect(adapter).toHaveProperty('setFlowStage')
      expect(adapter).toHaveProperty('updateFieldCards')
      expect(adapter).toHaveProperty('updateHandCards')
      expect(adapter).toHaveProperty('updateDepositoryCards')
      expect(adapter).toHaveProperty('updateScores')
      expect(adapter).toHaveProperty('updateDeckRemaining')
      expect(adapter).toHaveProperty('updateKoiKoiMultiplier')
      expect(adapter).toHaveProperty('getLocalPlayerId')
    })

    it('Adapter 的方法應該正確調用 Store', () => {
      const adapter = createUIStatePortAdapter()

      adapter.updateFieldCards(['0111', '0112'])
      const store = useGameStateStore()
      expect(store.fieldCards).toEqual(['0111', '0112'])

      adapter.updateScores(10, 5)
      expect(store.myScore).toBe(10)
      expect(store.opponentScore).toBe(5)
    })
  })
})
