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
            <span class="font-semibold text-blue-500">{{ t('game.player.score') }}: {{ player.totalScore }}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <CardComponent
            v-for="card in handCards"
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
        <h4 class="text-sm font-semibold text-gray-600 mb-2">{{ t('game.player.capturedCards') }}</h4>
        <div class="flex flex-col md:flex-row md:flex-wrap gap-3 md:gap-6 max-h-40 overflow-y-auto">
          <div v-if="hikariCards.length > 0" class="flex-shrink-0">
            <h5 class="text-xs font-medium text-amber-600 mb-1">光</h5>
            <div class="flex flex-wrap gap-1">
              <CardComponent
                v-for="card in hikariCards"
                :key="`hikari-${card.id}`"
                :card="card"
                size="small"
              />
            </div>
          </div>
          <div v-if="taneCards.length > 0" class="flex-shrink-0">
            <h5 class="text-xs font-medium text-green-600 mb-1">種</h5>
            <div class="flex flex-wrap gap-1">
              <CardComponent
                v-for="card in taneCards"
                :key="`tane-${card.id}`"
                :card="card"
                size="small"
              />
            </div>
          </div>
          <div v-if="tanzakuCards.length > 0" class="flex-shrink-0">
            <h5 class="text-xs font-medium text-red-600 mb-1">短歌</h5>
            <div class="flex flex-wrap gap-1">
              <CardComponent
                v-for="card in tanzakuCards"
                :key="`tanzaku-${card.id}`"
                :card="card"
                size="small"
              />
            </div>
          </div>
          <div v-if="kasCards.length > 0" class="flex-shrink-0">
            <h5 class="text-xs font-medium text-gray-500 mb-1">渣</h5>
            <div class="flex flex-wrap gap-1">
              <CardComponent
                v-for="card in kasCards"
                :key="`kas-${card.id}`"
                :card="card"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PlayerViewModel, CardDefinition } from '@/game-ui/domain/models/GameViewModel'
import { useLocale } from '@/ui/composables/useLocale'
import CardComponent from './CardComponent.vue'

const { t } = useLocale()

interface Props {
  player: PlayerViewModel
  cardDefinitions: readonly CardDefinition[]
  canPlayCards?: boolean
  showCaptured?: boolean
  isCurrentPlayer?: boolean
}

interface Emits {
  (e: 'cardSelected', card: CardDefinition): void
  (e: 'cardHovered', card: CardDefinition): void
  (e: 'cardUnhovered', card: CardDefinition): void
}

const props = withDefaults(defineProps<Props>(), {
  canPlayCards: false,
  showCaptured: true,
  isCurrentPlayer: false,
})

const emit = defineEmits<Emits>()

const selectedCardId = ref<string | null>(null)

// 從 cardDefinitions 中查找玩家的手牌
const handCards = computed(() => {
  return props.player.handCardIds
    .map(id => props.cardDefinitions.find(c => c.id === id))
    .filter((c): c is CardDefinition => c !== undefined)
})

// 從 cardDefinitions 中查找玩家的捕獲卡片
const capturedCards = computed(() => {
  return props.player.capturedCardIds
    .map(id => props.cardDefinitions.find(c => c.id === id))
    .filter((c): c is CardDefinition => c !== undefined)
})

const handleCardClick = (card: CardDefinition) => {
  if (!props.canPlayCards) return

  if (selectedCardId.value === card.id) {
    selectedCardId.value = null
  } else {
    selectedCardId.value = card.id
    emit('cardSelected', card)
  }
}

const handleCardHover = (card: CardDefinition) => {
  emit('cardHovered', card)
}

const handleCardUnhover = (card: CardDefinition) => {
  emit('cardUnhovered', card)
}

// Group captured cards by type
const hikariCards = computed(() =>
  capturedCards.value.filter(card => card.type === 'bright')
)

const taneCards = computed(() =>
  capturedCards.value.filter(card => card.type === 'animal')
)

const tanzakuCards = computed(() =>
  capturedCards.value.filter(card => card.type === 'ribbon')
)

const kasCards = computed(() =>
  capturedCards.value.filter(card => card.type === 'plain')
)

defineExpose({
  clearSelection: () => {
    selectedCardId.value = null
  },
  getSelectedCard: () => {
    if (!selectedCardId.value) return null
    return handCards.value.find((c) => c.id === selectedCardId.value) || null
  },
})
</script>

<style scoped>
/* All styling is now handled by Tailwind classes in the template */
</style>
