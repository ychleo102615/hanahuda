/**
 * TopInfoBar - Unit Tests
 *
 * Tests for opponent turn countdown display (User Story 4)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TopInfoBar from '../../src/views/GamePage/components/TopInfoBar.vue'
import { useGameStateStore } from '../../src/user-interface/adapter/stores/gameState'
import { useUIStateStore } from '../../src/user-interface/adapter/stores/uiState'

describe('TopInfoBar - Opponent Turn Countdown (User Story 4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should display countdown when opponent is taking their turn', async () => {
    const wrapper = mount(TopInfoBar)
    const gameState = useGameStateStore()
    const uiState = useUIStateStore()

    // Simulate opponent's turn by setting activePlayerId different from localPlayerId
    gameState.localPlayerId = 'player1'
    gameState.activePlayerId = 'player2' // opponent is active
    uiState.actionTimeoutRemaining = 30

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain("Opponent's Turn")
    expect(wrapper.text()).toContain('30')
  })

  it('should show countdown with normal color when time > 5 seconds (opponent turn)', async () => {
    const wrapper = mount(TopInfoBar)
    const gameState = useGameStateStore()
    const uiState = useUIStateStore()

    gameState.localPlayerId = 'player1'
    gameState.activePlayerId = 'player2' // opponent's turn
    uiState.actionTimeoutRemaining = 10

    await wrapper.vm.$nextTick()

    // Find countdown by checking the parent div structure
    const centerDiv = wrapper.findAll('.flex.flex-col.items-center').find(el => el.text().includes('10'))
    expect(centerDiv).toBeTruthy()

    // The countdown should have text-white class (from computed)
    const countdownElement = centerDiv!.find('div.text-xl.font-bold')
    expect(countdownElement.text()).toBe('10')
    // Check that the element has the correct color class dynamically bound
    expect(countdownElement.attributes('class')).toContain('text-white')
  })

  it('should show countdown with warning color when time <= 5 seconds (opponent turn)', async () => {
    const wrapper = mount(TopInfoBar)
    const gameState = useGameStateStore()
    const uiState = useUIStateStore()

    gameState.localPlayerId = 'player1'
    gameState.activePlayerId = 'player2' // opponent's turn
    uiState.actionTimeoutRemaining = 5

    await wrapper.vm.$nextTick()

    // Find countdown by checking the parent div structure
    const centerDiv = wrapper.findAll('.flex.flex-col.items-center').find(el => el.text().includes('5'))
    expect(centerDiv).toBeTruthy()

    const countdownElement = centerDiv!.find('div.text-xl.font-bold')
    expect(countdownElement.text()).toBe('5')
    // Check that the element has the correct red color class when <= 5 seconds
    expect(countdownElement.attributes('class')).toContain('text-red-500')
  })

  it('should hide countdown when opponent completes their action', async () => {
    const wrapper = mount(TopInfoBar)
    const gameState = useGameStateStore()
    const uiState = useUIStateStore()

    // Initially show opponent countdown
    gameState.localPlayerId = 'player1'
    gameState.activePlayerId = 'player2' // opponent's turn
    uiState.actionTimeoutRemaining = 15

    await wrapper.vm.$nextTick()
    // Check that countdown is displayed by checking text content
    expect(wrapper.text()).toContain('15')
    expect(wrapper.text()).toContain("Opponent's Turn")

    // Opponent completes action - countdown stops
    uiState.actionTimeoutRemaining = null

    await wrapper.vm.$nextTick()
    // Countdown should not be displayed anymore (text '15' should not exist)
    expect(wrapper.text()).not.toContain('15')
  })

  it('should switch from opponent countdown to player countdown when turn changes', async () => {
    const wrapper = mount(TopInfoBar)
    const gameState = useGameStateStore()
    const uiState = useUIStateStore()

    // Opponent's turn with countdown
    gameState.localPlayerId = 'player1'
    gameState.activePlayerId = 'player2' // opponent's turn
    uiState.actionTimeoutRemaining = 20

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain("Opponent's Turn")
    expect(wrapper.text()).toContain('20')

    // Turn switches to player
    gameState.activePlayerId = 'player1' // player's turn
    uiState.actionTimeoutRemaining = 30

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Your Turn')
    expect(wrapper.text()).toContain('30')
  })

  it('should display opponent score and player score correctly', async () => {
    const wrapper = mount(TopInfoBar)
    const gameState = useGameStateStore()

    gameState.myScore = 5
    gameState.opponentScore = 3

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Opponent')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('You')
    expect(wrapper.text()).toContain('5')
  })

  it('should show deck remaining count', () => {
    const wrapper = mount(TopInfoBar)
    const gameState = useGameStateStore()

    gameState.deckRemaining = 24

    expect(wrapper.text()).toContain('Deck: 24')
  })

  it('should not display countdown when actionTimeoutRemaining is null (no active countdown)', async () => {
    const wrapper = mount(TopInfoBar)
    const gameState = useGameStateStore()
    const uiState = useUIStateStore()

    gameState.localPlayerId = 'player1'
    gameState.activePlayerId = 'player1'
    uiState.actionTimeoutRemaining = null

    await wrapper.vm.$nextTick()

    // Only scores should be displayed (0), not a separate countdown number
    const text = wrapper.text()
    // Should have "Your Turn" but no countdown number between it and "Deck:"
    expect(text).toContain('Your Turn')
    expect(text).toContain('Deck:')
    // The center section should not have a countdown number
    const centerDiv = wrapper.find('.flex.flex-col.items-center')
    expect(centerDiv.text()).not.toMatch(/^\d+$/) // Should not have standalone number
  })
})

describe('TopInfoBar - Connection Status', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should display "Connected" status with green color', async () => {
    const wrapper = mount(TopInfoBar)
    const uiState = useUIStateStore()

    uiState.connectionStatus = 'connected'

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Connected')
    const statusElement = wrapper.find('.text-green-600')
    expect(statusElement.exists()).toBe(true)
  })

  it('should display "Connecting..." status with yellow color', async () => {
    const wrapper = mount(TopInfoBar)
    const uiState = useUIStateStore()

    uiState.connectionStatus = 'connecting'

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Connecting...')
    const statusElement = wrapper.find('.text-yellow-600')
    expect(statusElement.exists()).toBe(true)
  })

  it('should display "Disconnected" status with red color', () => {
    const wrapper = mount(TopInfoBar)
    const uiState = useUIStateStore()

    uiState.connectionStatus = 'disconnected'

    expect(wrapper.text()).toContain('Disconnected')
    const statusElement = wrapper.find('.text-red-600')
    expect(statusElement.exists()).toBe(true)
  })
})
