import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameViewModel } from '../../domain/models/GameViewModel'
import type { PlayerViewModel } from '../../domain/models/PlayerViewModel'
import type { YakuResult } from '@/shared/events/base/YakuResult'

/**
 * UI Animation Event
 */
export interface UIAnimationEvent {
  readonly type: 'card_play' | 'deck_reveal' | 'turn_transition'
  readonly playerId?: string
  readonly cardId?: string
  readonly matchType?: 'no_match' | 'single_match' | 'multiple_matches'
  readonly capturedCardIds?: string[]
  readonly fromPlayerId?: string
  readonly toPlayerId?: string
  readonly reason?: string
}

/**
 * Match Selection State
 */
export interface MatchSelectionState {
  readonly sourceCardId: string
  readonly selectableCardIds: string[]
  readonly timeoutMs: number
  readonly startedAt: number
}

/**
 * Koi-Koi Dialog State
 */
export interface KoikoiDialogState {
  readonly playerId: string
  readonly yakuResults: YakuResult[]
  readonly currentScore: number
}

/**
 * Game Store (Game UI BC - Presentation Layer)
 *
 * Pinia store for managing UI state in Vue components.
 * Works with GameViewModel from the domain layer.
 *
 * Responsibilities:
 * - Hold current GameViewModel
 * - Manage UI-specific state (selections, dialogs, loading)
 * - Provide computed properties for Vue components
 * - Trigger animations and visual feedback
 *
 * Design:
 * - Presentation layer state management
 * - Vue/Pinia specific
 * - Read-only access to GameViewModel (mutations via events)
 * - Reactive UI state for Vue components
 */
export const useGameStore = defineStore('game-ui', () => {
  // Core game state (from game-engine events)
  const gameViewModel = ref<GameViewModel | null>(null)

  // UI-specific state
  const gameStarted = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const gameMessage = ref<string | null>(null)

  // Selection state
  const selectedHandCardId = ref<string | null>(null)
  const selectedFieldCardId = ref<string | null>(null)
  const hoveredMatchingCardIds = ref<string[]>([])

  // Dialog state
  const matchSelectionState = ref<MatchSelectionState | null>(null)
  const koikoiDialogState = ref<KoikoiDialogState | null>(null)

  // Yaku display
  const yakuDisplay = ref<YakuResult[]>([])

  // Animation queue
  const animationQueue = ref<UIAnimationEvent[]>([])

  // Game over state
  const isGameOver = ref<boolean>(false)

  // ==================== Computed Properties ====================

  /**
   * Current player view model
   */
  const currentPlayer = computed((): PlayerViewModel | null => {
    return gameViewModel.value?.currentPlayer || null
  })

  /**
   * All players
   */
  const players = computed((): readonly PlayerViewModel[] => {
    return gameViewModel.value?.players || []
  })

  /**
   * Get opponent player (for 2-player game)
   */
  const opponent = computed((): PlayerViewModel | null => {
    if (!gameViewModel.value || !currentPlayer.value) {
      return null
    }
    return (
      gameViewModel.value.players.find((p) => p.id !== currentPlayer.value?.id) || null
    )
  })

  /**
   * Check if it's player's turn
   */
  const isPlayerTurn = computed((): boolean => {
    if (!gameViewModel.value) return false
    return (
      gameViewModel.value.phase === 'playing' &&
      currentPlayer.value !== null &&
      currentPlayer.value.isHuman
    )
  })

  /**
   * Check if can play card
   */
  const canPlayCard = computed((): boolean => {
    return isPlayerTurn.value && selectedHandCardId.value !== null
  })

  /**
   * Check if match selection is pending
   */
  const hasMatchSelectionPending = computed((): boolean => {
    return matchSelectionState.value !== null
  })

  /**
   * Check if Koi-Koi dialog is shown
   */
  const isKoikoiDialogVisible = computed((): boolean => {
    return koikoiDialogState.value !== null
  })

  /**
   * Get current game phase
   */
  const currentPhase = computed((): string => {
    return gameViewModel.value?.phase || 'setup'
  })

  /**
   * Get current round number
   */
  const currentRound = computed((): number => {
    return gameViewModel.value?.currentRound || 1
  })

  // ==================== Actions ====================

  /**
   * Set game view model (from UpdateGameViewUseCase)
   */
  const setGameViewModel = (viewModel: GameViewModel) => {
    gameViewModel.value = viewModel
  }

  /**
   * Set game started flag
   */
  const setGameStarted = (started: boolean) => {
    gameStarted.value = started
  }

  /**
   * Set loading state
   */
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  /**
   * Set error message
   */
  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  /**
   * Clear error
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * Set game message
   */
  const setGameMessage = (message: string | null) => {
    gameMessage.value = message
  }

  /**
   * Set selected hand card
   */
  const setSelectedHandCard = (cardId: string | null) => {
    selectedHandCardId.value = cardId
  }

  /**
   * Set selected field card
   */
  const setSelectedFieldCard = (cardId: string | null) => {
    selectedFieldCardId.value = cardId
  }

  /**
   * Set hovered matching cards
   */
  const setHoveredMatchingCards = (cardIds: string[]) => {
    hoveredMatchingCardIds.value = cardIds
  }

  /**
   * Clear all selections
   */
  const clearSelections = () => {
    selectedHandCardId.value = null
    selectedFieldCardId.value = null
    hoveredMatchingCardIds.value = []
  }

  /**
   * Show match selection dialog
   */
  const showMatchSelection = (selection: MatchSelectionState) => {
    matchSelectionState.value = selection
  }

  /**
   * Hide match selection dialog
   */
  const hideMatchSelection = () => {
    matchSelectionState.value = null
  }

  /**
   * Show Koi-Koi decision dialog
   */
  const showKoikoiDialog = (dialog: KoikoiDialogState) => {
    koikoiDialogState.value = dialog
  }

  /**
   * Hide Koi-Koi dialog
   */
  const hideKoikoiDialog = () => {
    koikoiDialogState.value = null
  }

  /**
   * Set yaku display
   */
  const setYakuDisplay = (yakuResults: YakuResult[]) => {
    yakuDisplay.value = yakuResults
  }

  /**
   * Clear yaku display
   */
  const clearYakuDisplay = () => {
    yakuDisplay.value = []
  }

  /**
   * Trigger animation
   */
  const triggerAnimation = (animation: UIAnimationEvent) => {
    animationQueue.value.push(animation)
  }

  /**
   * Clear animation queue
   */
  const clearAnimationQueue = () => {
    animationQueue.value = []
  }

  /**
   * Set game over
   */
  const setGameOver = (isOver: boolean) => {
    isGameOver.value = isOver
  }

  /**
   * Reset game store
   */
  const resetGame = () => {
    gameViewModel.value = null
    gameStarted.value = false
    isLoading.value = false
    error.value = null
    gameMessage.value = null
    selectedHandCardId.value = null
    selectedFieldCardId.value = null
    hoveredMatchingCardIds.value = []
    matchSelectionState.value = null
    koikoiDialogState.value = null
    yakuDisplay.value = []
    animationQueue.value = []
    isGameOver.value = false
  }

  return {
    // Core state
    gameViewModel,
    gameStarted,
    isLoading,
    error,
    gameMessage,

    // Selection state
    selectedHandCardId,
    selectedFieldCardId,
    hoveredMatchingCardIds,

    // Dialog state
    matchSelectionState,
    koikoiDialogState,

    // Yaku display
    yakuDisplay,

    // Animation
    animationQueue,

    // Game over
    isGameOver,

    // Computed
    currentPlayer,
    players,
    opponent,
    isPlayerTurn,
    canPlayCard,
    hasMatchSelectionPending,
    isKoikoiDialogVisible,
    currentPhase,
    currentRound,

    // Actions
    setGameViewModel,
    setGameStarted,
    setLoading,
    setError,
    clearError,
    setGameMessage,
    setSelectedHandCard,
    setSelectedFieldCard,
    setHoveredMatchingCards,
    clearSelections,
    showMatchSelection,
    hideMatchSelection,
    showKoikoiDialog,
    hideKoikoiDialog,
    setYakuDisplay,
    clearYakuDisplay,
    triggerAnimation,
    clearAnimationQueue,
    setGameOver,
    resetGame,
  }
})
