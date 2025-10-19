<template>
  <div class="bg-green-50 rounded-lg p-6">
    <div class="mb-6">
      <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">
        {{ t('game.board.fieldCards') }}
      </h3>
      <div
        class="flex flex-wrap gap-3 justify-center mb-4 min-h-32 p-4 bg-green-200 rounded-lg border-2 border-dashed border-green-500"
      >
        <CardComponent
          v-for="card in fieldCards"
          :key="card.id"
          :card="card"
          :selectable="canSelectField && isMatchingCard(card)"
          :selected="selectedFieldCard?.id === card.id"
          :selected-highlight="isSelectedCardMatch(card) && canSelectField"
          :hovered-highlight="isHoverPreview(card)"
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
      <h4 class="text-lg font-bold text-amber-800 mb-3 text-center">
        {{ t('game.board.yakuAchieved') }}
      </h4>
      <div class="flex flex-col gap-2">
        <div
          v-for="yakuResult in yakuDisplay"
          :key="yakuResult.yaku"
          class="flex justify-between items-center bg-white p-2 px-3 rounded border border-yellow-200"
        >
          <span class="font-semibold text-amber-700">{{ yakuResult.yaku }}</span>
          <span class="text-yellow-600 font-bold"
            >{{ yakuResult.points }} {{ t('game.board.points') }}</span
          >
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
import { ref } from 'vue'
import type { CardDefinition } from '@/game-ui/domain/models/GameViewModel'
import type { YakuResult } from '@/shared/events/base/YakuResult'
import { useLocale } from '@/ui/composables/useLocale'
import CardComponent from './CardComponent.vue'

const { t } = useLocale()

interface Props {
  fieldCards: CardDefinition[]
  deckCount: number
  selectedHandCard?: CardDefinition | null
  hoveredHandCard?: CardDefinition | null
  selectedMatchingFieldCards?: readonly CardDefinition[]
  hoveredMatchingFieldCards?: readonly CardDefinition[]
  canSelectField?: boolean
  showKoikoiDialog?: boolean
  yakuDisplay?: YakuResult[]
  players?: Array<{ id: string; name: string }>
}

interface Emits {
  (e: 'fieldCardSelected', card: CardDefinition): void
  (e: 'koikoiDecision', continueGame: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedHandCard: null,
  hoveredHandCard: null,
  selectedMatchingFieldCards: () => [],
  hoveredMatchingFieldCards: () => [],
  canSelectField: false,
  showKoikoiDialog: false,
  yakuDisplay: () => [],
  players: () => [],
})

const emit = defineEmits<Emits>()

const selectedFieldCard = ref<CardDefinition | null>(null)

const isMatchingCard = (fieldCard: CardDefinition): boolean => {
  if (!props.canSelectField) return false
  return props.selectedMatchingFieldCards.some((card) => card.id === fieldCard.id)
}

const isSelectedCardMatch = (fieldCard: CardDefinition): boolean => {
  return (
    !!props.selectedHandCard &&
    props.selectedMatchingFieldCards.some((card) => card.id === fieldCard.id)
  )
}

const isHoverPreview = (fieldCard: CardDefinition): boolean => {
  return (
    !!props.hoveredHandCard &&
    props.hoveredMatchingFieldCards.some((card) => card.id === fieldCard.id)
  )
}

const handleFieldCardClick = (card: CardDefinition) => {
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
</script>

<style scoped>
/* All styling is now handled by Tailwind classes in the template */
</style>
