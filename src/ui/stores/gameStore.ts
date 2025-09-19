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
  gameMessage: string
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
    gameMessage: 'Welcome to Hanafuda Koi-Koi! Set up your game to start.',
    yakuDisplay: [],
    showKoikoiDialog: false,
    isLoading: false,
    error: null
  })

  // Computed properties
  const currentPlayerData = computed((): IPlayer | null => {
    return gameState.value.players.find((p) => p.id === 'player1') || null
  })

  const opponent = computed((): IPlayer | null => {
    return gameState.value.players.find((p) => p.id === 'player2') || null
  })

  const isPlayerTurn = computed(() => {
    return (
      gameState.value.currentPlayer?.id === 'player1' &&
      (gameState.value.phase === 'playing' || gameState.value.phase === 'koikoi')
    )
  })

  const isOpponentTurn = computed(() => {
    return gameState.value.currentPlayer?.id === 'player2'
  })

  const canPlayCard = computed(() => {
    return isPlayerTurn.value && uiState.value.selectedHandCard !== null
  })

  const canSelectFieldCard = computed(() => {
    return uiState.value.selectedHandCard !== null && isPlayerTurn.value
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

  const setGameMessage = (message: string) => {
    uiState.value.gameMessage = message
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
      gameMessage: 'Welcome to Hanafuda Koi-Koi! Set up your game to start.',
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