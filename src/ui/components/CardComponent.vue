<template>
  <div 
    :class="cardClasses"
    @click="handleClick"
    :data-card-id="card.id"
  >
    <div class="card-inner">
      <div class="card-content">
        <div class="card-suit">{{ card.month }}月</div>
        <div class="card-type">{{ getTypeDisplay(card.type) }}</div>
        <div class="card-name">{{ card.name }}</div>
        <div class="card-points">{{ card.points }}点</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/domain/entities/Card'

interface Props {
  card: Card
  selectable?: boolean
  selected?: boolean
  highlighted?: boolean
  size?: 'small' | 'medium' | 'large'
}

interface Emits {
  (e: 'click', card: Card): void
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  selected: false,
  highlighted: false,
  size: 'medium'
})

const emit = defineEmits<Emits>()

const cardClasses = computed(() => [
  'hanafuda-card',
  `card-${props.size}`,
  `card-${props.card.type}`,
  `card-month-${props.card.month}`,
  {
    'card-selectable': props.selectable,
    'card-selected': props.selected,
    'card-highlighted': props.highlighted,
    'hover:scale-105': props.selectable,
    'cursor-pointer': props.selectable
  }
])

const handleClick = () => {
  if (props.selectable) {
    emit('click', props.card)
  }
}

const getTypeDisplay = (type: string): string => {
  const typeMap: Record<string, string> = {
    'bright': '光',
    'animal': '種',
    'ribbon': '短',
    'plain': 'カス'
  }
  return typeMap[type] || type
}
</script>

<style scoped>
.hanafuda-card {
  position: relative;
  border-radius: 0.5rem;
  border: 2px solid #d1d5db;
  background-color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.card-small {
  width: 3rem;
  height: 4rem;
}

.card-medium {
  width: 4rem;
  height: 6rem;
}

.card-large {
  width: 5rem;
  height: 8rem;
}

.card-inner {
  width: 100%;
  height: 100%;
  padding: 0.25rem;
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  text-align: center;
}

.card-suit {
  font-size: 0.75rem;
  font-weight: bold;
  color: #4b5563;
}

.card-type {
  font-size: 0.75rem;
  font-weight: 600;
}

.card-name {
  font-size: 7px;
  color: #6b7280;
  line-height: 1.25;
  padding: 0 0.25rem;
}

.card-points {
  font-size: 0.75rem;
  font-weight: bold;
}

.card-bright {
  background-color: #fef3c7;
  border-color: #f59e0b;
}

.card-bright .card-type {
  color: #b45309;
}

.card-bright .card-points {
  color: #92400e;
}

.card-animal {
  background-color: #dcfce7;
  border-color: #22c55e;
}

.card-animal .card-type {
  color: #15803d;
}

.card-animal .card-points {
  color: #166534;
}

.card-ribbon {
  background-color: #fecaca;
  border-color: #ef4444;
}

.card-ribbon .card-type {
  color: #dc2626;
}

.card-ribbon .card-points {
  color: #b91c1c;
}

.card-plain {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.card-plain .card-type {
  color: #374151;
}

.card-plain .card-points {
  color: #1f2937;
}

.card-selectable {
  cursor: pointer;
}

.card-selectable:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.card-selected {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.card-highlighted {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
</style>