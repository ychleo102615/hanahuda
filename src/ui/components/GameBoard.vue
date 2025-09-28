<template>
  <div class="bg-green-50 rounded-lg p-6">
    <div class="mb-6">
      <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">{{ t('game.board.fieldCards') }}</h3>
      <div
        class="flex flex-wrap gap-3 justify-center mb-4 min-h-32 p-4 bg-green-200 rounded-lg border-2 border-dashed border-green-500"
      >
        <CardComponent
          v-for="card in fieldCards"
          :key="card.id"
          :card="card"
          :selectable="canSelectField && isMatchingCard(card)"
          :highlighted="isHoverPreview(card) || (isSelectedCardMatch(card) && canSelectField)"
          :class="{ 'animate-pulse': isSelectedCardMatch(card) && canSelectField }"
          size="medium"
          @click="handleFieldCardClick"
        />
      </div>
      <div class="flex justify-center gap-4 text-sm text-gray-600">
        <span class="bg-white px-2 py-1 rounded border border-gray-300"
          >{{ t('game.board.field') }}: {{ fieldCards.length }} {{ t('game.board.cards') }}</span
        >
        <span class="bg-white px-2 py-1 rounded border border-gray-300"
          >{{ t('game.board.deck') }}: {{ deckCount }} {{ t('game.board.cards') }}</span
        >
      </div>
    </div>

    <div v-if="yakuDisplay.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h4 class="text-lg font-bold text-amber-800 mb-3 text-center">{{ t('game.board.yakuAchieved') }}</h4>
      <div class="flex flex-col gap-2">
        <div
          v-for="yaku in yakuDisplay"
          :key="yaku.yaku.name"
          class="flex justify-between items-center bg-white p-2 px-3 rounded border border-yellow-200"
        >
          <span class="font-semibold text-amber-700">{{ yaku.yaku.name }}</span>
          <span class="text-yellow-600 font-bold">{{ yaku.points }} {{ t('game.board.points') }}</span>
        </div>
      </div>
    </div>

    <div class="flex justify-center gap-4 mt-4">
      <button
        v-if="showKoikoiDialog"
        @click="handleKoikoiDecision(true)"
        class="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 border-none cursor-pointer bg-red-500 hover:bg-red-600 hover:scale-105"
      >
        {{ t('game.board.koikoiContinue') }}
      </button>
      <button
        v-if="showKoikoiDialog"
        @click="handleKoikoiDecision(false)"
        class="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 border-none cursor-pointer bg-blue-500 hover:bg-blue-600 hover:scale-105"
      >
        {{ t('game.board.stopGame') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Card } from '@/domain/entities/Card'
import type { GameMove } from '@/domain/entities/GameState'
import type { YakuResult } from '@/domain/entities/Yaku'
import { useLocale } from '@/ui/composables/useLocale'
import CardComponent from './CardComponent.vue'

const { t } = useLocale()

interface Props {
  fieldCards: Card[]
  deckCount: number
  selectedHandCard?: Card | null
  hoveredHandCard?: Card | null
  matchingFieldCards?: readonly Card[]
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
  hoveredHandCard: null,
  matchingFieldCards: () => [],
  canSelectField: false,
  lastMove: null,
  showKoikoiDialog: false,
  yakuDisplay: () => [],
  players: () => [],
})

const emit = defineEmits<Emits>()

const selectedFieldCard = ref<Card | null>(null)

const isMatchingCard = (fieldCard: Card): boolean => {
  if (!props.canSelectField) return false
  return props.matchingFieldCards.some(card => card.id === fieldCard.id)
}

const isSelectedCardMatch = (fieldCard: Card): boolean => {
  return !!props.selectedHandCard && props.matchingFieldCards.some(card => card.id === fieldCard.id)
}

const isHoverPreview = (fieldCard: Card): boolean => {
  return (
    !!props.hoveredHandCard &&
    !props.selectedHandCard &&
    props.matchingFieldCards.some(card => card.id === fieldCard.id)
  )
}

const handleFieldCardClick = (card: Card) => {
  if (!props.canSelectField || !isMatchingCard(card)) return

  selectedFieldCard.value = selectedFieldCard.value?.id === card.id ? null : card
  emit('fieldCardSelected', card)
}

const handleKoikoiDecision = (continueGame: boolean) => {
  emit('koikoiDecision', continueGame)
}

defineExpose({
  clearFieldSelection: () => {
    selectedFieldCard.value = null
  },
  getSelectedFieldCard: () => selectedFieldCard.value,
})

// 監控fieldcards變化
watch(
  () => props.fieldCards,
  (newFieldCards) => {
    console.log('Field cards changed:', newFieldCards)
    console.trace()
  },
)
</script>

<style scoped>
/* All styling is now handled by Tailwind classes in the template */
</style>
