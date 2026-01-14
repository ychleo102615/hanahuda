<script setup lang="ts">
/**
 * PersonalStatsBlock
 *
 * @description
 * 個人統計區塊元件，顯示玩家的遊戲統計數據。
 * 支援時間範圍選擇、載入狀態、錯誤重試、空狀態、未登入提示。
 * 使用金箔蒔絵 (Kinpaku Maki-e) 設計風格。
 *
 * @module pages/index/components/PersonalStatsBlock
 */

import { ref, computed, onMounted, watch } from 'vue'
import YakuStatsAccordion from './YakuStatsAccordion.vue'

// Types
interface YakuCounts {
  [key: string]: number
}

interface PlayerStatistics {
  playerId: string
  totalScore: number
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  koiKoiCalls: number
  multiplierWins: number
  yakuCounts: YakuCounts
  winRate: number
}

type TimeRange = 'all' | 'day' | 'week' | 'month'

interface StatsApiResponse {
  data: {
    statistics: PlayerStatistics
    timeRange: TimeRange
  }
  timestamp: string
}

// Props
const props = defineProps<{
  /** 是否已登入 */
  isLoggedIn: boolean
}>()

// Emits
const emit = defineEmits<{
  login: []
}>()

// State
const activeTimeRange = ref<TimeRange>('all')
const statistics = ref<PlayerStatistics | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Computed - 只在沒有舊資料時才顯示 skeleton
const showSkeleton = computed(() => isLoading.value && statistics.value === null)

// Constants
const timeRanges = computed(() => [
  { id: 'all' as const, label: 'All Time' },
  { id: 'week' as const, label: 'Week' },
  { id: 'month' as const, label: 'Month' },
])

// Computed
const hasNoGames = computed(() =>
  statistics.value !== null && statistics.value.gamesPlayed === 0
)

// Methods
const fetchStatistics = async (timeRange: TimeRange) => {
  if (!props.isLoggedIn) return

  isLoading.value = true
  error.value = null
  // 注意：不清空 statistics，保留舊資料直到新資料到來

  try {
    const response = await $fetch<StatsApiResponse>('/api/v1/stats/me', {
      query: { timeRange },
    })

    statistics.value = response.data.statistics
  }
  catch (e) {
    error.value = 'Failed to load statistics'
    console.error('[PersonalStatsBlock] Fetch error:', e)
  }
  finally {
    isLoading.value = false
  }
}

const handleTimeRangeChange = (timeRange: TimeRange) => {
  if (timeRange === activeTimeRange.value) return
  activeTimeRange.value = timeRange
  fetchStatistics(timeRange)
}

const handleRetry = () => {
  fetchStatistics(activeTimeRange.value)
}

const handleLoginClick = () => {
  emit('login')
}

// Watchers
watch(() => props.isLoggedIn, (newValue) => {
  if (newValue) {
    fetchStatistics(activeTimeRange.value)
  }
  else {
    statistics.value = null
  }
})

// Lifecycle
onMounted(() => {
  if (props.isLoggedIn) {
    fetchStatistics(activeTimeRange.value)
  }
})
</script>

<template>
  <div class="kinpaku-card relative p-5 md:p-6 rounded-xl">
    <!-- Corner Decorations -->
    <div class="kinpaku-corner kinpaku-corner-tl" aria-hidden="true" />
    <div class="kinpaku-corner kinpaku-corner-tr" aria-hidden="true" />
    <div class="kinpaku-corner kinpaku-corner-bl" aria-hidden="true" />
    <div class="kinpaku-corner kinpaku-corner-br" aria-hidden="true" />

    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <h3 class="text-lg md:text-xl font-bold text-white tracking-wide">
          Personal Statistics
        </h3>
      </div>

      <!-- Time Range Selector (only when logged in) -->
      <div v-if="isLoggedIn" class="flex gap-1 p-1 rounded-lg tab-container">
        <button
          v-for="range in timeRanges"
          :key="range.id"
          type="button"
          class="tab-button px-2.5 py-1.5 text-xs md:text-sm font-medium rounded-md cursor-pointer transition-all duration-200 ease-out"
          :class="activeTimeRange === range.id ? 'tab-button-active' : 'text-gray-400 hover:text-white hover:bg-gold-dark/20'"
          @click="handleTimeRangeChange(range.id)"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <!-- Content Area with min-height to prevent layout shift -->
    <div class="min-h-[300px]">
      <!-- Not Logged In State -->
      <div v-if="!isLoggedIn" class="flex flex-col items-center justify-center py-12">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-dark/10 border border-gold-dark/20 mb-5">
          <svg
            class="w-8 h-8 text-gold-light/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <p class="text-gray-400 mb-5 text-center">Sign in to view your statistics</p>
        <button
          type="button"
          class="cta-button px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-all duration-200 ease-out"
          @click="handleLoginClick"
        >
          Sign In
        </button>
      </div>

      <!-- Loading State (delayed to prevent flicker) -->
      <div v-else-if="showSkeleton" class="space-y-4" role="status" aria-label="Loading statistics">
        <div class="grid grid-cols-2 gap-3">
          <div v-for="i in 4" :key="i" class="p-4 rounded-lg bg-lacquer-black/30">
            <div class="h-3 w-16 bg-gold-dark/20 rounded mb-3 animate-pulse" />
            <div class="h-7 w-14 bg-gold-dark/20 rounded animate-pulse" />
          </div>
        </div>
        <span class="sr-only">Loading...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-12">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-900/30 border border-red-700/30 mb-4">
          <svg
            class="w-7 h-7 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p class="text-red-400 mb-4" role="alert">{{ error }}</p>
        <button
          type="button"
          class="cta-button px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-all duration-200 ease-out"
          @click="handleRetry"
        >
          Try Again
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="hasNoGames" class="flex flex-col items-center justify-center py-12">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold-dark/10 border border-gold-dark/20 mb-4">
          <svg
            class="w-7 h-7 text-gold-light/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p class="text-gray-400">No game records yet</p>
        <p class="text-gray-500 text-sm mt-1">Play some games to see your stats!</p>
      </div>

      <!-- Statistics Display -->
      <div v-else-if="statistics" class="space-y-5">
        <!-- Main Stats Grid -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Total Score -->
          <div class="stat-card stat-card-highlight p-4 rounded-lg">
            <div class="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Total Score</div>
            <div
              class="text-xl font-bold tabular-nums"
              :class="statistics.totalScore >= 0 ? 'text-gold-light' : 'text-red-400'"
            >
              {{ statistics.totalScore >= 0 ? '+' : '' }}{{ statistics.totalScore.toLocaleString() }}
            </div>
          </div>

          <!-- Win Rate -->
          <div class="stat-card p-4 rounded-lg">
            <div class="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Win Rate</div>
            <div class="text-xl font-bold tabular-nums text-white">
              {{ statistics.winRate }}%
            </div>
          </div>

          <!-- Games Played -->
          <div class="stat-card p-4 rounded-lg">
            <div class="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Games Played</div>
            <div class="text-xl font-bold tabular-nums text-white">
              {{ statistics.gamesPlayed }}
            </div>
          </div>

          <!-- Win/Loss -->
          <div class="stat-card p-4 rounded-lg">
            <div class="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Win / Loss</div>
            <div class="text-xl font-bold tabular-nums">
              <span class="text-emerald-400">{{ statistics.gamesWon }}</span>
              <span class="text-gray-500 mx-1">/</span>
              <span class="text-red-400">{{ statistics.gamesLost }}</span>
            </div>
          </div>
        </div>

        <!-- Additional Stats -->
        <div class="grid grid-cols-2 gap-3 pt-4 border-t border-gold-dark/15">
          <!-- Koi-Koi Calls -->
          <div class="stat-card-compact p-3 rounded-lg">
            <div class="flex items-center gap-2 mb-1">
              <svg
                class="w-4 h-4 text-gold-light/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span class="text-xs text-gray-500">Koi-Koi Calls</span>
            </div>
            <div class="text-lg font-semibold tabular-nums text-gold-light/90">
              {{ statistics.koiKoiCalls }}
            </div>
          </div>

          <!-- Multiplier Wins -->
          <div class="stat-card-compact p-3 rounded-lg">
            <div class="flex items-center gap-2 mb-1">
              <svg
                class="w-4 h-4 text-gold-light/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span class="text-xs text-gray-500">Multiplier Wins</span>
            </div>
            <div class="text-lg font-semibold tabular-nums text-gold-light/90">
              {{ statistics.multiplierWins }}
            </div>
          </div>
        </div>

        <!-- Yaku Achievements Accordion -->
        <YakuStatsAccordion :yaku-counts="statistics.yakuCounts" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.kinpaku-card {
  background: linear-gradient(180deg, rgba(26, 26, 26, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
  border: 1px solid rgba(139, 105, 20, 0.3);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03), inset 0 0 0 1px rgba(212, 175, 55, 0.05);
}

/* Corner Decorations */
.kinpaku-corner {
  position: absolute;
  width: 0.75rem;
  height: 0.75rem;
  pointer-events: none;
  border: 1px solid rgba(212, 175, 55, 0.4);
}

.kinpaku-corner-tl {
  top: 0.5rem;
  left: 0.5rem;
  border-right: none;
  border-bottom: none;
}

.kinpaku-corner-tr {
  top: 0.5rem;
  right: 0.5rem;
  border-left: none;
  border-bottom: none;
}

.kinpaku-corner-bl {
  bottom: 0.5rem;
  left: 0.5rem;
  border-right: none;
  border-top: none;
}

.kinpaku-corner-br {
  bottom: 0.5rem;
  right: 0.5rem;
  border-left: none;
  border-top: none;
}

/* Tab Container */
.tab-container {
  background: rgba(26, 26, 26, 0.5);
  border: 1px solid rgba(139, 105, 20, 0.2);
}

/* Tab Buttons */
.tab-button-active {
  background: linear-gradient(180deg, #D4AF37 0%, #B8860B 100%);
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
}

/* Stat Cards */
.stat-card {
  background: rgba(26, 26, 26, 0.6);
  border: 1px solid rgba(75, 85, 99, 0.2);
}

.stat-card-highlight {
  background: rgba(139, 105, 20, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.15);
}

/* Compact Stat Cards */
.stat-card-compact {
  background: rgba(26, 26, 26, 0.4);
}

/* CTA Button */
.cta-button {
  background: linear-gradient(180deg, #D4AF37 0%, #B8860B 100%);
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
}

.cta-button:hover {
  background: linear-gradient(180deg, #FFD700 0%, #D4AF37 100%);
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .tab-button,
  .cta-button {
    transition: none;
  }

  .animate-pulse {
    animation: none;
  }
}
</style>
