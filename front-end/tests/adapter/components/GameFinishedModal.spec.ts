/**
 * GameFinishedModal Component Tests
 *
 * @description
 * 測試遊戲結束 Modal 的顯示邏輯和互動
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import GameFinishedModal from '../../../src/views/GamePage/components/GameFinishedModal.vue'
import { useUIStateStore } from '../../../src/user-interface/adapter/stores/uiState'
import { useGameStateStore } from '../../../src/user-interface/adapter/stores/gameState'

// Create mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/game', component: { template: '<div>Game</div>' } },
  ],
})

describe('GameFinishedModal', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    router.push('/game')
    await router.isReady()
  })

  const mountComponent = () => {
    return mount(GameFinishedModal, {
      global: {
        plugins: [router],
      },
    })
  }

  it('should not be visible when gameFinishedVisible is false', () => {
    const uiStore = useUIStateStore()
    uiStore.gameFinishedVisible = false

    const wrapper = mountComponent()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('should be visible when gameFinishedVisible is true with data', () => {
    const uiStore = useUIStateStore()
    uiStore.showGameFinishedModal(
      'player-1',
      [
        { player_id: 'player-1', score: 10 },
        { player_id: 'player-2', score: 5 },
      ],
      true
    )

    const wrapper = mountComponent()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })

  it('should display victory message when player wins', () => {
    const uiStore = useUIStateStore()
    uiStore.showGameFinishedModal(
      'player-1',
      [
        { player_id: 'player-1', score: 10 },
        { player_id: 'player-2', score: 5 },
      ],
      true
    )

    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Victory!')
    expect(wrapper.text()).toContain('Congratulations! You won the game!')
  })

  it('should display game over message when player loses', () => {
    const uiStore = useUIStateStore()
    const gameStore = useGameStateStore()
    gameStore.localPlayerId = 'player-1'
    gameStore.opponentPlayerId = 'player-2'

    uiStore.showGameFinishedModal(
      'player-2',
      [
        { player_id: 'player-1', score: 5 },
        { player_id: 'player-2', score: 10 },
      ],
      false
    )

    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Game Over')
    expect(wrapper.text()).toContain('Opponent won the game')
  })

  it('should display final scores', () => {
    const uiStore = useUIStateStore()
    const gameStore = useGameStateStore()
    gameStore.localPlayerId = 'player-1'
    gameStore.opponentPlayerId = 'player-2'

    uiStore.showGameFinishedModal(
      'player-1',
      [
        { player_id: 'player-1', score: 15 },
        { player_id: 'player-2', score: 8 },
      ],
      true
    )

    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Final Scores')
    expect(wrapper.text()).toContain('15')
    expect(wrapper.text()).toContain('8')
    expect(wrapper.text()).toContain('You')
    expect(wrapper.text()).toContain('Opponent')
  })

  it('should close modal when close button is clicked', async () => {
    const uiStore = useUIStateStore()
    uiStore.showGameFinishedModal(
      'player-1',
      [{ player_id: 'player-1', score: 10 }],
      true
    )

    const wrapper = mountComponent()

    const closeButton = wrapper.find('button:first-of-type')
    await closeButton.trigger('click')

    expect(uiStore.gameFinishedVisible).toBe(false)
  })

  it('should navigate to home when new game button is clicked', async () => {
    const uiStore = useUIStateStore()

    uiStore.showGameFinishedModal(
      'player-1',
      [{ player_id: 'player-1', score: 10 }],
      true
    )

    const routerPushSpy = vi.spyOn(router, 'push')

    const wrapper = mountComponent()

    const newGameButton = wrapper.findAll('button').at(1)
    await newGameButton?.trigger('click')

    expect(routerPushSpy).toHaveBeenCalledWith('/')
    expect(uiStore.gameFinishedVisible).toBe(false)
  })

  it('should have proper accessibility attributes', () => {
    const uiStore = useUIStateStore()
    uiStore.showGameFinishedModal(
      'player-1',
      [{ player_id: 'player-1', score: 10 }],
      true
    )

    const wrapper = mountComponent()
    const dialog = wrapper.find('[role="dialog"]')

    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBe('game-finished-title')
  })

  it('should display winner crown for winning player', () => {
    const uiStore = useUIStateStore()
    uiStore.showGameFinishedModal(
      'player-1',
      [
        { player_id: 'player-1', score: 10 },
        { player_id: 'player-2', score: 5 },
      ],
      true
    )

    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('👑 Winner')
  })

  it('should close when clicking backdrop', async () => {
    const uiStore = useUIStateStore()
    uiStore.showGameFinishedModal(
      'player-1',
      [{ player_id: 'player-1', score: 10 }],
      true
    )

    const wrapper = mountComponent()
    const backdrop = wrapper.find('[role="dialog"]')

    await backdrop.trigger('click')

    expect(uiStore.gameFinishedVisible).toBe(false)
  })
})
