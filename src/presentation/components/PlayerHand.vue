<template>
  <div class="player-hand">
    <div class="player-info">
      <h3 class="player-name">{{ player.name }}</h3>
      <div class="player-stats">
        <span class="score">Score: {{ player.score }}</span>
        <span class="cards-count">Hand: {{ player.handCount }}</span>
        <span class="captured-count">Captured: {{ player.capturedCount }}</span>
      </div>
    </div>
    
    <div class="hand-cards">
      <div class="cards-container">
        <CardComponent
          v-for="card in player.hand"
          :key="card.id"
          :card="card"
          :selectable="canPlayCards"
          :selected="selectedCardId === card.id"
          size="medium"
          @click="handleCardClick"
        />
      </div>
    </div>

    <div v-if="showCaptured" class="captured-cards">
      <h4 class="captured-title">Captured Cards</h4>
      <div class="captured-container">
        <CardComponent
          v-for="card in player.captured"
          :key="`captured-${card.id}`"
          :card="card"
          size="small"
        />
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
}

const props = withDefaults(defineProps<Props>(), {
  canPlayCards: false,
  showCaptured: true,
  isCurrentPlayer: false
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

defineExpose({
  clearSelection: () => {
    selectedCardId.value = null
  },
  getSelectedCard: () => {
    if (!selectedCardId.value) return null
    return props.player.hand.find(c => c.id === selectedCardId.value) || null
  }
})
</script>

<style scoped>
.player-hand {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.player-info {
  margin-bottom: 1rem;
}

.player-name {
  font-size: 1.125rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.player-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.score {
  font-weight: 600;
  color: #3b82f6;
}

.cards-count,
.captured-count {
  color: #6b7280;
}

.hand-cards {
  margin-bottom: 1rem;
}

.cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.captured-cards {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.captured-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.captured-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-height: 8rem;
  overflow-y: auto;
}

.player-hand.current-player {
  border-color: #3b82f6;
  border-width: 2px;
}
</style>