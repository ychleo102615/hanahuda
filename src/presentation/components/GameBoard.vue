<template>
  <div class="game-board">
    <div class="game-field">
      <h3 class="field-title">Field Cards</h3>
      <div class="field-cards">
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
      <div class="field-info">
        <span class="field-count">Field: {{ fieldCards.length }} cards</span>
        <span class="deck-count">Deck: {{ deckCount }} cards</span>
      </div>
    </div>

    <div class="game-actions">
      <button
        v-if="showKoikoiDialog"
        @click="handleKoikoiDecision(true)"
        class="koi-button koi-continue"
      >
        こいこい (Continue)
      </button>
      <button
        v-if="showKoikoiDialog"
        @click="handleKoikoiDecision(false)"
        class="koi-button koi-end"
      >
        やめ (End Round)
      </button>
    </div>

    <div v-if="lastMove" class="last-move">
      <h4 class="move-title">Last Move</h4>
      <div class="move-details">
        <span>Player: {{ getPlayerName(lastMove.playerId) }}</span>
        <span>Captured: {{ lastMove.capturedCards.length }} cards</span>
      </div>
    </div>

    <div v-if="yakuDisplay.length > 0" class="yaku-display">
      <h4 class="yaku-title">Yaku Achieved!</h4>
      <div class="yaku-list">
        <div
          v-for="yaku in yakuDisplay"
          :key="yaku.yaku.name"
          class="yaku-item"
        >
          <span class="yaku-name">{{ yaku.yaku.name }}</span>
          <span class="yaku-points">{{ yaku.points }} points</span>
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
  players: () => []
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
  const player = props.players?.find(p => p.id === playerId)
  return player?.name || 'Unknown Player'
}

defineExpose({
  clearFieldSelection: () => {
    selectedFieldCard.value = null
  },
  getSelectedFieldCard: () => selectedFieldCard.value
})
</script>

<style scoped>
.game-board {
  background-color: #f0fdf4;
  border-radius: 0.5rem;
  padding: 1.5rem;
  min-height: 24rem;
}

.game-field {
  margin-bottom: 1.5rem;
}

.field-title {
  font-size: 1.125rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 1rem;
  text-align: center;
}

.field-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1rem;
  min-height: 8rem;
  padding: 1rem;
  background-color: #dcfce7;
  border-radius: 0.5rem;
  border: 2px dashed #22c55e;
}

.field-info {
  display: flex;
  justify-content: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: #4b5563;
}

.field-count,
.deck-count {
  background-color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
}

.game-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.koi-button {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  color: white;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.koi-button:hover {
  transform: scale(1.05);
}

.koi-continue {
  background-color: #ef4444;
}

.koi-continue:hover {
  background-color: #dc2626;
}

.koi-end {
  background-color: #3b82f6;
}

.koi-end:hover {
  background-color: #2563eb;
}

.last-move {
  background-color: #f3f4f6;
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.move-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.move-details {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #4b5563;
}

.yaku-display {
  background-color: #fefce8;
  border: 1px solid #fde047;
  border-radius: 0.5rem;
  padding: 1rem;
}

.yaku-title {
  font-size: 1.125rem;
  font-weight: bold;
  color: #92400e;
  margin-bottom: 0.75rem;
  text-align: center;
}

.yaku-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.yaku-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  border: 1px solid #fde047;
}

.yaku-name {
  font-weight: 600;
  color: #b45309;
}

.yaku-points {
  color: #d97706;
  font-weight: bold;
}
</style>