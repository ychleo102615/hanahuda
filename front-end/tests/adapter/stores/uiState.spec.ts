/**
 * UIStateStore Unit Tests
 *
 * @description
 * 測試 UIStateStore 的所有 actions
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStateStore } from '../../../src/user-interface/adapter/stores/uiState'
import type { YakuScore, PlayerScore } from '../../../src/user-interface/application/types'

describe('UIStateStore', () => {
  beforeEach(() => {
    // 建立新的 Pinia 實例
    setActivePinia(createPinia())
    // 清除所有 timers
    vi.clearAllTimers()
  })

  describe('初始狀態', () => {
    it('應該有正確的初始狀態', () => {
      const store = useUIStateStore()

      expect(store.decisionModalVisible).toBe(false)
      expect(store.decisionModalData).toBeNull()
      expect(store.gameFinishedModalVisible).toBe(false)
      expect(store.gameFinishedModalData).toBeNull()
      expect(store.roundDrawnModalVisible).toBe(false)
      expect(store.roundDrawnModalScores).toEqual([])
      expect(store.errorMessage).toBeNull()
      expect(store.infoMessage).toBeNull()
      expect(store.connectionStatus).toBe('disconnected')
      expect(store.reconnecting).toBe(false)
    })
  })

  describe('showDecisionModal / hideDecisionModal', () => {
    it('應該正確顯示 Koi-Koi 決策 Modal', () => {
      const store = useUIStateStore()

      const currentYaku: YakuScore[] = [
        { yaku_type: 'INOU_SHIKO', base_points: 5 },
        { yaku_type: 'TANE_ZAKU', base_points: 1 },
      ]

      store.showDecisionModal(currentYaku, 6, 12)

      expect(store.decisionModalVisible).toBe(true)
      expect(store.decisionModalData).toEqual({
        currentYaku,
        currentScore: 6,
        potentialScore: 12,
      })
    })

    it('應該正確隱藏 Koi-Koi 決策 Modal', () => {
      const store = useUIStateStore()

      store.showDecisionModal([{ yaku_type: 'INOU_SHIKO', base_points: 5 }], 5)
      store.hideDecisionModal()

      expect(store.decisionModalVisible).toBe(false)
      expect(store.decisionModalData).toBeNull()
    })

    it('應該支援無 potentialScore 的決策 Modal', () => {
      const store = useUIStateStore()

      const currentYaku: YakuScore[] = [{ yaku_type: 'TANE_ZAKU', base_points: 1 }]

      store.showDecisionModal(currentYaku, 1)

      expect(store.decisionModalVisible).toBe(true)
      expect(store.decisionModalData?.potentialScore).toBeUndefined()
    })
  })

  describe('showErrorMessage', () => {
    it('應該正確顯示錯誤訊息', () => {
      const store = useUIStateStore()

      store.showErrorMessage('This card is not in your hand')

      expect(store.errorMessage).toBe('This card is not in your hand')
    })

    it('應該在 3 秒後自動清除錯誤訊息', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()

      store.showErrorMessage('Test error')
      expect(store.errorMessage).toBe('Test error')

      // 快進 3 秒
      vi.advanceTimersByTime(3000)

      expect(store.errorMessage).toBeNull()

      vi.useRealTimers()
    })
  })

  describe('showReconnectionMessage / hideReconnectionMessage', () => {
    it('應該正確顯示重連訊息', () => {
      const store = useUIStateStore()

      store.showReconnectionMessage()

      expect(store.reconnecting).toBe(true)
      expect(store.infoMessage).toBe('連線中斷，正在嘗試重連...')
    })

    it('應該正確隱藏重連訊息', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()

      store.showReconnectionMessage()
      store.hideReconnectionMessage()

      expect(store.reconnecting).toBe(false)
      expect(store.infoMessage).toBe('連線已恢復')

      // 快進 3 秒
      vi.advanceTimersByTime(3000)

      expect(store.infoMessage).toBeNull()

      vi.useRealTimers()
    })
  })

  describe('showGameFinishedModal / hideGameFinishedUI', () => {
    it('應該正確顯示遊戲結束 UI', () => {
      const store = useUIStateStore()

      const finalScores: PlayerScore[] = [
        { player_id: 'player-1', score: 50 },
        { player_id: 'player-2', score: 30 },
      ]

      store.showGameFinishedModal('player-1', finalScores, true)

      expect(store.gameFinishedModalVisible).toBe(true)
      expect(store.gameFinishedModalData).toEqual({
        winnerId: 'player-1',
        finalScores,
        isPlayerWinner: true,
      })
    })

    it('應該正確隱藏遊戲結束 UI', () => {
      const store = useUIStateStore()

      store.showGameFinishedModal('player-1', [{ player_id: 'player-1', score: 50 }], true)
      store.hideGameFinishedModal()

      expect(store.gameFinishedModalVisible).toBe(false)
      expect(store.gameFinishedModalData).toBeNull()
    })
  })

  describe('showRoundDrawnModal / hideRoundDrawnUI', () => {
    it('應該正確顯示平局 UI', () => {
      const store = useUIStateStore()

      const scores: PlayerScore[] = [
        { player_id: 'player-1', score: 20 },
        { player_id: 'player-2', score: 20 },
      ]

      store.showRoundDrawnModal(scores)

      expect(store.roundDrawnModalVisible).toBe(true)
      expect(store.roundDrawnModalScores).toEqual(scores)
    })

    it('應該正確隱藏平局 UI', () => {
      const store = useUIStateStore()

      store.showRoundDrawnModal([
        { player_id: 'player-1', score: 20 },
        { player_id: 'player-2', score: 20 },
      ])
      store.hideRoundDrawnModal()

      expect(store.roundDrawnModalVisible).toBe(false)
      expect(store.roundDrawnModalScores).toEqual([])
    })
  })

  describe('setConnectionStatus', () => {
    it('應該正確設定連線狀態', () => {
      const store = useUIStateStore()

      expect(store.connectionStatus).toBe('disconnected')

      store.setConnectionStatus('connecting')
      expect(store.connectionStatus).toBe('connecting')

      store.setConnectionStatus('connected')
      expect(store.connectionStatus).toBe('connected')

      store.setConnectionStatus('disconnected')
      expect(store.connectionStatus).toBe('disconnected')
    })
  })

  describe('reset', () => {
    it('應該重置所有狀態', () => {
      const store = useUIStateStore()

      // 先設定一些狀態
      store.showDecisionModal([{ yaku_type: 'INOU_SHIKO', base_points: 5 }], 5)
      store.showErrorMessage('Test error')
      store.setConnectionStatus('connected')
      store.reconnecting = true

      // 重置
      store.reset()

      // 驗證所有狀態已重置
      expect(store.decisionModalVisible).toBe(false)
      expect(store.decisionModalData).toBeNull()
      expect(store.gameFinishedModalVisible).toBe(false)
      expect(store.gameFinishedModalData).toBeNull()
      expect(store.roundDrawnModalVisible).toBe(false)
      expect(store.roundDrawnModalScores).toEqual([])
      expect(store.errorMessage).toBeNull()
      expect(store.infoMessage).toBeNull()
      expect(store.connectionStatus).toBe('disconnected')
      expect(store.reconnecting).toBe(false)
    })

    it('應該清除倒數計時狀態', () => {
      const store = useUIStateStore()

      // 設定倒數狀態
      store.actionTimeoutRemaining = 30
      store.displayTimeoutRemaining = 5

      expect(store.actionTimeoutRemaining).toBe(30)
      expect(store.displayTimeoutRemaining).toBe(5)

      // 重置
      store.reset()

      // 驗證倒數狀態已清除
      expect(store.actionTimeoutRemaining).toBeNull()
      expect(store.displayTimeoutRemaining).toBeNull()
    })
  })
})
