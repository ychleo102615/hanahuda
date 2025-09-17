<template>
  <div class="game-view">
    <div class="game-header">
      <h1 class="game-title">花牌遊戲 「来来」</h1>
      <div class="game-info">
        <span class="round-info">Round {{ currentRound }} / {{ maxRounds }}</span>
        <span class="phase-info">Phase: {{ currentPhase }}</span>
      </div>
    </div>

    <div v-if="!gameStarted" class="game-setup">
      <div class="setup-panel">
        <h2>Game Setup</h2>
        <div class="player-setup">
          <input
            v-model="player1Name"
            placeholder="Player 1 Name"
            class="player-input"
          />
          <input
            v-model="player2Name"
            placeholder="Player 2 Name"
            class="player-input"
          />
        </div>
        <button @click="startNewGame" class="start-button">
          Start Game
        </button>
      </div>
    </div>

    <div v-else class="game-content">
      <!-- Opponent -->
      <div class="opponent-area">
        <PlayerHand
          v-if="opponent"
          :player="opponent"
          :can-play-cards="false"
          :show-captured="true"
          :is-current-player="isOpponentTurn"
        />
      </div>

      <!-- Game Board -->
      <div class="board-area">
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
      <div class="player-area">
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
      <div class="action-area">
        <button
          v-if="canPlayCard"
          @click="playSelectedCard"
          :disabled="!selectedHandCard"
          class="play-button"
        >
          Play Card
        </button>
        
        <button
          v-if="gamePhase === 'round_end'"
          @click="startNextRound"
          class="next-round-button"
        >
          Next Round
        </button>

        <button
          v-if="gamePhase === 'game_end'"
          @click="startNewGame"
          class="new-game-button"
        >
          New Game
        </button>
      </div>

      <!-- Game Status -->
      <div v-if="gameMessage" class="game-message">
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
.game-view {
  min-height: 100vh;
  background-color: #f0fdf4;
  padding: 1rem;
}

.game-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.game-title {
  font-size: 1.875rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.game-info {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.game-setup {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 24rem;
}

.setup-panel {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  max-width: 28rem;
  width: 100%;
}

.setup-panel h2 {
  font-size: 1.25rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 1.5rem;
}

.player-setup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.player-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  outline: none;
}

.player-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.start-button {
  width: 100%;
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.start-button:hover {
  background-color: #2563eb;
}

.game-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.opponent-area,
.board-area,
.player-area {
  max-width: 64rem;
  margin: 0 auto;
}

.action-area {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.play-button {
  background-color: #22c55e;
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.play-button:hover {
  background-color: #16a34a;
}

.play-button:disabled {
  background-color: #d1d5db;
  cursor: not-allowed;
}

.next-round-button,
.new-game-button {
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.next-round-button {
  background-color: #3b82f6;
}

.next-round-button:hover {
  background-color: #2563eb;
}

.new-game-button {
  background-color: #a855f7;
}

.new-game-button:hover {
  background-color: #9333ea;
}

.game-message {
  text-align: center;
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  background-color: white;
  border-radius: 0.5rem;
  padding: 1rem;
  max-width: 32rem;
  margin: 0 auto;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
</style>