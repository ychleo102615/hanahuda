<script setup lang="ts">
/**
 * LeaderboardBlock
 *
 * @description
 * 排行榜區塊元件，顯示日榜或週榜。
 * 支援切換 Tab、載入狀態、錯誤重試、空狀態顯示。
 *
 * @module pages/index/components/LeaderboardBlock
 */

import { ref, computed, onMounted } from 'vue'

// Types
interface LeaderboardEntry {
  playerId: string
  displayName: string
  totalScore: number
  gamesPlayed: number
  gamesWon: number
  rank: number
}

type LeaderboardType = 'daily' | 'weekly'

interface LeaderboardApiResponse {
  data: {
    entries: LeaderboardEntry[]
    type: LeaderboardType
    currentPlayerRank?: number
  }
  timestamp: string
}

// Props
defineProps<{
  /** 當前登入的玩家 ID (可選) */
  currentPlayerId?: string
}>()

// State
const activeTab = ref<LeaderboardType>('daily')
const entries = ref<LeaderboardEntry[]>([])
const currentPlayerRank = ref<number | undefined>(undefined)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Constants
const LEADERBOARD_LIMIT = 10

// Computed
const tabs = computed(() => [
  { id: 'daily' as const, label: 'Daily' },
  { id: 'weekly' as const, label: 'Weekly' },
])

// 只在沒有舊資料時才顯示 skeleton
const showSkeleton = computed(() => isLoading.value && entries.value.length === 0)

// Methods
const fetchLeaderboard = async (type: LeaderboardType) => {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<LeaderboardApiResponse>(`/api/v1/leaderboard`, {
      query: {
        type,
        limit: LEADERBOARD_LIMIT,
      },
    })

    entries.value = response.data.entries
    currentPlayerRank.value = response.data.currentPlayerRank
  }
  catch (e) {
    error.value = 'Failed to load leaderboard'
    console.error('[LeaderboardBlock] Fetch error:', e)
  }
  finally {
    isLoading.value = false
  }
}

const handleTabChange = (type: LeaderboardType) => {
  if (type === activeTab.value) return
  activeTab.value = type
  fetchLeaderboard(type)
}

const handleRetry = () => {
  fetchLeaderboard(activeTab.value)
}

// Lifecycle
onMounted(() => {
  fetchLeaderboard(activeTab.value)
})
</script>

<template>
  <div class="bg-primary-800/60 rounded-xl border border-primary-700/50 p-4 md:p-6">
    <!-- Header with Tabs -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg md:text-xl font-bold text-white">
        Leaderboard
      </h3>

      <!-- Tab Buttons -->
      <div class="flex gap-1 bg-primary-900/50 p-1 rounded-lg">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="handleTabChange(tab.id)"
          :class="[
            'px-3 py-1 text-sm font-medium rounded-md transition-colors',
            activeTab === tab.id
              ? 'bg-amber-500 text-primary-900'
              : 'text-gray-400 hover:text-white hover:bg-primary-700/50'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Loading State (Skeleton) - 只在沒有舊資料時顯示 -->
    <div v-if="showSkeleton" class="space-y-2" role="status" aria-label="Loading leaderboard">
      <div
        v-for="i in 5"
        :key="i"
        class="flex items-center gap-3 p-2 rounded-lg bg-primary-700/30 animate-pulse"
      >
        <div class="w-6 h-6 rounded-full bg-primary-600/50" />
        <div class="flex-1 h-4 bg-primary-600/50 rounded" />
        <div class="w-12 h-4 bg-primary-600/50 rounded" />
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
    <div v-else-if="entries.length === 0" class="text-center py-8">
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
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p class="text-gray-400">No leaderboard data yet</p>
    </div>

    <!-- Leaderboard Entries -->
    <div v-else class="space-y-2">
      <div
        v-for="entry in entries"
        :key="entry.playerId"
        :class="[
          'flex items-center gap-3 p-2 rounded-lg transition-colors',
          entry.rank <= 3
            ? 'bg-primary-700/50'
            : 'bg-primary-800/50 hover:bg-primary-700/30'
        ]"
      >
        <!-- Rank Badge -->
        <div
          :class="[
            'w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold',
            entry.rank === 1 && 'bg-amber-500 text-primary-900',
            entry.rank === 2 && 'bg-gray-300 text-primary-900',
            entry.rank === 3 && 'bg-amber-700 text-white',
            entry.rank > 3 && 'bg-primary-600/50 text-gray-300'
          ]"
        >
          {{ entry.rank }}
        </div>

        <!-- Player Name -->
        <span class="flex-1 text-white truncate">
          {{ entry.displayName }}
        </span>

        <!-- Score -->
        <span class="text-amber-400 font-medium">
          {{ entry.totalScore }}
        </span>
      </div>

      <!-- Current Player Rank (if not in top N) -->
      <div
        v-if="currentPlayerRank"
        class="mt-4 pt-4 border-t border-primary-700/50"
      >
        <div class="flex items-center gap-3 p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
          <div class="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/50 text-amber-200 text-sm font-bold">
            {{ currentPlayerRank }}
          </div>
          <span class="flex-1 text-amber-200">Your Rank</span>
        </div>
      </div>
    </div>
  </div>
</template>
