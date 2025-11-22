/**
 * DeckZone 組件測試
 *
 * T030 [US3] - 測試 DeckZone 剩餘牌數顯示
 * T031 [US3] - 測試 DeckZone 視覺堆疊效果
 *
 * 測試重點：
 * 1. 剩餘牌數正確顯示
 * 2. 視覺堆疊層數根據剩餘牌數變化
 * 3. visualLayers getter 正確計算
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// 先定義 mock，再 import 組件
vi.mock('@/components/SvgIcon.vue', () => ({
  default: {
    name: 'SvgIcon',
    props: ['name', 'className'],
    template: '<div class="mock-svg-icon" :data-name="name"></div>',
  },
}))

import DeckZone from '@/views/GamePage/components/DeckZone.vue'
import { useGameStateStore } from '@/user-interface/adapter/stores/gameState'

describe('DeckZone Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('T030 - 剩餘牌數顯示', () => {
    it('should display deck remaining count', async () => {
      const gameState = useGameStateStore()
      gameState.deckRemaining = 24

      const wrapper = mount(DeckZone)
      expect(wrapper.text()).toContain('24')
    })

    it('should update display when deckRemaining changes', async () => {
      const gameState = useGameStateStore()
      gameState.deckRemaining = 24

      const wrapper = mount(DeckZone)
      expect(wrapper.text()).toContain('24')

      gameState.deckRemaining = 16
      await nextTick()

      expect(wrapper.text()).toContain('16')
    })

    it('should display 0 when deck is empty', async () => {
      const gameState = useGameStateStore()
      gameState.deckRemaining = 0

      const wrapper = mount(DeckZone)
      expect(wrapper.text()).toContain('0')
    })
  })

  describe('T031 - 視覺堆疊效果', () => {
    it('should calculate 4 visual layers when remaining >= 16', () => {
      const gameState = useGameStateStore()

      gameState.deckRemaining = 24
      expect(gameState.visualLayers).toBe(4)

      gameState.deckRemaining = 16
      expect(gameState.visualLayers).toBe(4)
    })

    it('should calculate 3 visual layers when remaining >= 8 and < 16', () => {
      const gameState = useGameStateStore()

      gameState.deckRemaining = 15
      expect(gameState.visualLayers).toBe(3)

      gameState.deckRemaining = 8
      expect(gameState.visualLayers).toBe(3)
    })

    it('should calculate 2 visual layers when remaining >= 1 and < 8', () => {
      const gameState = useGameStateStore()

      gameState.deckRemaining = 7
      expect(gameState.visualLayers).toBe(2)

      gameState.deckRemaining = 1
      expect(gameState.visualLayers).toBe(2)
    })

    it('should calculate 1 visual layer when remaining is 0', () => {
      const gameState = useGameStateStore()
      gameState.deckRemaining = 0
      expect(gameState.visualLayers).toBe(1)
    })

    it('should render correct number of stacked layers', async () => {
      const gameState = useGameStateStore()
      gameState.deckRemaining = 24

      const wrapper = mount(DeckZone)
      const layers = wrapper.findAll('[data-testid="deck-layer"]')
      expect(layers.length).toBe(4)
    })

    it('should update visual layers when deck count decreases', async () => {
      const gameState = useGameStateStore()
      gameState.deckRemaining = 16

      const wrapper = mount(DeckZone)
      let layers = wrapper.findAll('[data-testid="deck-layer"]')
      expect(layers.length).toBe(4)

      gameState.deckRemaining = 7
      await nextTick()

      layers = wrapper.findAll('[data-testid="deck-layer"]')
      expect(layers.length).toBe(2)
    })
  })

  describe('DeckState Integration', () => {
    it('should use visualLayers getter from GameStateStore', () => {
      const gameState = useGameStateStore()
      gameState.deckRemaining = 24

      expect(gameState.visualLayers).toBe(4)
      expect(gameState.deckRemaining).toBe(24)
    })
  })
})
