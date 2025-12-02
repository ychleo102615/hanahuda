/**
 * DecisionModal Unit Tests
 *
 * @description
 * 測試 DecisionModal 組件的倒數顯示功能
 * - T018 [US2]: 測試決策面板顯示倒數計時器
 * - T021 [US2]: 測試玩家做出決策後 stopActionCountdown() 被正確調用
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DecisionModal from '../../src/views/GamePage/components/DecisionModal.vue'
import { useUIStateStore } from '../../src/user-interface/adapter/stores/uiState'
import { useGameStateStore } from '../../src/user-interface/adapter/stores/gameState'
import { TOKENS } from '../../src/user-interface/adapter/di/tokens'
import { container } from '../../src/user-interface/adapter/di/container'
import type { MakeKoiKoiDecisionPort } from '../../src/user-interface/application/ports/input'

describe('DecisionModal - Countdown Display', () => {
  let mockMakeKoiKoiDecisionPort: MakeKoiKoiDecisionPort

  beforeEach(() => {
    // 建立新的 Pinia 實例
    setActivePinia(createPinia())

    // 模擬 MakeKoiKoiDecisionPort
    mockMakeKoiKoiDecisionPort = {
      execute: vi.fn(),
    }

    // Mock container.resolve()
    vi.spyOn(container, 'resolve').mockImplementation((token) => {
      if (token === TOKENS.MakeKoiKoiDecisionPort) {
        return mockMakeKoiKoiDecisionPort
      }
      throw new Error(`Unmocked dependency: ${token.toString()}`)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('倒數顯示測試 (T018)', () => {
    it('應該在決策面板中顯示倒數計時器', async () => {
      const uiState = useUIStateStore()
      const gameState = useGameStateStore()

      // 設定遊戲狀態
      gameState.localPlayerId = 'player-1'
      gameState.koiKoiMultipliers = { 'player-1': 1 }
      gameState.myDepository = ['0111', '0112']

      // 顯示決策面板並啟動倒數
      uiState.showDecisionModal(
        [{ yaku_type: 'INOU_SHIKO', base_points: 5 }],
        5,
        10
      )
      uiState.startActionCountdown(15)

      const wrapper = mount(DecisionModal, {
        attachTo: document.body
      })

      // 等待組件渲染
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // 驗證倒數顯示（在 document.body 中查找）
      const countdownElement = document.querySelector('[data-testid="decision-countdown"]')
      expect(countdownElement).not.toBeNull()
      expect(countdownElement?.textContent?.trim()).toBe('15')
      expect(uiState.actionTimeoutRemaining).toBe(15)

      // 清理
      wrapper.unmount()
    })

    it('應該在倒數低於 5 秒時顯示警示色', async () => {
      const uiState = useUIStateStore()
      const gameState = useGameStateStore()

      gameState.localPlayerId = 'player-1'
      gameState.koiKoiMultipliers = { 'player-1': 1 }
      gameState.myDepository = ['0111', '0112']

      uiState.showDecisionModal(
        [{ yaku_type: 'INOU_SHIKO', base_points: 5 }],
        5,
        10
      )
      uiState.startActionCountdown(4)

      const wrapper = mount(DecisionModal, {
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // 查找倒數顯示元素
      const countdownElement = document.querySelector('[data-testid="decision-countdown"]') as HTMLElement
      expect(countdownElement).not.toBeNull()
      expect(countdownElement.className).toContain('text-red-500')

      wrapper.unmount()
    })

    it('應該在倒數大於 5 秒時不顯示警示色', async () => {
      const uiState = useUIStateStore()
      const gameState = useGameStateStore()

      gameState.localPlayerId = 'player-1'
      gameState.koiKoiMultipliers = { 'player-1': 1 }
      gameState.myDepository = ['0111', '0112']

      uiState.showDecisionModal(
        [{ yaku_type: 'INOU_SHIKO', base_points: 5 }],
        5,
        10
      )
      uiState.startActionCountdown(10)

      const wrapper = mount(DecisionModal, {
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const countdownElement = document.querySelector('[data-testid="decision-countdown"]') as HTMLElement
      expect(countdownElement).not.toBeNull()
      expect(countdownElement.className).not.toContain('text-red-500')
      expect(countdownElement.className).toContain('text-white')

      wrapper.unmount()
    })

    it('應該在沒有倒數時隱藏倒數顯示', async () => {
      const uiState = useUIStateStore()
      const gameState = useGameStateStore()

      gameState.localPlayerId = 'player-1'
      gameState.koiKoiMultipliers = { 'player-1': 1 }
      gameState.myDepository = ['0111', '0112']

      uiState.showDecisionModal(
        [{ yaku_type: 'INOU_SHIKO', base_points: 5 }],
        5,
        10
      )

      const wrapper = mount(DecisionModal, {
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // 沒有倒數時，倒數元素不應該存在
      const countdownElement = document.querySelector('[data-testid="decision-countdown"]')
      expect(countdownElement).toBeNull()

      wrapper.unmount()
    })
  })

  describe('stopActionCountdown 調用測試 (T021)', () => {
    it('應該在玩家選擇 Koi-Koi 後停止倒數', async () => {
      const uiState = useUIStateStore()
      const gameState = useGameStateStore()

      gameState.localPlayerId = 'player-1'
      gameState.koiKoiMultipliers = { 'player-1': 1 }
      gameState.myDepository = ['0111', '0112']

      uiState.showDecisionModal(
        [{ yaku_type: 'INOU_SHIKO', base_points: 5 }],
        5,
        10
      )
      uiState.startActionCountdown(15)

      const wrapper = mount(DecisionModal, {
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // 間諜 stopActionCountdown 方法
      const stopSpy = vi.spyOn(uiState, 'stopActionCountdown')

      // 點擊 Koi-Koi 按鈕（在 document.body 中查找）
      const buttons = Array.from(document.querySelectorAll('button'))
      const koiKoiButton = buttons.find((btn) => btn.textContent?.includes('Koi-Koi'))
      expect(koiKoiButton).toBeDefined()
      koiKoiButton!.click()

      await wrapper.vm.$nextTick()

      // 驗證 stopActionCountdown 被調用
      expect(stopSpy).toHaveBeenCalledTimes(1)
      expect(uiState.decisionModalVisible).toBe(false)

      wrapper.unmount()
    })

    it('應該在玩家選擇 End Round 後停止倒數', async () => {
      const uiState = useUIStateStore()
      const gameState = useGameStateStore()

      gameState.localPlayerId = 'player-1'
      gameState.koiKoiMultipliers = { 'player-1': 1 }
      gameState.myDepository = ['0111', '0112']

      uiState.showDecisionModal(
        [{ yaku_type: 'INOU_SHIKO', base_points: 5 }],
        5,
        10
      )
      uiState.startActionCountdown(15)

      const wrapper = mount(DecisionModal, {
        attachTo: document.body
      })

      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // 間諜 stopActionCountdown 方法
      const stopSpy = vi.spyOn(uiState, 'stopActionCountdown')

      // 點擊 End Round 按鈕（在 document.body 中查找）
      const buttons = Array.from(document.querySelectorAll('button'))
      const endRoundButton = buttons.find((btn) => btn.textContent?.includes('End Round'))
      expect(endRoundButton).toBeDefined()
      endRoundButton!.click()

      await wrapper.vm.$nextTick()

      // 驗證 stopActionCountdown 被調用
      expect(stopSpy).toHaveBeenCalledTimes(1)
      expect(uiState.decisionModalVisible).toBe(false)

      wrapper.unmount()
    })
  })
})
