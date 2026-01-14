<script setup lang="ts">
/**
 * YakuStatsList
 *
 * @description
 * 役種達成統計列表元件，顯示玩家各役種的達成次數。
 * 按達成次數降序排列，使用固定高度配合 overflow-y: auto。
 * 使用金箔蒔絵 (Kinpaku Maki-e) 設計風格。
 *
 * @module pages/index/components/YakuStatsList
 */

import { computed } from 'vue'
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

/**
 * 後端 yaku_type 到前端 yaku.json id 的對應
 * 後端使用 UPPERCASE_SNAKE_CASE，前端使用 lowercase
 */
const BACKEND_TO_FRONTEND_YAKU_MAP: Record<string, string> = {
  GOKOU: 'goko',
  SHIKOU: 'shiko',
  AME_SHIKOU: 'ameshiko',
  SANKOU: 'sanko',
  AKATAN: 'akatan',
  AOTAN: 'aotan',
  TANZAKU: 'tanzaku',
  INOSHIKACHO: 'inoshikacho',
  HANAMI_ZAKE: 'hanamizake',
  TSUKIMI_ZAKE: 'tsukimizake',
  TANE: 'tane',
  KASU: 'kasu',
}

/**
 * 將後端格式的 yakuCounts 轉換為前端格式
 */
const normalizedYakuCounts = computed<YakuCounts>(() => {
  const result: YakuCounts = {}
  for (const [backendKey, count] of Object.entries(props.yakuCounts)) {
    const frontendKey = BACKEND_TO_FRONTEND_YAKU_MAP[backendKey] || backendKey.toLowerCase()
    result[frontendKey] = (result[frontendKey] || 0) + count
  }
  return result
})

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
  const counts = normalizedYakuCounts.value
  const stats = yakuMetadata.value.map((yaku) => ({
    ...yaku,
    count: counts[yaku.id] || 0,
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
</script>

<template>
  <div class="yaku-stats-section pt-4">
    <!-- Section Header -->
    <div class="section-header flex items-center justify-between p-3 rounded-t-lg">
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
    </div>

    <!-- Yaku List Content -->
    <div class="yaku-list-container rounded-b-lg">
      <!-- Empty State -->
      <div v-if="hasNoAchievements" class="empty-state text-center py-6">
        <div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gold-dark/10 border border-gold-dark/20 mb-2">
          <svg
            class="w-5 h-5 text-gold-light/40"
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
      </div>

      <!-- Yaku List -->
      <div v-else class="yaku-list space-y-1 p-2">
        <div
          v-for="yaku in sortedYakuStats"
          :key="yaku.id"
          class="yaku-item flex items-center justify-between px-2.5 py-2 rounded-md transition-colors duration-150 ease-out"
          :class="{ 'yaku-item-achieved': yaku.count > 0, 'opacity-40': yaku.count === 0 }"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-sm text-white truncate">{{ yaku.name }}</span>
            <span class="text-xs text-gray-500 hidden sm:inline shrink-0">({{ yaku.nameJa }})</span>
            <span class="yaku-points text-xs px-1.5 py-0.5 rounded shrink-0">{{ yaku.points }}pts</span>
          </div>
          <div class="flex items-center gap-1 shrink-0 ml-2">
            <span
              class="text-sm font-semibold tabular-nums min-w-[1.25rem] text-right"
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
.yaku-stats-section {
  border-top: 1px solid rgba(139, 105, 20, 0.15);
}

.section-header {
  background: rgba(26, 26, 26, 0.5);
  border: 1px solid rgba(139, 105, 20, 0.15);
  border-bottom: none;
}

.achievement-count {
  background: rgba(139, 105, 20, 0.25);
  color: #D4AF37;
}

.yaku-list-container {
  background: rgba(26, 26, 26, 0.3);
  border: 1px solid rgba(139, 105, 20, 0.15);
  border-top: none;
  height: 180px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 105, 20, 0.3) transparent;
}

.yaku-list-container::-webkit-scrollbar {
  width: 6px;
}

.yaku-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.yaku-list-container::-webkit-scrollbar-thumb {
  background: rgba(139, 105, 20, 0.3);
  border-radius: 3px;
}

.yaku-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 105, 20, 0.5);
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.yaku-item {
  background: transparent;
}

.yaku-item-achieved {
  background: rgba(139, 105, 20, 0.08);
}

.yaku-item:hover {
  background: rgba(139, 105, 20, 0.1);
}

.yaku-points {
  background: rgba(139, 105, 20, 0.15);
  color: rgba(212, 175, 55, 0.7);
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .yaku-item {
    transition: none;
  }
}
</style>
