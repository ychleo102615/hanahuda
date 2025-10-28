<script setup lang="ts">
import { ref, computed } from 'vue';
import type { YakuCard } from '@/types/rules';
import SvgIcon from './SvgIcon.vue';
import { getCardIconName } from '@/utils/cardMapping';

interface Props {
  yakuList: YakuCard[];
}

const props = defineProps<Props>();

// State management for current slide index
const currentIndex = ref(0);

// Computed property for current yaku
const currentYaku = computed(() => {
  return props.yakuList[currentIndex.value] || null;
});

// Navigation methods
const next = () => {
  currentIndex.value = (currentIndex.value + 1) % props.yakuList.length;
};

const prev = () => {
  currentIndex.value =
    (currentIndex.value - 1 + props.yakuList.length) % props.yakuList.length;
};

// Jump to specific index
const goToSlide = (index: number) => {
  currentIndex.value = index;
};

// Format card description with minimum cards info
const formatDescription = (yaku: YakuCard): string => {
  if (yaku.minimumCards) {
    return `${yaku.description} (${yaku.minimumCards}+ cards needed)`;
  }
  return yaku.description;
};

// Get category badge color
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    hikari: 'bg-yellow-500 text-white',
    tanzaku: 'bg-pink-500 text-white',
    tane: 'bg-green-500 text-white',
    kasu: 'bg-gray-500 text-white',
  };
  return colors[category] || 'bg-blue-500 text-white';
};
</script>

<template>
  <div class="relative w-full max-w-4xl mx-auto">
    <!-- Carousel Container -->
    <div class="relative overflow-hidden rounded-lg shadow-lg bg-white p-8 min-h-[560px] flex items-center">
      <!-- Current Yaku Card Display -->
      <div v-if="currentYaku" class="text-center space-y-6 w-full">
        <!-- Yaku Name -->
        <div class="space-y-2">
          <h4 class="text-3xl font-bold text-primary-900">
            {{ currentYaku.name }}
          </h4>
        </div>

        <!-- Category Badge -->
        <div class="flex justify-center">
          <span
            :class="getCategoryColor(currentYaku.category)"
            class="px-4 py-1 rounded-full text-sm font-semibold uppercase tracking-wide"
          >
            {{ currentYaku.category }}
          </span>
        </div>

        <!-- Points -->
        <div class="text-5xl font-bold text-accent-red">
          {{ currentYaku.points }}
          <span class="text-2xl text-gray-600">points</span>
        </div>

        <!-- Description -->
        <p class="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
          {{ formatDescription(currentYaku) }}
        </p>

        <!-- Card Icons -->
        <div v-if="currentYaku.cardIds" class="flex justify-center gap-4 flex-wrap items-center">
          <SvgIcon
            v-for="cardId in currentYaku.cardIds"
            :key="cardId"
            :name="getCardIconName(cardId)"
            class-name="h-32 w-auto drop-shadow-lg transition-transform hover:scale-105"
            :aria-label="`Card ${cardId}`"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center text-gray-500 py-12">
        No Yaku available
      </div>
    </div>

    <!-- Navigation Buttons -->
    <button
      @click="prev"
      :disabled="yakuList.length === 0"
      aria-label="Previous Yaku"
      class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full p-4 shadow-lg transition-all"
    >
      <svg class="w-6 h-6 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <button
      @click="next"
      :disabled="yakuList.length === 0"
      aria-label="Next Yaku"
      class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-full p-4 shadow-lg transition-all"
    >
      <svg class="w-6 h-6 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>

    <!-- Indicator Dots -->
    <div class="flex justify-center gap-2 mt-6">
      <button
        v-for="(_, index) in yakuList"
        :key="index"
        @click="goToSlide(index)"
        :aria-label="`Go to slide ${index + 1}`"
        :class="[
          'w-3 h-3 rounded-full transition-all',
          index === currentIndex
            ? 'bg-primary-900 w-8'
            : 'bg-gray-300 hover:bg-gray-400',
        ]"
      />
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions for navigation */
button {
  transition: all 0.3s ease;
}

button:hover:not(:disabled) {
  transform: scale(1.05);
}

/* Focus visible styles for accessibility */
button:focus-visible {
  outline: 2px solid theme('colors.primary.900');
  outline-offset: 2px;
}
</style>
