<script setup lang="ts">
import { ref, computed } from 'vue';
import type { YakuCard } from '~/types/rules';
import SvgIcon from './SvgIcon.vue';
import { getCardIconName } from '~/utils/cardMapping';

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

// Get card icon size based on category
const getCardIconClass = (category: string): string => {
  if (category === 'kasu') {
    return 'h-20 w-auto drop-shadow-lg';
  }
  return 'h-32 w-auto drop-shadow-lg';
};
</script>

<template>
  <div class="relative w-full max-w-4xl mx-auto">
    <!-- Carousel Container -->
    <div class="carousel-container relative overflow-hidden rounded-lg shadow-lg bg-white min-h-[560px] flex items-center">
      <!-- Left Navigation Zone -->
      <button
        v-if="yakuList.length > 1"
        @click="prev"
        aria-label="Previous Yaku"
        class="nav-zone nav-zone-left"
      >
        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Current Yaku Card Display -->
      <div v-if="currentYaku" class="text-center space-y-6 w-full p-8">
        <!-- Yaku Name -->
        <div class="space-y-2">
          <h4 class="text-3xl font-bold text-primary-900">
            {{ currentYaku.name }}
            <span class="text-2xl text-primary-700">({{ currentYaku.nameJa }})</span>
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
            :class-name="getCardIconClass(currentYaku.category)"
            :aria-label="`Card ${cardId}`"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center text-gray-500 py-12 w-full">
        No Yaku available
      </div>

      <!-- Right Navigation Zone -->
      <button
        v-if="yakuList.length > 1"
        @click="next"
        aria-label="Next Yaku"
        class="nav-zone nav-zone-right"
      >
        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

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
/* Navigation Zone Styles */
.nav-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  z-index: 10;
}

.nav-zone-left {
  left: 0;
  border-radius: 0.5rem 0 0 0.5rem;
}

.nav-zone-right {
  right: 0;
  border-radius: 0 0.5rem 0.5rem 0;
}

.nav-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #d1d5db;
  transition: color 0.2s ease;
}

.nav-zone:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.nav-zone:hover .nav-icon {
  color: #374151;
}

.nav-zone:active {
  background-color: rgba(0, 0, 0, 0.12);
}

/* Indicator dot transitions */
.flex.justify-center.gap-2 button {
  transition: all 0.3s ease;
}

/* Focus visible styles for accessibility */
.nav-zone:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-primary-900);
  outline-offset: 2px;
}
</style>
