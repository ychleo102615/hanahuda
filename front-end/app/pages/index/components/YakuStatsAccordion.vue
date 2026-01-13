<script setup lang="ts">
/**
 * YakuStatsAccordion
 *
 * @description
 * 役種達成統計摺疊元件，顯示玩家各役種的達成次數。
 * 按達成次數降序排列，支援展開/收合狀態。
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
  <div class="border-t border-primary-700/50 pt-4">
    <!-- Accordion Header -->
    <button
      type="button"
      class="w-full flex items-center justify-between p-3 rounded-lg bg-primary-800/50 hover:bg-primary-700/50 transition-colors"
      :aria-expanded="isExpanded"
      aria-controls="yaku-stats-content"
      @click="toggleExpanded"
    >
      <div class="flex items-center gap-2">
        <svg
          class="w-5 h-5 text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        <span class="text-sm font-medium text-white">Yaku Achievements</span>
        <span class="text-xs text-gray-400">({{ totalAchievements }} total)</span>
      </div>
      <svg
        class="w-5 h-5 text-gray-400 transition-transform duration-200"
        :class="{ 'rotate-180': isExpanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
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
      class="mt-3 space-y-2"
    >
      <!-- Empty State -->
      <div v-if="hasNoAchievements" class="text-center py-6">
        <svg
          class="w-10 h-10 mx-auto text-gray-500 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
        <p class="text-gray-400 text-sm">No yaku achieved yet</p>
        <p class="text-gray-500 text-xs mt-1">Complete yaku combinations to see your stats!</p>
      </div>

      <!-- Yaku List -->
      <div v-else class="grid grid-cols-1 gap-2">
        <div
          v-for="yaku in sortedYakuStats"
          :key="yaku.id"
          class="flex items-center justify-between p-2 rounded-lg"
          :class="yaku.count > 0 ? 'bg-primary-700/30' : 'bg-primary-800/20 opacity-50'"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm text-white">{{ yaku.name }}</span>
            <span class="text-xs text-gray-500">{{ yaku.nameJa }}</span>
            <span class="text-xs text-amber-400/70">({{ yaku.points }}pts)</span>
          </div>
          <div class="flex items-center gap-1">
            <span
              class="text-sm font-semibold"
              :class="yaku.count > 0 ? 'text-amber-400' : 'text-gray-500'"
            >
              {{ yaku.count }}
            </span>
            <span class="text-xs text-gray-500">times</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
