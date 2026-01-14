<script setup lang="ts">
/**
 * YakuStatsAccordion
 *
 * @description
 * 役種達成統計摺疊元件，顯示玩家各役種的達成次數。
 * 按達成次數降序排列，支援展開/收合狀態。
 * 使用金箔蒔絵 (Kinpaku Maki-e) 設計風格。
 *
 * @module pages/index/components/YakuStatsAccordion
 */

import { ref, computed } from 'vue'
import yakuDataJson from '~/data/yaku.json'

// Types
interface YakuCounts {
  [key: string]: number
}

interface YakuInfo {
  id: string
  name: string
  nameJa: string
  points: number
}

interface YakuStatItem {
  id: string
  name: string
  nameJa: string
  points: number
  count: number
}

// Props
const props = defineProps<{
  /** 各役種達成次數 */
  yakuCounts: YakuCounts
}>()

// State
const isExpanded = ref(false)

// Computed
/**
 * 從 yaku.json 取得役種元資料
 */
const yakuMetadata = computed<YakuInfo[]>(() =>
  yakuDataJson.yakuList.map((y) => ({
    id: y.id,
    name: y.name,
    nameJa: y.nameJa,
    points: y.points,
  }))
)

/**
 * 合併役種元資料與達成次數，並按次數降序排列
 */
const sortedYakuStats = computed<YakuStatItem[]>(() => {
  const stats = yakuMetadata.value.map((yaku) => ({
    ...yaku,
    count: props.yakuCounts[yaku.id] || 0,
  }))

  // 按達成次數降序排列，相同次數則按點數降序
  return stats.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count
    }
    return b.points - a.points
  })
})

/**
 * 總達成次數
 */
const totalAchievements = computed(() =>
  sortedYakuStats.value.reduce((sum, item) => sum + item.count, 0)
)

/**
 * 是否所有役種達成次數都為 0
 */
const hasNoAchievements = computed(() => totalAchievements.value === 0)

// Methods
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="accordion-wrapper pt-4">
    <!-- Accordion Header -->
    <button
      type="button"
      class="accordion-header w-full flex items-center justify-between p-3.5 rounded-lg cursor-pointer transition-colors duration-200 ease-out"
      :aria-expanded="isExpanded"
      aria-controls="yaku-stats-content"
      @click="toggleExpanded"
    >
      <div class="flex items-center gap-2.5">
        <svg
          class="w-5 h-5 text-gold-light"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        <span class="text-sm font-medium text-white">Yaku Achievements</span>
        <span class="achievement-count px-2 py-0.5 text-xs font-semibold rounded-full">{{ totalAchievements }}</span>
      </div>
      <svg
        class="w-5 h-5 text-gray-400 transition-transform duration-200 ease-out"
        :class="{ 'rotate-180': isExpanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Accordion Content -->
    <div
      v-show="isExpanded"
      id="yaku-stats-content"
      class="mt-3"
    >
      <!-- Empty State -->
      <div v-if="hasNoAchievements" class="text-center py-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold-dark/10 border border-gold-dark/20 mb-3">
          <svg
            class="w-6 h-6 text-gold-light/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <p class="text-gray-400 text-sm">No yaku achieved yet</p>
        <p class="text-gray-500 text-xs mt-1">Complete yaku combinations to see your stats!</p>
      </div>

      <!-- Yaku List -->
      <div v-else class="yaku-list space-y-1.5">
        <div
          v-for="yaku in sortedYakuStats"
          :key="yaku.id"
          class="yaku-item flex items-center justify-between p-2.5 rounded-lg transition-colors duration-150 ease-out"
          :class="{ 'yaku-item-achieved': yaku.count > 0, 'opacity-50': yaku.count === 0 }"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-sm text-white truncate">{{ yaku.name }}</span>
            <span class="text-xs text-gray-500 hidden sm:inline">{{ yaku.nameJa }}</span>
            <span class="yaku-points text-xs px-1.5 py-0.5 rounded">{{ yaku.points }}pts</span>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span
              class="text-sm font-semibold tabular-nums min-w-[1.5rem] text-center"
              :class="yaku.count > 0 ? 'text-gold-light' : 'text-gray-500'"
            >
              {{ yaku.count }}
            </span>
            <span class="text-xs text-gray-500">×</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accordion-wrapper {
  border-top: 1px solid rgba(139, 105, 20, 0.15);
}

.accordion-header {
  background: rgba(26, 26, 26, 0.5);
  border: 1px solid rgba(139, 105, 20, 0.15);
}

.accordion-header:hover {
  background: rgba(139, 105, 20, 0.1);
  border-color: rgba(212, 175, 55, 0.2);
}

.accordion-header:focus-visible {
  outline: none;
  border-color: rgba(212, 175, 55, 0.4);
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.15);
}

.achievement-count {
  background: rgba(139, 105, 20, 0.25);
  color: #D4AF37;
}

.yaku-list {
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 105, 20, 0.3) transparent;
}

.yaku-list::-webkit-scrollbar {
  width: 6px;
}

.yaku-list::-webkit-scrollbar-track {
  background: transparent;
}

.yaku-list::-webkit-scrollbar-thumb {
  background: rgba(139, 105, 20, 0.3);
  border-radius: 3px;
}

.yaku-list::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 105, 20, 0.5);
}

.yaku-item {
  background: rgba(26, 26, 26, 0.3);
}

.yaku-item-achieved {
  background: rgba(139, 105, 20, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.1);
}

.yaku-points {
  background: rgba(139, 105, 20, 0.15);
  color: rgba(212, 175, 55, 0.7);
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .accordion-header,
  .accordion-header svg,
  .yaku-item {
    transition: none;
  }
}
</style>
