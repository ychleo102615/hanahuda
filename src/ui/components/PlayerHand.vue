<template>
  <div
    :class="[
      'bg-white rounded-lg shadow-md p-4 border border-gray-200',
      isCurrentPlayer ? 'border-blue-500 border-2' : '',
    ]"
  >
    <div class="flex mb-4">
      <div class="flex-1">
        <div class="mb-4 mr-4 flex justify-between">
          <h3 class="text-lg font-bold text-gray-800 mb-2">{{ player.name }}</h3>
          <div class="flex gap-4 text-sm text-gray-600">
            <span class="font-semibold text-blue-500">Score: {{ player.score }}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <CardComponent
            v-for="card in player.hand"
            :key="card.id"
            :card="card"
            :selectable="canPlayCards"
            :selected="selectedCardId === card.id"
            size="medium"
            @click="handleCardClick"
            @mouseenter="handleCardHover"
            @mouseleave="handleCardUnhover"
          />
        </div>
      </div>

      <div v-if="showCaptured" class="border-l border-gray-200 pl-4 flex-1">
        <h4 class="text-sm font-semibold text-gray-600 mb-2">Captured Cards</h4>
        <div class="flex flex-wrap gap-1 overflow-y-auto">
          <CardComponent
            v-for="card in player.captured"
            :key="`captured-${card.id}`"
            :card="card"
            size="small"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { IPlayer } from '@/application/ports/repositories/PlayerInterface'
import type { Card } from '@/domain/entities/Card'
import CardComponent from './CardComponent.vue'

interface Props {
  player: IPlayer
  canPlayCards?: boolean
  showCaptured?: boolean
  isCurrentPlayer?: boolean
}

interface Emits {
  (e: 'cardSelected', card: Card): void
  (e: 'cardHovered', card: Card): void
  (e: 'cardUnhovered', card: Card): void
}

const props = withDefaults(defineProps<Props>(), {
  canPlayCards: false,
  showCaptured: true,
  isCurrentPlayer: false,
})

const emit = defineEmits<Emits>()

const selectedCardId = ref<string | null>(null)

const handleCardClick = (card: Card) => {
  if (!props.canPlayCards) return

  if (selectedCardId.value === card.id) {
    selectedCardId.value = null
  } else {
    selectedCardId.value = card.id
    emit('cardSelected', card)
  }
}

const handleCardHover = (card: Card) => {
  emit('cardHovered', card)
}

const handleCardUnhover = (card: Card) => {
  emit('cardUnhovered', card)
}

defineExpose({
  clearSelection: () => {
    selectedCardId.value = null
  },
  getSelectedCard: () => {
    if (!selectedCardId.value) return null
    return props.player.hand.find((c) => c.id === selectedCardId.value) || null
  },
})
</script>

<style scoped>
/* All styling is now handled by Tailwind classes in the template */
</style>
