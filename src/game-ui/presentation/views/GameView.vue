<template>
  <div class="bg-green-50 overflow-hidden flex flex-col">
    <!-- Header with game info -->
    <div class="text-center py-2 px-4 bg-white shadow-sm">
      <h1 class="text-xl font-bold text-gray-800">{{ t('game.title') }}</h1>
      <div v-if="gameStarted" class="flex justify-center gap-4 text-xs text-gray-600">
        <span>{{ t('game.round', { round: currentRound, maxRounds: 12 }) }}</span>
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
      <div v-if="opponentPlayer" class="px-4 py-2 border-b border-green-200">
        <PlayerHand
          :player="opponentPlayer"
          :card-definitions="cardDefinitions"
          :can-play-cards="false"
          :show-captured="true"
          :is-current-player="!isCurrentPlayerHuman"
        />
      </div>

      <!-- Middle section: Game Board + Actions + Status -->
      <div class="flex-1 flex flex-col justify-center px-4 py-2 overflow-y-auto">
        <!-- Game Board -->
        <div class="mb-4">
          <GameBoard
            :field-cards="fieldCards"
            :deck-count="deckCount"
            :selected-hand-card="selectedHandCard"
            :hovered-hand-card="hoveredHandCard"
            :selected-matching-field-cards="selectedMatchingFieldCards"
            :hovered-matching-field-cards="hoveredMatchingFieldCards"
            :can-select-field="canSelectFieldCard"
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
          v-if="currentPhase === 'round_end' && roundEndInfo"
          class="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4 text-center"
        >
          <h3 class="text-lg font-bold text-yellow-800 mb-2">
            {{ t('game.roundResult.title', { round: currentRound }) }}
          </h3>
          <div v-if="roundEndInfo.winnerId" class="text-green-700 font-medium">
            {{ t('game.roundResult.winner', { winner: getPlayerName(roundEndInfo.winnerId) }) }}
            <br />
            {{ t('game.roundResult.score', { score: roundEndInfo.score }) }}
          </div>
          <div v-else class="text-gray-700 font-medium">
            {{ t('game.roundResult.draw') }}
          </div>
          <div v-if="roundEndInfo.yakuResults && roundEndInfo.yakuResults.length > 0" class="mt-2">
            <div class="text-sm text-gray-600">{{ t('game.roundResult.yakuAchieved') }}</div>
            <div class="flex flex-wrap justify-center gap-1 mt-1">
              <span
                v-for="yaku in roundEndInfo.yakuResults"
                :key="yaku.yaku.name"
                class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs"
              >
                {{ yaku.yaku.name }} ({{ yaku.points }}pts)
              </span>
            </div>
          </div>
          <div v-if="roundEndInfo.koikoiDeclared" class="text-blue-600 text-sm mt-2">
            {{ t('game.roundResult.koikoiDeclared') }}
          </div>
        </div>

        <!-- Game Actions -->
        <div class="flex justify-center gap-4 mb-4">
          <button
            v-if="canPlayCard"
            @click="playSelectedCard"
            :disabled="!selectedHandCard"
            class="bg-green-500 text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {{ t('game.actions.playCard') }}
          </button>

          <button
            v-if="currentPhase === 'round_end'"
            @click="startNextRound"
            class="text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer bg-blue-500 hover:bg-blue-600"
          >
            {{ t('game.actions.nextRound') }}
          </button>

          <button
            v-if="currentPhase === 'game_end'"
            @click="resetToSetup"
            class="text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer bg-purple-500 hover:bg-purple-600"
          >
            {{ t('game.actions.newGame') }}
          </button>

          <button
            v-if="gameStarted && currentPhase !== 'game_end'"
            @click="handleAbandonGame"
            class="text-white py-2 px-6 rounded-lg font-semibold border-none cursor-pointer bg-red-500 hover:bg-red-600"
          >
            {{ t('game.actions.abandonGame') }}
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
      <div v-if="currentPlayerHuman" class="px-4 py-2 border-t border-green-200">
        <PlayerHand
          :player="currentPlayerHuman"
          :card-definitions="cardDefinitions"
          :can-play-cards="isCurrentPlayerHuman && currentPhase === 'playing'"
          :show-captured="true"
          :is-current-player="isCurrentPlayerHuman"
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
        v-if="gameStore.error && isToastVisible"
        class="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      >
        <div
          class="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm mx-4 pointer-events-auto cursor-pointer"
          @click="clearErrorWithAnimation"
        >
          <div class="text-center text-sm font-medium text-red-800">
            {{ gameStore.error }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue'
import type { CardDefinition } from '@/game-ui/domain/models/GameViewModel'
import { DIContainer } from '@/infrastructure/di/DIContainer'
import type { GameController } from '@/game-ui/presentation/controllers/GameController'
import { useGameStore } from '@/game-ui/presentation/stores/gameStore'
import { useLocale } from '@/ui/composables/useLocale'
import PlayerHand from '@/game-ui/presentation/components/PlayerHand.vue'
import GameBoard from '@/game-ui/presentation/components/GameBoard.vue'
import { onBeforeRouteLeave } from 'vue-router'

// Store and Locale
const gameStore = useGameStore()
const { t } = useLocale()

// Inject DI Container
const container = inject<DIContainer>('DIContainer')
if (!container) {
  throw new Error('DIContainer not provided')
}

// Resolve Game Controller
const gameController = container.resolve<GameController>(DIContainer.UI_GAME_CONTROLLER)

// Player setup
const player1Name = ref(t('game.setup.player1'))
const player2Name = ref(t('game.setup.player2'))

// Hover state
const hoveredHandCard = ref<CardDefinition | null>(null)

// Toast auto-dismiss timer and animation
const toastTimerRef = ref<number | null>(null)
const isToastVisible = ref(false)
const toastFadeTimerRef = ref<number | null>(null)

// Refs
const playerHandRef = ref()
const gameBoardRef = ref()

// ==================== Computed Properties ====================

const gameViewModel = computed(() => gameStore.gameViewModel)

const gameStarted = computed(() => gameStore.gameStarted)

const currentPhase = computed(() => gameStore.currentPhase)

const currentRound = computed(() => gameStore.currentRound)

const cardDefinitions = computed(() => {
  return gameViewModel.value?.cardDefinitions || []
})

const currentPlayerHuman = computed(() => {
  if (!gameViewModel.value) return null
  const currentPlayer = gameStore.currentPlayer
  if (!currentPlayer?.isHuman) return null
  return currentPlayer
})

const opponentPlayer = computed(() => gameStore.opponent)

const isCurrentPlayerHuman = computed(() => {
  return gameStore.isPlayerTurn && gameStore.currentPlayer?.isHuman === true
})

const fieldCards = computed(() => {
  if (!gameViewModel.value) return []
  return gameViewModel.value.fieldCardIds
    .map(id => cardDefinitions.value.find(c => c.id === id))
    .filter((c): c is CardDefinition => c !== undefined)
})

const deckCount = computed(() => gameViewModel.value?.deckCardCount || 0)

const selectedHandCard = computed(() => {
  const cardId = gameStore.selectedHandCardId
  if (!cardId) return null
  return cardDefinitions.value.find(c => c.id === cardId) || null
})

const selectedMatchingFieldCards = computed(() => {
  // This would be calculated based on matching logic
  // For now, return empty array - will be implemented when HandleUserInputUseCase provides this
  return [] as CardDefinition[]
})

const hoveredMatchingFieldCards = computed(() => {
  const cardIds = gameStore.hoveredMatchingCardIds
  return cardIds
    .map(id => cardDefinitions.value.find(c => c.id === id))
    .filter((c): c is CardDefinition => c !== undefined)
})

const canSelectFieldCard = computed(() => {
  return gameStore.hasMatchSelectionPending
})

const canPlayCard = computed(() => {
  return gameStore.canPlayCard
})

const showKoikoiDialog = computed(() => {
  return gameStore.isKoikoiDialogVisible
})

const yakuDisplay = computed(() => {
  return gameStore.yakuDisplay
})

const roundEndInfo = computed(() => {
  // Extract from gameViewModel if available
  // This will be populated by events
  return null as any
})

const playerNames = computed(() => {
  if (!gameViewModel.value) return []
  return gameViewModel.value.players.map(p => ({ id: p.id, name: p.name }))
})

const gameMessage = computed(() => {
  return gameStore.gameMessage
})

// ==================== Methods ====================

const getPlayerName = (playerId: string): string => {
  if (!gameViewModel.value) return ''
  const player = gameViewModel.value.getPlayer(playerId)
  return player?.name || ''
}

const startNewGame = async () => {
  try {
    await gameController.startNewGame(player1Name.value, player2Name.value)
    gameStore.setGameStarted(true)
    gameStore.setGameMessage(null)
  } catch (error) {
    console.error('Error starting game:', error)
    gameStore.setError(error instanceof Error ? error.message : 'Failed to start game')
  }
}

const handleHandCardSelected = async (card: CardDefinition) => {
  gameStore.setSelectedHandCard(card.id)
  gameStore.setSelectedFieldCard(null)
  gameBoardRef.value?.clearFieldSelection?.()

  // Get possible matches from controller
  const matchingCardIds = gameController.getPossibleMatches(card.id)
  gameStore.setHoveredMatchingCards(matchingCardIds)
}

const handleFieldCardSelected = async (card: CardDefinition) => {
  gameStore.setSelectedFieldCard(card.id)

  const currentPlayerId = gameStore.currentPlayer?.id
  const handCardId = gameStore.selectedHandCardId

  if (!currentPlayerId || !handCardId) {
    console.error('Missing required data for field card selection')
    return
  }

  try {
    // Send play card command with field card selection
    await gameController.playCard(currentPlayerId, handCardId)
  } catch (error) {
    console.error('Error playing card:', error)
    gameStore.setError(error instanceof Error ? error.message : 'Failed to play card')
  }
}

const playSelectedCard = async () => {
  const handCardId = gameStore.selectedHandCardId
  const currentPlayerId = gameStore.currentPlayer?.id

  if (!handCardId || !currentPlayerId) return

  try {
    await gameController.playCard(currentPlayerId, handCardId)
    gameStore.clearSelections()
  } catch (error) {
    console.error('Error playing card:', error)
    gameStore.setError(error instanceof Error ? error.message : 'Failed to play card')
  }
}

const handleKoikoiDecision = async (continueGame: boolean) => {
  const currentPlayerId = gameStore.currentPlayer?.id
  if (!currentPlayerId) return

  try {
    await gameController.declareKoikoi(currentPlayerId, continueGame)
  } catch (error) {
    console.error('Error declaring Koi-Koi:', error)
    gameStore.setError(error instanceof Error ? error.message : 'Failed to declare Koi-Koi')
  }
}

const startNextRound = async () => {
  try {
    await gameController.startNextRound()
  } catch (error) {
    console.error('Error starting next round:', error)
    gameStore.setError(error instanceof Error ? error.message : 'Failed to start next round')
  }
}

const resetToSetup = () => {
  gameStore.resetGame()
}

const handleAbandonGame = async () => {
  const currentPlayerId = gameStore.currentPlayer?.id
  if (!currentPlayerId) {
    console.error('No current player to abandon game')
    return
  }

  const confirmMessage = t('game.messages.abandonConfirmation') || '確定要放棄遊戲嗎？'
  const confirmed = window.confirm(confirmMessage)

  if (!confirmed) {
    return
  }

  try {
    await gameController.abandonGame(currentPlayerId)
  } catch (error) {
    console.error('Error abandoning game:', error)
    gameStore.setError(error instanceof Error ? error.message : 'Failed to abandon game')
  }
}

const handleHandCardHovered = async (card: CardDefinition) => {
  if (!isCurrentPlayerHuman.value) return
  hoveredHandCard.value = card

  const matchingCardIds = gameController.getPossibleMatches(card.id)
  gameStore.setHoveredMatchingCards(matchingCardIds)
}

const handleHandCardUnhovered = () => {
  hoveredHandCard.value = null
  gameStore.setHoveredMatchingCards([])
}

const clearErrorWithAnimation = () => {
  if (toastTimerRef.value) {
    clearTimeout(toastTimerRef.value)
    toastTimerRef.value = null
  }

  isToastVisible.value = false

  toastFadeTimerRef.value = window.setTimeout(() => {
    gameStore.clearError()
    toastFadeTimerRef.value = null
  }, 300)
}

const startErrorTimer = () => {
  if (toastTimerRef.value) {
    clearTimeout(toastTimerRef.value)
  }

  isToastVisible.value = true

  toastTimerRef.value = window.setTimeout(() => {
    clearErrorWithAnimation()
  }, 3000)
}

onMounted(() => {
  gameStore.setGameMessage(t('game.messages.welcome'))

  // Watch for error changes
  let lastError = gameStore.error

  const checkErrorChange = () => {
    const currentError = gameStore.error
    if (currentError && currentError !== lastError) {
      startErrorTimer()
      lastError = currentError
    } else if (!currentError && lastError) {
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

  if (gameStore.error) {
    startErrorTimer()
  }

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
  const phase = gameStore.currentPhase
  const isInProgress = !!(
    gameStore.gameStarted &&
    (phase === 'playing' || phase === 'koikoi')
  )

  if (isInProgress) {
    const confirmMessage =
      t('game.messages.confirmLeave') || '確定要離開遊戲嗎？未保存的進度可能會遺失。'
    const ok = window.confirm(confirmMessage)
    if (!ok) return next(false)
  }

  gameStore.resetGame()
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
