/**
 * UIStateStore Unit Tests
 *
 * @description
 * 測試 UIStateStore 的所有 actions
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStateStore, createTriggerUIEffectPortAdapter } from '../../../src/user-interface/adapter/stores/uiState'
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
      expect(store.gameFinishedVisible).toBe(false)
      expect(store.gameFinishedData).toBeNull()
      expect(store.roundDrawnVisible).toBe(false)
      expect(store.roundDrawnScores).toEqual([])
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

  describe('showGameFinishedUI / hideGameFinishedUI', () => {
    it('應該正確顯示遊戲結束 UI', () => {
      const store = useUIStateStore()

      const finalScores: PlayerScore[] = [
        { player_id: 'player-1', score: 50 },
        { player_id: 'player-2', score: 30 },
      ]

      store.showGameFinishedUI('player-1', finalScores, true)

      expect(store.gameFinishedVisible).toBe(true)
      expect(store.gameFinishedData).toEqual({
        winnerId: 'player-1',
        finalScores,
        isPlayerWinner: true,
      })
    })

    it('應該正確隱藏遊戲結束 UI', () => {
      const store = useUIStateStore()

      store.showGameFinishedUI('player-1', [{ player_id: 'player-1', score: 50 }], true)
      store.hideGameFinishedUI()

      expect(store.gameFinishedVisible).toBe(false)
      expect(store.gameFinishedData).toBeNull()
    })
  })

  describe('showRoundDrawnUI / hideRoundDrawnUI', () => {
    it('應該正確顯示平局 UI', () => {
      const store = useUIStateStore()

      const scores: PlayerScore[] = [
        { player_id: 'player-1', score: 20 },
        { player_id: 'player-2', score: 20 },
      ]

      store.showRoundDrawnUI(scores)

      expect(store.roundDrawnVisible).toBe(true)
      expect(store.roundDrawnScores).toEqual(scores)
    })

    it('應該正確隱藏平局 UI', () => {
      const store = useUIStateStore()

      store.showRoundDrawnUI([
        { player_id: 'player-1', score: 20 },
        { player_id: 'player-2', score: 20 },
      ])
      store.hideRoundDrawnUI()

      expect(store.roundDrawnVisible).toBe(false)
      expect(store.roundDrawnScores).toEqual([])
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
      expect(store.gameFinishedVisible).toBe(false)
      expect(store.gameFinishedData).toBeNull()
      expect(store.roundDrawnVisible).toBe(false)
      expect(store.roundDrawnScores).toEqual([])
      expect(store.errorMessage).toBeNull()
      expect(store.infoMessage).toBeNull()
      expect(store.connectionStatus).toBe('disconnected')
      expect(store.reconnecting).toBe(false)
    })

    it('應該清除所有倒數計時器', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()

      // 啟動倒數
      store.startActionCountdown(30)
      store.startDisplayCountdown(5)

      expect(store.actionTimeoutRemaining).toBe(30)
      expect(store.displayTimeoutRemaining).toBe(5)

      // 重置
      store.reset()

      // 驗證倒數已清除
      expect(store.actionTimeoutRemaining).toBeNull()
      expect(store.displayTimeoutRemaining).toBeNull()

      // 快進時間，確認 interval 已停止
      vi.advanceTimersByTime(10000)
      expect(store.actionTimeoutRemaining).toBeNull()
      expect(store.displayTimeoutRemaining).toBeNull()

      vi.useRealTimers()
    })
  })

  describe('Countdown - startActionCountdown / stopActionCountdown', () => {
    it('應該正確啟動操作倒數', () => {
      const store = useUIStateStore()

      store.startActionCountdown(30)

      expect(store.actionTimeoutRemaining).toBe(30)
    })

    it('應該每秒遞減操作倒數', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()

      store.startActionCountdown(30)
      expect(store.actionTimeoutRemaining).toBe(30)

      // 快進 1 秒
      vi.advanceTimersByTime(1000)
      expect(store.actionTimeoutRemaining).toBe(29)

      // 快進 5 秒
      vi.advanceTimersByTime(5000)
      expect(store.actionTimeoutRemaining).toBe(24)

      vi.useRealTimers()
    })

    it('應該在倒數歸零時停止', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()

      store.startActionCountdown(3)
      expect(store.actionTimeoutRemaining).toBe(3)

      // 快進 3 秒
      vi.advanceTimersByTime(3000)
      expect(store.actionTimeoutRemaining).toBe(0)

      // 再快進，應該停止在 null（自動清除）
      vi.advanceTimersByTime(1000)
      expect(store.actionTimeoutRemaining).toBeNull()

      vi.useRealTimers()
    })

    it('應該正確停止操作倒數', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()

      store.startActionCountdown(30)
      expect(store.actionTimeoutRemaining).toBe(30)

      // 快進 5 秒
      vi.advanceTimersByTime(5000)
      expect(store.actionTimeoutRemaining).toBe(25)

      // 手動停止
      store.stopActionCountdown()
      expect(store.actionTimeoutRemaining).toBeNull()

      // 快進時間，確認不再遞減
      vi.advanceTimersByTime(10000)
      expect(store.actionTimeoutRemaining).toBeNull()

      vi.useRealTimers()
    })

    it('應該能夠重新啟動操作倒數（自動停止舊的）', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()

      // 第一次啟動
      store.startActionCountdown(30)
      expect(store.actionTimeoutRemaining).toBe(30)

      // 快進 5 秒
      vi.advanceTimersByTime(5000)
      expect(store.actionTimeoutRemaining).toBe(25)

      // 第二次啟動（應該停止舊的）
      store.startActionCountdown(20)
      expect(store.actionTimeoutRemaining).toBe(20)

      // 快進 5 秒
      vi.advanceTimersByTime(5000)
      expect(store.actionTimeoutRemaining).toBe(15)

      vi.useRealTimers()
    })
  })

  describe('Countdown - startDisplayCountdown / stopDisplayCountdown', () => {
    it('應該正確啟動顯示倒數', () => {
      const store = useUIStateStore()

      store.startDisplayCountdown(5)

      expect(store.displayTimeoutRemaining).toBe(5)
    })

    it('應該每秒遞減顯示倒數', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()

      store.startDisplayCountdown(5)
      expect(store.displayTimeoutRemaining).toBe(5)

      // 快進 1 秒
      vi.advanceTimersByTime(1000)
      expect(store.displayTimeoutRemaining).toBe(4)

      // 快進 2 秒
      vi.advanceTimersByTime(2000)
      expect(store.displayTimeoutRemaining).toBe(2)

      vi.useRealTimers()
    })

    it('應該在倒數歸零時執行回調並停止', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()
      const onComplete = vi.fn()

      store.startDisplayCountdown(2, onComplete)
      expect(store.displayTimeoutRemaining).toBe(2)

      // 快進 2 秒
      vi.advanceTimersByTime(2000)
      expect(store.displayTimeoutRemaining).toBe(0)

      // 再快進 1 秒，應該停止並執行回調
      vi.advanceTimersByTime(1000)
      expect(store.displayTimeoutRemaining).toBeNull()
      expect(onComplete).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })

    it('應該正確停止顯示倒數', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()
      const onComplete = vi.fn()

      store.startDisplayCountdown(5, onComplete)
      expect(store.displayTimeoutRemaining).toBe(5)

      // 快進 2 秒
      vi.advanceTimersByTime(2000)
      expect(store.displayTimeoutRemaining).toBe(3)

      // 手動停止
      store.stopDisplayCountdown()
      expect(store.displayTimeoutRemaining).toBeNull()

      // 快進時間，確認回調不被執行
      vi.advanceTimersByTime(10000)
      expect(onComplete).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('應該支援無回調的顯示倒數', () => {
      vi.useFakeTimers()
      const store = useUIStateStore()

      store.startDisplayCountdown(2)
      expect(store.displayTimeoutRemaining).toBe(2)

      // 快進到歸零
      vi.advanceTimersByTime(3000)
      expect(store.displayTimeoutRemaining).toBeNull()

      vi.useRealTimers()
    })
  })

  describe('createTriggerUIEffectPortAdapter', () => {
    it('應該建立正確的 TriggerUIEffectPort Adapter', () => {
      const mockAnimationService = {
        trigger: vi.fn(),
      }

      const adapter = createTriggerUIEffectPortAdapter(mockAnimationService)

      expect(adapter).toHaveProperty('showDecisionModal')
      expect(adapter).toHaveProperty('showErrorMessage')
      expect(adapter).toHaveProperty('showReconnectionMessage')
      expect(adapter).toHaveProperty('triggerAnimation')
      expect(adapter).toHaveProperty('showGameFinishedUI')
      expect(adapter).toHaveProperty('showRoundDrawnUI')
    })

    it('Adapter 的方法應該正確調用 Store', () => {
      const mockAnimationService = {
        trigger: vi.fn(),
      }

      const adapter = createTriggerUIEffectPortAdapter(mockAnimationService)
      const store = useUIStateStore()

      adapter.showErrorMessage('Test error')
      expect(store.errorMessage).toBe('Test error')
    })

    it('Adapter 的 triggerAnimation 應該委派給 AnimationService', () => {
      const mockAnimationService = {
        trigger: vi.fn(),
      }

      const adapter = createTriggerUIEffectPortAdapter(mockAnimationService)

      adapter.triggerAnimation('DEAL_CARDS', {
        fieldCards: ['0111', '0112'],
        hands: [{ player_id: 'player-1', cards: ['0121', '0122'] }],
      })

      expect(mockAnimationService.trigger).toHaveBeenCalledWith('DEAL_CARDS', {
        fieldCards: ['0111', '0112'],
        hands: [{ player_id: 'player-1', cards: ['0121', '0122'] }],
      })
    })
  })
})
