<script setup lang="ts">
/**
 * LeaderboardBlock
 *
 * @description
 * 排行榜區塊元件，顯示日榜或週榜。
 * 支援切換 Tab、載入狀態、錯誤重試、空狀態顯示。
 * 使用金箔蒔絵 (Kinpaku Maki-e) 設計風格，前三名使用獎牌樣式。
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
const isLoading = ref(false)
const error = ref<string | null>(null)
const hasInitialLoad = ref(false)

// 分別儲存每個 tab 的資料，避免切換時閃爍
const tabData = ref<Record<LeaderboardType, {
  entries: LeaderboardEntry[]
  currentPlayerRank?: number
  loaded: boolean
}>>({
  daily: { entries: [], loaded: false },
  weekly: { entries: [], loaded: false },
})

// 當前 tab 的資料
const entries = computed(() => tabData.value[activeTab.value].entries)
const currentPlayerRank = computed(() => tabData.value[activeTab.value].currentPlayerRank)

// Constants
const LEADERBOARD_LIMIT = 10

// Computed
const tabs = computed(() => [
  { id: 'daily' as const, label: 'Daily' },
  { id: 'weekly' as const, label: 'Weekly' },
])

// 只在該 tab 尚未載入過時才顯示 skeleton
const showSkeleton = computed(() => isLoading.value && !tabData.value[activeTab.value].loaded)

// Methods
const fetchLeaderboard = async (type: LeaderboardType) => {
  // 如果該 tab 已經載入過，不顯示 loading 狀態（背景更新）
  const isFirstLoad = !tabData.value[type].loaded
  if (isFirstLoad) {
    isLoading.value = true
  }
  error.value = null

  try {
    const response = await $fetch<LeaderboardApiResponse>(`/api/v1/leaderboard`, {
      query: {
        type,
        limit: LEADERBOARD_LIMIT,
      },
    })

    tabData.value[type] = {
      entries: response.data.entries,
      currentPlayerRank: response.data.currentPlayerRank,
      loaded: true,
    }
    hasInitialLoad.value = true
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
  // 預載入兩個 tab 的資料，避免切換時閃爍
  fetchLeaderboard('daily')
  fetchLeaderboard('weekly')
})
</script>

<template>
  <div class="kinpaku-card relative p-5 md:p-6 rounded-xl">
    <!-- Corner Decorations -->
    <div class="kinpaku-corner kinpaku-corner-tl" aria-hidden="true" />
    <div class="kinpaku-corner kinpaku-corner-tr" aria-hidden="true" />
    <div class="kinpaku-corner kinpaku-corner-bl" aria-hidden="true" />
    <div class="kinpaku-corner kinpaku-corner-br" aria-hidden="true" />

    <!-- Header with Tabs -->
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
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        <h3 class="text-lg md:text-xl font-bold text-white tracking-wide">
          Leaderboard
        </h3>
      </div>

      <!-- Tab Buttons -->
      <div class="flex gap-1 p-1 rounded-lg tab-container">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tab-button px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 ease-out"
          :class="activeTab === tab.id ? 'tab-button-active' : 'text-gray-400 hover:text-white hover:bg-gold-dark/20'"
          @click="handleTabChange(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Content Area with min-height -->
    <div class="min-h-[300px]">
      <!-- Loading State (Skeleton) -->
      <div v-if="showSkeleton" class="space-y-3" role="status" aria-label="Loading leaderboard">
        <div
          v-for="i in 5"
          :key="i"
          class="flex items-center gap-4 p-3 rounded-lg bg-lacquer-black/30"
        >
          <div class="w-8 h-8 rounded-full bg-gold-dark/20 animate-pulse" />
          <div class="flex-1 h-4 bg-gold-dark/20 rounded animate-pulse" />
          <div class="w-14 h-4 bg-gold-dark/20 rounded animate-pulse" />
        </div>
        <span class="sr-only">Loading...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-10">
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
        class="cta-button px-5 py-2 rounded-lg font-medium cursor-pointer transition-all duration-200 ease-out"
        @click="handleRetry"
      >
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="entries.length === 0" class="text-center py-10">
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <p class="text-gray-400">No leaderboard data yet</p>
      <p class="text-gray-500 text-sm mt-1">Be the first to climb the ranks!</p>
    </div>

    <!-- Leaderboard Entries -->
    <div v-else class="space-y-2">
      <div
        v-for="entry in entries"
        :key="entry.playerId"
        class="leaderboard-entry flex items-center gap-4 p-3 rounded-lg transition-colors duration-150 ease-out"
        :class="entry.rank <= 3 ? 'leaderboard-entry-top3' : ''"
      >
        <!-- Rank Badge - Medal for top 3 -->
        <div
          v-if="entry.rank === 1"
          class="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 ring-2 ring-amber-300/50 shadow-lg shadow-amber-500/30 text-amber-900"
        >
          {{ entry.rank }}
        </div>
        <div
          v-else-if="entry.rank === 2"
          class="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold bg-gradient-to-br from-gray-300 via-slate-200 to-gray-400 ring-2 ring-gray-200/50 shadow-lg shadow-gray-400/30 text-gray-700"
        >
          {{ entry.rank }}
        </div>
        <div
          v-else-if="entry.rank === 3"
          class="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold bg-gradient-to-br from-amber-700 via-orange-600 to-amber-800 ring-2 ring-amber-600/50 shadow-lg shadow-amber-700/30 text-amber-100"
        >
          {{ entry.rank }}
        </div>
        <div
          v-else
          class="rank-badge w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold text-gray-400"
        >
          {{ entry.rank }}
        </div>

        <!-- Player Name -->
        <span class="flex-1 text-white truncate font-medium">
          {{ entry.displayName }}
        </span>

        <!-- Score -->
        <div class="flex items-center gap-1">
          <span class="text-gold-light font-semibold tabular-nums">
            {{ entry.totalScore.toLocaleString() }}
          </span>
          <span class="text-gray-500 text-xs">pts</span>
        </div>
      </div>

      <!-- Current Player Rank (if not in top N) -->
      <div
        v-if="currentPlayerRank"
        class="mt-5 pt-5 border-t border-gold-dark/20"
      >
        <div class="current-player-rank flex items-center gap-4 p-3 rounded-lg">
          <div class="rank-badge-highlight w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold text-gold-light">
            {{ currentPlayerRank }}
          </div>
          <span class="flex-1 text-gold-light/90 font-medium">Your Rank</span>
          <svg
            class="w-5 h-5 text-gold-light/50"
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
      </div>
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

/* Leaderboard Entry */
.leaderboard-entry {
  background: rgba(26, 26, 26, 0.5);
}

.leaderboard-entry:hover {
  background: rgba(139, 105, 20, 0.1);
}

.leaderboard-entry-top3 {
  background: rgba(139, 105, 20, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.1);
}

/* Regular Rank Badge */
.rank-badge {
  background: rgba(75, 85, 99, 0.3);
}

.rank-badge-highlight {
  background: rgba(139, 105, 20, 0.3);
  border: 1px solid rgba(212, 175, 55, 0.3);
}

/* Current Player Rank */
.current-player-rank {
  background: rgba(139, 105, 20, 0.15);
  border: 1px solid rgba(212, 175, 55, 0.2);
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
  .leaderboard-entry,
  .cta-button {
    transition: none;
  }

  .animate-pulse {
    animation: none;
  }
}
</style>
