<template>
  <div class="bg-green-50 overflow-hidden flex flex-col">
    <!-- Header with game info -->
    <div class="text-center py-2 px-4 bg-white shadow-sm">
      <h1 class="text-xl font-bold text-gray-800">花牌遊戲 「来来」</h1>
      <div class="flex justify-center gap-4 text-xs text-gray-600">
        <span>Round {{ currentRound }} / {{ maxRounds }}</span>
        <span>Phase: {{ currentPhase }}</span>
      </div>
    </div>

    <!-- Game Setup (when not started) -->
    <div v-if="!gameStarted" class="flex-1 flex justify-center items-center px-4 min-h-96">
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 class="text-xl font-bold text-center mb-4">Game Setup</h2>
        <div class="flex flex-col gap-3 mb-4">
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
        <button
          @click="startNewGame"
          class="w-full bg-blue-500 text-white py-2 px-4 rounded-md font-semibold border-none cursor-pointer hover:bg-blue-600"
        >
          Start Game
        </button>
      </div>
    </div>

    <!-- Game Layout (when started) -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <!-- Opponent at top -->
      <div class="px-4 py-2 border-b border-green-200">
        <PlayerHand
          v-if="opponent"
          :player="opponent"
          :can-play-cards="false"
          :show-captured="true"
          :is-current-player="isOpponentTurn"
        />
      </div>

      <!-- Middle section: Game Board + Actions + Status -->
      <div class="flex-1 flex flex-col justify-center px-4 py-2 overflow-y-auto">
        <!-- Game Board -->
        <div class="mb-4">
          <GameBoard
            :field-cards="fieldCards"
            :deck-count="deckCount"
            :selected-hand-card="gameStore.uiState.selectedHandCard"
            :can-select-field="canSelectFieldCard"
            :last-move="lastMove"
            :show-koikoi-dialog="showKoikoiDialog"
            :yaku-display="yakuDisplay"
            :players="playerNames"
            @field-card-selected="handleFieldCardSelected"
            @koikoi-decision="handleKoikoiDecision"
          />
        </div>

        <!-- Game Actions -->
        <div class="flex justify-center gap-4 mb-4">
          <button
            v-if="canPlayCard"
            @click="playSelectedCard"
            :disabled="!gameStore.uiState.selectedHandCard"
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
        <div
          v-if="gameMessage"
          class="text-center text-sm font-medium text-gray-600 bg-white rounded-lg p-3 mx-auto shadow-sm max-w-xl"
        >
          {{ gameMessage }}
        </div>
      </div>

      <!-- Current Player at bottom -->
      <div class="px-4 py-2 border-t border-green-200">
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
    </div>

    <!-- Error Display (floating overlay) -->
    <div
      v-if="gameStore.uiState.error"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full shadow-xl">
        <div class="text-center text-lg font-semibold text-red-600 mb-4">
          {{ gameStore.uiState.error }}
        </div>
        <button
          @click="gameStore.clearError()"
          class="w-full bg-red-500 text-white py-2 px-4 rounded-md font-semibold border-none cursor-pointer hover:bg-red-600"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Card } from '@/domain/entities/Card'
import { DIContainer } from '@/infrastructure/di/DIContainer'
import { GameController } from '@/ui/controllers/GameController'
import { InputController, type InputHandler } from '@/ui/controllers/InputController'
import { useGameStore } from '@/ui/stores/gameStore'
import PlayerHand from '@/ui/components/PlayerHand.vue'
import GameBoard from '@/ui/components/GameBoard.vue'
import { onBeforeRouteLeave } from 'vue-router'

// Store
const gameStore = useGameStore()

// Player setup
const player1Name = ref('Player 1')
const player2Name = ref('Player 2')

// Dependencies - Setup DI Container
const diContainer = DIContainer.createDefault(gameStore)
const gameController = diContainer.resolve<GameController>(DIContainer.GAME_CONTROLLER)
const inputController = diContainer.resolve<InputController>(DIContainer.INPUT_CONTROLLER)

// Refs
const playerHandRef = ref()

// Computed properties from store
const currentPlayerData = computed(() => gameStore.currentPlayerData)
const opponent = computed(() => gameStore.opponent)
const fieldCards = computed(() => [...gameStore.gameState.fieldCards])
const deckCount = computed(() => gameStore.gameState.deckCount)
const currentRound = computed(() => gameStore.gameState.round)
const maxRounds = computed(() => gameStore.gameState.maxRounds)
const currentPhase = computed(() => gameStore.gameState.phase)
const gamePhase = computed(() => gameStore.gameState.phase)
const lastMove = computed(() => {
  const move = gameStore.gameState.lastMove
  if (!move || !move.cardPlayed) return null
  return {
    cardId: move.cardPlayed.id,
    playerId: move.playerId,
    matchedCards: move.cardsMatched ? [...move.cardsMatched] : [],
    capturedCards: move.cardsMatched ? [...move.cardsMatched] : [],
    timestamp: new Date(),
  }
})
const gameStarted = computed(() => gameStore.gameState.gameStarted)
const gameMessage = computed(() => gameStore.uiState.gameMessage)
const yakuDisplay = computed(() =>
  gameStore.uiState.yakuDisplay.map((yaku) => ({
    yaku: yaku.yaku,
    cards: [...yaku.cards],
    points: yaku.points,
  })),
)
const showKoikoiDialog = computed(() => gameStore.uiState.showKoikoiDialog)

const isPlayerTurn = computed(() => gameStore.isPlayerTurn)
const isOpponentTurn = computed(() => gameStore.isOpponentTurn)
const canPlayCard = computed(() => gameStore.canPlayCard)
const canSelectFieldCard = computed(() => gameStore.canSelectFieldCard)

const playerNames = computed(() => [
  { id: 'player1', name: player1Name.value },
  { id: 'player2', name: player2Name.value },
])

// Input Handler Implementation
const inputHandler: InputHandler = {
  onHandCardSelected: (card: Card) => {
    gameStore.setSelectedHandCard(card)
    gameStore.setGameMessage(
      `Selected ${card.name}. Select a matching field card or play directly.`,
    )
  },
  onFieldCardSelected: (card: Card) => {
    gameStore.setSelectedFieldCard(card)
    gameStore.setGameMessage(`Selected field card: ${card.name}`)
  },
  onPlayCardAction: async () => {
    const handCard = gameStore.uiState.selectedHandCard
    const fieldCard = gameStore.uiState.selectedFieldCard
    if (!handCard) return

    await gameController.playCard({
      playerId: 'player1',
      cardId: handCard.id,
      selectedFieldCards: fieldCard ? [fieldCard.id] : undefined,
    })
  },
  onKoikoiDecision: async (continueGame: boolean) => {
    await gameController.handleKoikoiDecision({
      playerId: 'player1',
      declareKoikoi: continueGame,
    })
  },
  onNextRoundAction: async () => {
    await gameController.startNextRound()
  },
  onNewGameAction: async () => {
    await startNewGame()
  },
}

// Methods
const startNewGame = async () => {
  await gameController.startNewGame({
    player1Name: player1Name.value,
    player2Name: player2Name.value,
  })
}

const handleHandCardSelected = (card: Card) => {
  inputController.handleHandCardSelected(card)
}

const handleFieldCardSelected = (card: Card) => {
  inputController.handleFieldCardSelected(card)
}

const playSelectedCard = async () => {
  inputController.handlePlayCardAction()
}

const handleKoikoiDecision = async (continueGame: boolean) => {
  inputController.handleKoikoiDecision(continueGame)
}

const startNextRound = async () => {
  inputController.handleNextRoundAction()
}

onMounted(() => {
  // Setup input handler
  inputController.addHandler(inputHandler)

  // Initialize game message
  gameStore.setGameMessage('Welcome to Hanafuda Koi-Koi! Set up your game to start.')
})

onBeforeRouteLeave((_to, _from, next) => {
  // 僅在回合進行中才提示，避免在 setup 或 game_end 阶段打擾
  const phase = gameStore.gameState.phase
  const isInProgress = !!(
    gameStore.gameState.gameStarted &&
    (phase === 'playing' || phase === 'koikoi')
  )
  if (isInProgress) {
    const ok = window.confirm('確定要離開遊戲嗎？未保存的進度可能會遺失。')
    if (!ok) return next(false)
  }
  next()
})
</script>

<style scoped>
/* All styling is now handled by Tailwind classes in the template */
</style>
