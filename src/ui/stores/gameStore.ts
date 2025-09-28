import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Card } from '@/domain/entities/Card'
import type { IPlayer } from '@/application/ports/repositories/PlayerInterface'
import type { YakuResult } from '@/domain/entities/Yaku'

export interface UIGameState {
  gameId: string
  gameStarted: boolean
  players: IPlayer[]
  currentPlayer: IPlayer | null
  fieldCards: Card[]
  deckCount: number
  round: number
  maxRounds: number
  phase: string
  isGameOver: boolean
  lastMove?: {
    playerId: string
    cardPlayed: Card
    cardsMatched: Card[]
  }
  roundResult?: {
    winner: IPlayer | null
    score: number
    yakuResults: YakuResult[]
    koikoiDeclared: boolean
  }
  koikoiPlayer?: string
}

export interface UIInteractionState {
  selectedHandCard: Card | null
  selectedFieldCard: Card | null
  selectedMatchingFieldCards: Card[]
  hoveredMatchingFieldCards: Card[]
  gameMessageKey: string | null
  gameMessageParams?: Record<string, string | number>
  yakuDisplay: YakuResult[]
  showKoikoiDialog: boolean
  isLoading: boolean
  error: string | null
}

export const useGameStore = defineStore('game', () => {
  // Game State
  const gameState = ref<UIGameState>({
    gameId: '',
    gameStarted: false,
    players: [],
    currentPlayer: null,
    fieldCards: [],
    deckCount: 0,
    round: 1,
    maxRounds: 12,
    phase: 'setup',
    isGameOver: false
  })

  // UI Interaction State
  const uiState = ref<UIInteractionState>({
    selectedHandCard: null,
    selectedFieldCard: null,
    selectedMatchingFieldCards: [],
    hoveredMatchingFieldCards: [],
    gameMessageKey: 'game.messages.welcome',
    gameMessageParams: undefined,
    yakuDisplay: [],
    showKoikoiDialog: false,
    isLoading: false,
    error: null
  })

  // Computed properties
  const currentPlayerData = computed((): IPlayer | null => {
    return gameState.value.currentPlayer
  })

  const opponent = computed((): IPlayer | null => {
    if (!gameState.value.currentPlayer) return null
    return gameState.value.players.find((p) => p.id !== gameState.value.currentPlayer?.id) || null
  })

  const isPlayerTurn = computed(() => {
    return (
      gameState.value.currentPlayer !== null &&
      (gameState.value.phase === 'playing' || gameState.value.phase === 'koikoi')
    )
  })

  const isOpponentTurn = computed(() => {
    return gameState.value.currentPlayer !== null
  })

  const canPlayCard = computed(() => {
    return isPlayerTurn.value && uiState.value.selectedHandCard !== null
  })

  const canSelectFieldCard = computed(() => {
    return (
      uiState.value.selectedHandCard !== null &&
      isPlayerTurn.value &&
      uiState.value.selectedMatchingFieldCards.length > 0
    )
  })

  // Actions for updating game state
  const updateGameState = (newGameState: Partial<UIGameState>) => {
    Object.assign(gameState.value, newGameState)
  }

  const setGameStarted = (started: boolean) => {
    gameState.value.gameStarted = started
  }

  const setPlayers = (players: IPlayer[]) => {
    gameState.value.players = players
  }

  const setCurrentPlayer = (player: IPlayer | null) => {
    gameState.value.currentPlayer = player
  }

  const setFieldCards = (cards: Card[]) => {
    gameState.value.fieldCards = cards
  }

  const setDeckCount = (count: number) => {
    gameState.value.deckCount = count
  }

  const setRound = (round: number) => {
    gameState.value.round = round
  }

  const setPhase = (phase: string) => {
    gameState.value.phase = phase
  }

  const setGameOver = (isOver: boolean) => {
    gameState.value.isGameOver = isOver
  }

  const setLastMove = (lastMove: UIGameState['lastMove']) => {
    gameState.value.lastMove = lastMove
  }

  const setRoundResult = (result: UIGameState['roundResult']) => {
    gameState.value.roundResult = result
  }

  const setKoikoiPlayer = (playerId: string | undefined) => {
    gameState.value.koikoiPlayer = playerId
  }

  // Actions for updating UI state
  const setSelectedHandCard = (card: Card | null) => {
    uiState.value.selectedHandCard = card
  }

  const setSelectedFieldCard = (card: Card | null) => {
    uiState.value.selectedFieldCard = card
  }

  const setSelectedMatchingFieldCards = (cards: Card[]) => {
    uiState.value.selectedMatchingFieldCards = cards
  }

  const setHoveredMatchingFieldCards = (cards: Card[]) => {
    uiState.value.hoveredMatchingFieldCards = cards
  }

  const setGameMessage = (messageKey: string | null, params?: Record<string, string | number>) => {
    uiState.value.gameMessageKey = messageKey
    uiState.value.gameMessageParams = params
  }

  const setYakuDisplay = (yakuResults: YakuResult[]) => {
    uiState.value.yakuDisplay = yakuResults
  }

  const setShowKoikoiDialog = (show: boolean) => {
    uiState.value.showKoikoiDialog = show
  }

  const setLoading = (loading: boolean) => {
    uiState.value.isLoading = loading
  }

  const setError = (error: string | null) => {
    uiState.value.error = error
  }

  const clearSelections = () => {
    uiState.value.selectedHandCard = null
    uiState.value.selectedFieldCard = null
    uiState.value.selectedMatchingFieldCards = []
    uiState.value.hoveredMatchingFieldCards = []
  }

  const clearError = () => {
    uiState.value.error = null
  }

  const resetGame = () => {
    gameState.value = {
      gameId: '',
      gameStarted: false,
      players: [],
      currentPlayer: null,
      fieldCards: [],
      deckCount: 0,
      round: 1,
      maxRounds: 12,
      phase: 'setup',
      isGameOver: false
    }

    uiState.value = {
      selectedHandCard: null,
      selectedFieldCard: null,
      selectedMatchingFieldCards: [],
      hoveredMatchingFieldCards: [],
      gameMessageKey: 'game.messages.welcome',
      gameMessageParams: undefined,
      yakuDisplay: [],
      showKoikoiDialog: false,
      isLoading: false,
      error: null
    }
  }

  return {
    // State
    gameState: readonly(gameState),
    uiState: readonly(uiState),

    // Computed
    currentPlayerData,
    opponent,
    isPlayerTurn,
    isOpponentTurn,
    canPlayCard,
    canSelectFieldCard,

    // Game state actions
    updateGameState,
    setGameStarted,
    setPlayers,
    setCurrentPlayer,
    setFieldCards,
    setDeckCount,
    setRound,
    setPhase,
    setGameOver,
    setLastMove,
    setRoundResult,
    setKoikoiPlayer,

    // UI state actions
    setSelectedHandCard,
    setSelectedFieldCard,
    setSelectedMatchingFieldCards,
    setHoveredMatchingFieldCards,
    setGameMessage,
    setYakuDisplay,
    setShowKoikoiDialog,
    setLoading,
    setError,
    clearSelections,
    clearError,
    resetGame
  }
})