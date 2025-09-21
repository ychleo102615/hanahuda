<template>
  <div class="bg-green-50 rounded-lg p-6">
    <div class="mb-6">
      <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">Field Cards</h3>
      <div
        class="flex flex-wrap gap-3 justify-center mb-4 min-h-32 p-4 bg-green-200 rounded-lg border-2 border-dashed border-green-500"
      >
        <CardComponent
          v-for="card in fieldCards"
          :key="card.id"
          :card="card"
          :selectable="canSelectField && isMatchingCard(card)"
          :highlighted="isMatchingCard(card) && canSelectField"
          size="medium"
          @click="handleFieldCardClick"
        />
      </div>
      <div class="flex justify-center gap-4 text-sm text-gray-600">
        <span class="bg-white px-2 py-1 rounded border border-gray-300"
          >Field: {{ fieldCards.length }} cards</span
        >
        <span class="bg-white px-2 py-1 rounded border border-gray-300"
          >Deck: {{ deckCount }} cards</span
        >
      </div>
    </div>

    <div class="flex justify-center gap-4 mb-4">
      <button
        v-if="showKoikoiDialog"
        @click="handleKoikoiDecision(true)"
        class="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 border-none cursor-pointer bg-red-500 hover:bg-red-600 hover:scale-105"
      >
        こいこい (Continue)
      </button>
      <button
        v-if="showKoikoiDialog"
        @click="handleKoikoiDecision(false)"
        class="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 border-none cursor-pointer bg-blue-500 hover:bg-blue-600 hover:scale-105"
      >
        やめ (End Round)
      </button>
    </div>

    <div v-if="lastMove" class="bg-gray-100 rounded-lg p-3 mb-4">
      <h4 class="text-sm font-semibold text-gray-600 mb-2">Last Move</h4>
      <div class="flex gap-4 text-xs text-gray-600">
        <span>Player: {{ getPlayerName(lastMove.playerId) }}</span>
        <span>Captured: {{ lastMove.capturedCards.length }} cards</span>
      </div>
    </div>

    <div v-if="yakuDisplay.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h4 class="text-lg font-bold text-amber-800 mb-3 text-center">Yaku Achieved!</h4>
      <div class="flex flex-col gap-2">
        <div
          v-for="yaku in yakuDisplay"
          :key="yaku.yaku.name"
          class="flex justify-between items-center bg-white p-2 px-3 rounded border border-yellow-200"
        >
          <span class="font-semibold text-amber-700">{{ yaku.yaku.name }}</span>
          <span class="text-yellow-600 font-bold">{{ yaku.points }} points</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Card } from '@/domain/entities/Card'
import type { GameMove } from '@/domain/entities/GameState'
import type { YakuResult } from '@/domain/entities/Yaku'
import CardComponent from './CardComponent.vue'

interface Props {
  fieldCards: Card[]
  deckCount: number
  selectedHandCard?: Card | null
  canSelectField?: boolean
  lastMove?: GameMove | null
  showKoikoiDialog?: boolean
  yakuDisplay?: YakuResult[]
  players?: Array<{ id: string; name: string }>
}

interface Emits {
  (e: 'fieldCardSelected', card: Card): void
  (e: 'koikoiDecision', continueGame: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedHandCard: null,
  canSelectField: false,
  lastMove: null,
  showKoikoiDialog: false,
  yakuDisplay: () => [],
  players: () => [],
})

const emit = defineEmits<Emits>()

const selectedFieldCard = ref<Card | null>(null)

const isMatchingCard = (fieldCard: Card): boolean => {
  if (!props.selectedHandCard || !props.canSelectField) return false
  return props.selectedHandCard.suit === fieldCard.suit
}

const handleFieldCardClick = (card: Card) => {
  if (!props.canSelectField || !isMatchingCard(card)) return

  selectedFieldCard.value = selectedFieldCard.value?.id === card.id ? null : card
  emit('fieldCardSelected', card)
}

const handleKoikoiDecision = (continueGame: boolean) => {
  emit('koikoiDecision', continueGame)
}

const getPlayerName = (playerId: string): string => {
  const player = props.players?.find((p) => p.id === playerId)
  return player?.name || 'Unknown Player'
}

defineExpose({
  clearFieldSelection: () => {
    selectedFieldCard.value = null
  },
  getSelectedFieldCard: () => selectedFieldCard.value,
})
</script>

<style scoped>
/* All styling is now handled by Tailwind classes in the template */
</style>
