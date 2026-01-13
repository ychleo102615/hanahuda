<script setup lang="ts">
/**
 * PersonalStatsBlock
 *
 * @description
 * 個人統計區塊元件，顯示玩家的遊戲統計數據。
 * 支援時間範圍選擇、載入狀態、錯誤重試、空狀態、未登入提示。
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

// Constants
const timeRanges = computed(() => [
  { id: 'all' as const, label: 'All Time' },
  { id: 'week' as const, label: 'This Week' },
  { id: 'month' as const, label: 'This Month' },
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
  <div class="bg-primary-800/60 rounded-xl border border-primary-700/50 p-4 md:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg md:text-xl font-bold text-white">
        Personal Statistics
      </h3>

      <!-- Time Range Selector (only when logged in) -->
      <div v-if="isLoggedIn" class="flex gap-1 bg-primary-900/50 p-1 rounded-lg">
        <button
          v-for="range in timeRanges"
          :key="range.id"
          @click="handleTimeRangeChange(range.id)"
          :class="[
            'px-2 py-1 text-xs md:text-sm font-medium rounded-md transition-colors',
            activeTimeRange === range.id
              ? 'bg-amber-500 text-primary-900'
              : 'text-gray-400 hover:text-white hover:bg-primary-700/50'
          ]"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <!-- Not Logged In State -->
    <div v-if="!isLoggedIn" class="text-center py-8">
      <svg
        class="w-12 h-12 mx-auto text-gray-500 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
      <p class="text-gray-400 mb-4">Sign in to view your statistics</p>
      <button
        @click="handleLoginClick"
        class="px-4 py-2 bg-amber-500 text-primary-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
      >
        Sign In
      </button>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="space-y-3" role="status" aria-label="Loading statistics">
      <div class="grid grid-cols-2 gap-3">
        <div v-for="i in 4" :key="i" class="p-3 rounded-lg bg-primary-700/30 animate-pulse">
          <div class="h-3 w-16 bg-primary-600/50 rounded mb-2" />
          <div class="h-6 w-12 bg-primary-600/50 rounded" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-400 mb-4">{{ error }}</p>
      <button
        @click="handleRetry"
        class="px-4 py-2 bg-amber-500 text-primary-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
      >
        Retry
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="hasNoGames" class="text-center py-8">
      <svg
        class="w-12 h-12 mx-auto text-gray-500 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p class="text-gray-400">No game records yet</p>
      <p class="text-gray-500 text-sm mt-1">Play some games to see your stats!</p>
    </div>

    <!-- Statistics Display -->
    <div v-else-if="statistics" class="space-y-4">
      <!-- Main Stats Grid -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Total Score -->
        <div class="p-3 rounded-lg bg-primary-700/50">
          <div class="text-xs text-gray-400 mb-1">Total Score</div>
          <div class="text-xl font-bold" :class="statistics.totalScore >= 0 ? 'text-amber-400' : 'text-red-400'">
            {{ statistics.totalScore >= 0 ? '+' : '' }}{{ statistics.totalScore }}
          </div>
        </div>

        <!-- Win Rate -->
        <div class="p-3 rounded-lg bg-primary-700/50">
          <div class="text-xs text-gray-400 mb-1">Win Rate</div>
          <div class="text-xl font-bold text-white">
            {{ statistics.winRate }}%
          </div>
        </div>

        <!-- Games Played -->
        <div class="p-3 rounded-lg bg-primary-700/50">
          <div class="text-xs text-gray-400 mb-1">Games Played</div>
          <div class="text-xl font-bold text-white">
            {{ statistics.gamesPlayed }}
          </div>
        </div>

        <!-- Win/Loss -->
        <div class="p-3 rounded-lg bg-primary-700/50">
          <div class="text-xs text-gray-400 mb-1">Win / Loss</div>
          <div class="text-xl font-bold">
            <span class="text-green-400">{{ statistics.gamesWon }}</span>
            <span class="text-gray-500 mx-1">/</span>
            <span class="text-red-400">{{ statistics.gamesLost }}</span>
          </div>
        </div>
      </div>

      <!-- Additional Stats -->
      <div class="grid grid-cols-2 gap-3 pt-2 border-t border-primary-700/50">
        <!-- Koi-Koi Calls -->
        <div class="p-3 rounded-lg bg-primary-800/50">
          <div class="text-xs text-gray-400 mb-1">Koi-Koi Calls</div>
          <div class="text-lg font-semibold text-amber-300">
            {{ statistics.koiKoiCalls }}
          </div>
        </div>

        <!-- Multiplier Wins -->
        <div class="p-3 rounded-lg bg-primary-800/50">
          <div class="text-xs text-gray-400 mb-1">Multiplier Wins</div>
          <div class="text-lg font-semibold text-amber-300">
            {{ statistics.multiplierWins }}
          </div>
        </div>
      </div>

      <!-- Yaku Achievements Accordion -->
      <YakuStatsAccordion :yaku-counts="statistics.yakuCounts" />
    </div>
  </div>
</template>
