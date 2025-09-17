<template>
  <div :class="cardClasses" @click="handleClick" :data-card-id="card.id">
    <div class="w-full h-full p-1">
      <div class="flex flex-col items-center justify-between h-full text-center">
        <div class="text-xs font-bold text-gray-600">{{ card.month }}月</div>
        <div :class="getTypeClasses(card.type)">{{ getTypeDisplay(card.type) }}</div>
        <div class="text-[7px] text-gray-500 leading-tight px-1">{{ card.name }}</div>
        <div :class="getPointsClasses(card.type)">{{ card.points }}点</div>
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
  size: 'medium',
})

const emit = defineEmits<Emits>()

const cardClasses = computed(() => {
  const baseClasses = [
    'relative rounded-lg border-2 bg-white shadow-md transition-all duration-200',
    props.size === 'small' ? 'w-12 h-16' : props.size === 'large' ? 'w-20 h-32' : 'w-16 h-24',
    props.selectable ? 'cursor-pointer hover:scale-105' : '',
    props.selected ? 'outline outline-2 outline-blue-500 outline-offset-2' : '',
    props.highlighted ? 'outline outline-2 outline-yellow-400 outline-offset-2 shadow-lg' : '',
  ]

  // Card type specific styling
  if (props.card.type === 'bright') {
    baseClasses.push('bg-amber-100 border-amber-500')
  } else if (props.card.type === 'animal') {
    baseClasses.push('bg-green-100 border-green-500')
  } else if (props.card.type === 'ribbon') {
    baseClasses.push('bg-red-100 border-red-500')
  } else if (props.card.type === 'plain') {
    baseClasses.push('bg-gray-100 border-gray-400')
  } else {
    baseClasses.push('border-gray-300')
  }

  return baseClasses.filter(Boolean).join(' ')
})

const handleClick = () => {
  if (props.selectable) {
    emit('click', props.card)
  }
}

const getTypeDisplay = (type: string): string => {
  const typeMap: Record<string, string> = {
    bright: '光',
    animal: '種',
    ribbon: '短',
    plain: 'カス',
  }
  return typeMap[type] || type
}

const getTypeClasses = (type: string): string => {
  const baseClasses = 'text-xs font-semibold'
  if (type === 'bright') return `${baseClasses} text-amber-700`
  if (type === 'animal') return `${baseClasses} text-green-700`
  if (type === 'ribbon') return `${baseClasses} text-red-600`
  if (type === 'plain') return `${baseClasses} text-gray-600`
  return baseClasses
}

const getPointsClasses = (type: string): string => {
  const baseClasses = 'text-xs font-bold'
  if (type === 'bright') return `${baseClasses} text-amber-800`
  if (type === 'animal') return `${baseClasses} text-green-800`
  if (type === 'ribbon') return `${baseClasses} text-red-700`
  if (type === 'plain') return `${baseClasses} text-gray-800`
  return baseClasses
}
</script>

<style scoped>
/* All styling is now handled by Tailwind classes in the template */
</style>
