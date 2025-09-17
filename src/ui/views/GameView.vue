<template>
  <div class="min-h-screen bg-green-50 p-4">
    <div class="text-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">花牌遊戲 「来来」</h1>
      <div class="flex justify-center gap-6 text-sm text-gray-600">
        <span>Round {{ currentRound }} / {{ maxRounds }}</span>
        <span>Phase: {{ currentPhase }}</span>
      </div>
    </div>

    <div v-if="!gameStarted" class="flex justify-center items-center min-h-96">
      <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 class="text-xl font-bold text-center mb-6">Game Setup</h2>
        <div class="flex flex-col gap-4 mb-6">
          <input
            v-model="player1Name"
            placeholder="Player 1 Name"
            class="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <input
            v-model="player2Name"
            placeholder="Player 2 Name"
            class="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button @click="startNewGame" class="w-full bg-blue-500 text-white py-2 px-4 rounded-md font-semibold border-none cursor-pointer hover:bg-blue-600">
          Start Game
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col gap-6">
      <!-- Opponent -->
      <div class="max-w-4xl mx-auto">
        <PlayerHand
          v-if="opponent"
          :player="opponent"
          :can-play-cards="false"
          :show-captured="true"
          :is-current-player="isOpponentTurn"
        />
      </div>

      <!-- Game Board -->
      <div class="max-w-4xl mx-auto">
        <GameBoard
          :field-cards="fieldCards"
          :deck-count="deckCount"
          :selected-hand-card="selectedHandCard"
          :can-select-field="canSelectFieldCard"
          :last-move="lastMove"
          :show-koikoi-dialog="showKoikoiDialog"
          :yaku-display="yakuDisplay"
          :players="playerNames"
          @field-card-selected="handleFieldCardSelected"
          @koikoi-decision="handleKoikoiDecision"
        />
      </div>

      <!-- Current Player -->
      <div class="max-w-4xl mx-auto">
        <PlayerHand
          v-if="currentPlayerData"
          :player="currentPlayerData"
          :can-play-cards="isPlayerTurn"
          :show-captured="true"
          :is-current-player="isPlayerTurn"
          @card-selected="handleHandCardSelected"
          ref="playerHandRef"
        />
      </div>

      <!-- Game Actions -->
      <div class="flex justify-center gap-4">
        <button
          v-if="canPlayCard"
          @click="playSelectedCard"
          :disabled="!selectedHandCard"
          class="bg-green-500 text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Play Card
        </button>

        <button
          v-if="gamePhase === 'round_end'"
          @click="startNextRound"
          class="text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer bg-blue-500 hover:bg-blue-600"
        >
          Next Round
        </button>

        <button
          v-if="gamePhase === 'game_end'"
          @click="startNewGame"
          class="text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer bg-purple-500 hover:bg-purple-600"
        >
          New Game
        </button>
      </div>

      <!-- Game Status -->
      <div v-if="gameMessage" class="text-center text-lg font-semibold text-gray-600 bg-white rounded-lg p-4 max-w-2xl mx-auto shadow-md">
        {{ gameMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Card } from '@/domain/entities/Card'
import { Player } from '@/domain/entities/Player'
import type { IPlayer } from '@/application/ports/repositories/PlayerInterface'
import type { GameState } from '@/domain/entities/GameState'
import type { YakuResult } from '@/domain/entities/Yaku'
import { LocalGameRepository } from '@/infrastructure/repositories/LocalGameRepository'
import { GameFlowUseCase } from '@/application/usecases/GameFlowUseCase'
import { PlayCardUseCase } from '@/application/usecases/PlayCardUseCase'
import { CalculateScoreUseCase } from '@/application/usecases/CalculateScoreUseCase'
import PlayerHand from '@/ui/components/PlayerHand.vue'
import GameBoard from '@/ui/components/GameBoard.vue'

// Reactive state
const gameState = ref<GameState | null>(null)
const gameId = ref<string>('')
const gameStarted = ref(false)
const selectedHandCard = ref<Card | null>(null)
const selectedFieldCard = ref<Card | null>(null)
const gameMessage = ref('')
const yakuDisplay = ref<YakuResult[]>([])
const showKoikoiDialog = ref(false)

// Player setup
const player1Name = ref('Player 1')
const player2Name = ref('Player 2')

// Dependencies
const gameRepository = new LocalGameRepository()
const calculateScoreUseCase = new CalculateScoreUseCase(gameRepository)
const gameFlowUseCase = new GameFlowUseCase(gameRepository, calculateScoreUseCase)
const playCardUseCase = new PlayCardUseCase(gameRepository)

// Refs
const playerHandRef = ref()

// Computed properties
const currentPlayerData = computed((): IPlayer | null => {
  if (!gameState.value) return null
  return gameState.value.players.find(p => p.id === 'player1') || null
})

const opponent = computed((): IPlayer | null => {
  if (!gameState.value) return null
  return gameState.value.players.find(p => p.id === 'player2') || null
})

const fieldCards = computed((): Card[] => {
  return gameState.value?.field ? [...gameState.value.field] : []
})
const deckCount = computed(() => gameState.value?.deckCount || 0)
const currentRound = computed(() => gameState.value?.round || 1)
const maxRounds = computed(() => 12)
const currentPhase = computed(() => gameState.value?.phase || 'setup')
const gamePhase = computed(() => gameState.value?.phase)
const lastMove = computed(() => gameState.value?.lastMove || null)

const isPlayerTurn = computed(() => {
  return gameState.value?.currentPlayer?.id === 'player1' && 
         (gamePhase.value === 'playing' || gamePhase.value === 'koikoi')
})

const isOpponentTurn = computed(() => {
  return gameState.value?.currentPlayer?.id === 'player2'
})

const canPlayCard = computed(() => {
  return isPlayerTurn.value && selectedHandCard.value !== null
})

const canSelectFieldCard = computed(() => {
  return selectedHandCard.value !== null && isPlayerTurn.value
})

const playerNames = computed(() => [
  { id: 'player1', name: player1Name.value },
  { id: 'player2', name: player2Name.value }
])

// Methods
const startNewGame = async () => {
  try {
    gameMessage.value = 'Starting new game...'
    
    const newGameId = await gameFlowUseCase.createGame()
    gameId.value = newGameId
    
    const player1 = new Player('player1', player1Name.value, true)
    const player2 = new Player('player2', player2Name.value, false)
    
    await gameFlowUseCase.setupGame(newGameId, player1, player2)
    const dealtGameState = await gameFlowUseCase.dealCards(newGameId)
    
    gameState.value = dealtGameState
    gameStarted.value = true
    gameMessage.value = `Game started! ${dealtGameState.currentPlayer?.name}'s turn`
    
  } catch (error) {
    gameMessage.value = `Error starting game: ${error}`
    console.error('Error starting game:', error)
  }
}

const handleHandCardSelected = (card: Card) => {
  selectedHandCard.value = card
  gameMessage.value = `Selected ${card.name}. Select a matching field card or play directly.`
}

const handleFieldCardSelected = (card: Card) => {
  selectedFieldCard.value = card
  gameMessage.value = `Selected field card: ${card.name}`
}

const playSelectedCard = async () => {
  if (!selectedHandCard.value || !gameState.value) return
  
  try {
    const request = {
      playerId: 'player1',
      cardId: selectedHandCard.value.id,
      selectedFieldCards: selectedFieldCard.value ? [selectedFieldCard.value.id] : undefined
    }
    
    const result = await playCardUseCase.execute(gameId.value, request)
    
    if (result.success) {
      const updatedGameState = await gameRepository.getGameState(gameId.value)
      if (updatedGameState) {
        gameState.value = updatedGameState
      }
      
      if (result.yakuResults.length > 0) {
        yakuDisplay.value = result.yakuResults
        if (result.nextPhase === 'koikoi') {
          showKoikoiDialog.value = true
          gameMessage.value = 'You achieved Yaku! Declare Koi-Koi?'
        }
      } else {
        gameMessage.value = `Played ${selectedHandCard.value.name}. Captured ${result.capturedCards.length} cards.`
      }
      
      clearSelections()
      
      if (result.nextPhase === 'round_end') {
        await handleRoundEnd()
      }
      
    } else {
      gameMessage.value = result.error || 'Failed to play card'
    }
    
  } catch (error) {
    gameMessage.value = `Error playing card: ${error}`
    console.error('Error playing card:', error)
  }
}

const handleKoikoiDecision = async (continueGame: boolean) => {
  if (!gameState.value) return
  
  try {
    if (continueGame) {
      await gameFlowUseCase.handleKoikoiDeclaration(gameId.value, 'player1', true)
      gameMessage.value = 'Koi-Koi declared! Game continues...'
    } else {
      await gameFlowUseCase.endRound(gameId.value)
      gameMessage.value = 'Round ended!'
      await handleRoundEnd()
    }
    
    showKoikoiDialog.value = false
    yakuDisplay.value = []
    
    const updatedGameState = await gameRepository.getGameState(gameId.value)
    if (updatedGameState) {
      gameState.value = updatedGameState
    }
    
  } catch (error) {
    gameMessage.value = `Error handling Koi-Koi: ${error}`
    console.error('Error handling Koi-Koi:', error)
  }
}

const handleRoundEnd = async () => {
  if (!gameState.value) return
  
  const roundResult = gameState.value.roundResult
  if (roundResult) {
    if (roundResult.winner) {
      gameMessage.value = `Round won by ${roundResult.winner.name}! Score: ${roundResult.score}`
    } else {
      gameMessage.value = 'Round ended in a draw!'
    }
  }
}

const startNextRound = async () => {
  try {
    const updatedGameState = await gameFlowUseCase.startNextRound(gameId.value)
    gameState.value = updatedGameState
    
    if (updatedGameState.isGameOver) {
      const winner = await gameFlowUseCase.getGameWinner(gameId.value)
      gameMessage.value = winner ? `Game won by ${winner.name}!` : 'Game ended in a draw!'
    } else {
      gameMessage.value = `Round ${updatedGameState.round} started!`
    }
    
  } catch (error) {
    gameMessage.value = `Error starting next round: ${error}`
    console.error('Error starting next round:', error)
  }
}

const clearSelections = () => {
  selectedHandCard.value = null
  selectedFieldCard.value = null
  playerHandRef.value?.clearSelection()
}

onMounted(() => {
  gameMessage.value = 'Welcome to Hanafuda Koi-Koi! Set up your game to start.'
})
</script>

<style scoped>
/* All styling is now handled by Tailwind classes in the template */
</style>