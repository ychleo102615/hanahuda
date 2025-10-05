<template>
  <div class="bg-green-50 overflow-hidden flex flex-col">
    <!-- Header with game info -->
    <div class="text-center py-2 px-4 bg-white shadow-sm">
      <h1 class="text-xl font-bold text-gray-800">{{ t('game.title') }}</h1>
      <div class="flex justify-center gap-4 text-xs text-gray-600">
        <span>{{ t('game.round', { round: currentRound, maxRounds: maxRounds }) }}</span>
        <span>{{ t('game.phase', { phase: t(`game.phases.${currentPhase}`) }) }}</span>
      </div>
    </div>

    <!-- Game Setup (when not started) -->
    <div v-if="!gameStarted" class="flex-1 flex justify-center items-center px-4 min-h-96">
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 class="text-xl font-bold text-center mb-4">{{ t('game.setup.title') }}</h2>
        <div class="flex flex-col gap-3 mb-4">
          <input
            v-model="player1Name"
            :placeholder="t('game.setup.player1')"
            class="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <input
            v-model="player2Name"
            :placeholder="t('game.setup.player2')"
            class="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          @click="startNewGame"
          class="w-full bg-blue-500 text-white py-2 px-4 rounded-md font-semibold border-none cursor-pointer hover:bg-blue-600"
        >
          {{ t('game.setup.start') }}
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
            :hovered-hand-card="hoveredHandCard"
            :selected-matching-field-cards="gameStore.uiState.selectedMatchingFieldCards"
            :hovered-matching-field-cards="gameStore.uiState.hoveredMatchingFieldCards"
            :can-select-field="canSelectFieldCard"
            :last-move="lastMove"
            :show-koikoi-dialog="showKoikoiDialog"
            :yaku-display="yakuDisplay"
            :players="playerNames"
            @field-card-selected="handleFieldCardSelected"
            @koikoi-decision="handleKoikoiDecision"
            ref="gameBoardRef"
          />
        </div>

        <!-- Round End Result Display -->
        <div
          v-if="gamePhase === 'round_end' && roundResult"
          class="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4 text-center"
        >
          <h3 class="text-lg font-bold text-yellow-800 mb-2">
            {{ t('game.roundResult.title', { round: currentRound }) }}
          </h3>
          <div v-if="roundResult.winner" class="text-green-700 font-medium">
            {{ t('game.roundResult.winner', { winner: roundResult.winner.name }) }}
            <br />
            {{ t('game.roundResult.score', { score: roundResult.score }) }}
          </div>
          <div v-else class="text-gray-700 font-medium">
            {{ t('game.roundResult.draw') }}
          </div>
          <div v-if="roundResult.yakuResults && roundResult.yakuResults.length > 0" class="mt-2">
            <div class="text-sm text-gray-600">{{ t('game.roundResult.yakuAchieved') }}</div>
            <div class="flex flex-wrap justify-center gap-1 mt-1">
              <span
                v-for="yaku in roundResult.yakuResults"
                :key="yaku.yaku.name"
                class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs"
              >
                {{ yaku.yaku.name }} ({{ yaku.points }}pts)
              </span>
            </div>
          </div>
          <div v-if="roundResult.koikoiDeclared" class="text-blue-600 text-sm mt-2">
            {{ t('game.roundResult.koikoiDeclared') }}
          </div>
        </div>

        <!-- Game Actions -->
        <div class="flex justify-center gap-4 mb-4">
          <button
            v-if="canPlayCard"
            @click="playSelectedCard"
            :disabled="!gameStore.uiState.selectedHandCard"
            class="bg-green-500 text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {{ t('game.actions.playCard') }}
          </button>

          <button
            v-if="gamePhase === 'round_end'"
            @click="startNextRound"
            class="text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer bg-blue-500 hover:bg-blue-600"
          >
            {{ t('game.actions.nextRound') }}
          </button>

          <button
            v-if="gamePhase === 'game_end'"
            @click="startNewGame"
            class="text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer bg-purple-500 hover:bg-purple-600"
          >
            {{ t('game.actions.newGame') }}
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
          @card-hovered="handleHandCardHovered"
          @card-unhovered="handleHandCardUnhovered"
          ref="playerHandRef"
        />
      </div>
    </div>

    <!-- Error Display (toast notification) -->
    <Transition name="toast" appear>
      <div
        v-if="gameStore.uiState.error && isToastVisible"
        class="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      >
        <div
          class="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm mx-4 pointer-events-auto cursor-pointer"
          @click="clearErrorWithAnimation"
        >
          <div class="text-center text-sm font-medium text-red-800">
            {{ gameStore.uiState.error }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { Card } from '@/features/game-engine/domain/entities/Card'
import { DIContainer } from '@/infrastructure/di/DIContainer'
import { GameController } from '@/ui/controllers/GameController'
import { useGameStore } from '@/ui/stores/gameStore'
import { useLocale } from '@/ui/composables/useLocale'
import PlayerHand from '@/ui/components/PlayerHand.vue'
import GameBoard from '@/ui/components/GameBoard.vue'
import { onBeforeRouteLeave } from 'vue-router'

// Store and Locale
const gameStore = useGameStore()
const { t } = useLocale()

// Player setup
const player1Name = ref(t('game.setup.player1'))
const player2Name = ref(t('game.setup.player2'))

// Hover state
const hoveredHandCard = ref<Card | null>(null)

// Toast auto-dismiss timer and animation
const toastTimerRef = ref<number | null>(null)
const isToastVisible = ref(false)
const toastFadeTimerRef = ref<number | null>(null)

// Dependencies - Setup DI Container
const diContainer = DIContainer.createDefault(gameStore)
const gameController = diContainer.resolve<GameController>(DIContainer.GAME_CONTROLLER)

// Refs
const playerHandRef = ref()
const gameBoardRef = ref()

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
const gameMessage = computed(() => {
  const messageKey = gameStore.uiState.gameMessageKey
  if (!messageKey) return ''

  const params = gameStore.uiState.gameMessageParams
  // Handle nested translation for card names
  const translatedParams: Record<string, string | number> = {}
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('cards.names.')) {
        // Simple translation with safe English keys
        const translatedCardName = t(value)
        translatedParams[key] = translatedCardName
      } else {
        translatedParams[key] = value
      }
    }
  }

  return t(messageKey, translatedParams)
})
const yakuDisplay = computed(() =>
  gameStore.uiState.yakuDisplay.map((yaku) => ({
    yaku: yaku.yaku,
    cards: [...yaku.cards],
    points: yaku.points,
  })),
)
const showKoikoiDialog = computed(() => gameStore.uiState.showKoikoiDialog)
const roundResult = computed(() => gameStore.gameState.roundResult)

const isPlayerTurn = computed(() => gameStore.isPlayerTurn)
const isOpponentTurn = computed(() => gameStore.isOpponentTurn)
const canPlayCard = computed(() => gameStore.canPlayCard)
const canSelectFieldCard = computed(() => gameStore.canSelectFieldCard)

const playerNames = computed(() => [
  { id: 'player1', name: player1Name.value },
  { id: 'player2', name: player2Name.value },
])

// Direct event handlers

// Methods
const startNewGame = async () => {
  await gameController.startNewGame({
    player1Name: player1Name.value,
    player2Name: player2Name.value,
  })
}

const handleHandCardSelected = async (card: Card) => {
  gameStore.setSelectedHandCard(card)
  // Clear field selection when hand card changes
  gameStore.setSelectedFieldCard(null)
  // Also clear GameBoard component's internal selection state
  gameBoardRef.value?.clearFieldSelection()

  // 獲取可配對的場牌
  try {
    const matchingResult = await gameController.getMatchingCards(card)
    gameStore.setSelectedMatchingFieldCards(matchingResult.matchingFieldCards)
  } catch (error) {
    console.error('Error getting matching cards:', error)
    gameStore.setSelectedMatchingFieldCards([])
  }
}

const handleFieldCardSelected = (card: Card) => {
  gameStore.setSelectedFieldCard(card)
}

const playSelectedCard = async () => {
  const handCard = gameStore.uiState.selectedHandCard
  const fieldCard = gameStore.uiState.selectedFieldCard
  const currentPlayerId = gameStore.gameState.currentPlayer?.id
  if (!handCard || !currentPlayerId) return

  await gameController.playCard({
    playerId: currentPlayerId,
    cardId: handCard.id,
    selectedFieldCard: fieldCard?.id,
  })
}

const handleKoikoiDecision = async (continueGame: boolean) => {
  const currentPlayerId = gameStore.gameState.currentPlayer?.id
  if (!currentPlayerId) return

  await gameController.handleKoikoiDecision({
    playerId: currentPlayerId,
    declareKoikoi: continueGame,
  })
}

const startNextRound = async () => {
  await gameController.startNextRound()
}

const handleHandCardHovered = async (card: Card) => {
  if (!isPlayerTurn.value) return
  hoveredHandCard.value = card

  // 獲取可配對的場牌來提示使用者
  try {
    const matchingResult = await gameController.getMatchingCards(card)
    gameStore.setHoveredMatchingFieldCards(matchingResult.matchingFieldCards)
  } catch (error) {
    console.error('Error getting matching cards on hover:', error)
    gameStore.setHoveredMatchingFieldCards([])
  }
}

const handleHandCardUnhovered = () => {
  hoveredHandCard.value = null
  // 清除 hover 配對提示
  gameStore.setHoveredMatchingFieldCards([])
}

const clearErrorWithAnimation = () => {
  if (toastTimerRef.value) {
    clearTimeout(toastTimerRef.value)
    toastTimerRef.value = null
  }

  // Hide toast - this will trigger the leave transition
  isToastVisible.value = false

  // Clear error after transition completes
  toastFadeTimerRef.value = window.setTimeout(() => {
    gameStore.clearError()
    toastFadeTimerRef.value = null
  }, 300) // Match transition duration
}

const startErrorTimer = () => {
  if (toastTimerRef.value) {
    clearTimeout(toastTimerRef.value)
  }

  // Show toast
  isToastVisible.value = true

  // Auto-dismiss after 1 second
  toastTimerRef.value = window.setTimeout(() => {
    clearErrorWithAnimation()
  }, 1000)
}

onMounted(() => {
  // Initialize game message
  gameStore.setGameMessage('game.messages.welcome')

  // Watch for error changes to start auto-dismiss timer
  const { uiState } = gameStore
  let lastError = uiState.error

  const checkErrorChange = () => {
    const currentError = uiState.error
    if (currentError && currentError !== lastError) {
      startErrorTimer()
      lastError = currentError
    } else if (!currentError && lastError) {
      // Error was cleared, cancel timers and hide toast
      if (toastTimerRef.value) {
        clearTimeout(toastTimerRef.value)
        toastTimerRef.value = null
      }
      if (toastFadeTimerRef.value) {
        clearTimeout(toastFadeTimerRef.value)
        toastFadeTimerRef.value = null
      }
      isToastVisible.value = false
      lastError = currentError
    }
  }

  const unwatchError = gameStore.$subscribe(checkErrorChange)

  // Also check immediately in case there's already an error
  if (uiState.error) {
    startErrorTimer()
  }

  // Cleanup timers on unmount
  onBeforeUnmount(() => {
    if (toastTimerRef.value) {
      clearTimeout(toastTimerRef.value)
    }
    if (toastFadeTimerRef.value) {
      clearTimeout(toastFadeTimerRef.value)
    }
    unwatchError()
  })
})

onBeforeRouteLeave(async (_to, _from, next) => {
  // 僅在回合進行中才提示，避免在 setup 或 game_end 阶段打擾
  const phase = gameStore.gameState.phase
  const isInProgress = !!(
    gameStore.gameState.gameStarted &&
    (phase === 'playing' || phase === 'koikoi')
  )
  if (isInProgress) {
    const confirmMessage =
      t('game.messages.confirmLeave') || '確定要離開遊戲嗎？未保存的進度可能會遺失。'
    const ok = window.confirm(confirmMessage)
    if (!ok) return next(false)
  }

  // 離開時重置遊戲狀態
  try {
    await gameController.resetGame()
  } catch (error) {
    console.error('Error resetting game on route leave:', error)
    // 即使重置失敗也繼續離開
  }

  next()
})
</script>

<style scoped>
/* Toast transition animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease-out;
}

.toast-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.toast-enter-to {
  opacity: 1;
  transform: scale(1);
}

.toast-leave-from {
  opacity: 1;
  transform: scale(1);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
