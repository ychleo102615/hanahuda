<script setup lang="ts">
/**
 * RecordSection
 *
 * @description
 * 首頁記錄區塊容器，包含排行榜和個人統計。
 * 位於 NavigationSection 下方。
 *
 * @module pages/index/components/RecordSection
 */

import LeaderboardBlock from './LeaderboardBlock.vue'
import PersonalStatsBlock from './PersonalStatsBlock.vue'

// Props
defineProps<{
  /** 當前登入的玩家 ID (可選) */
  currentPlayerId?: string
  /** 是否已登入 */
  isLoggedIn: boolean
}>()

// Emits
const emit = defineEmits<{
  login: []
}>()

// Methods
const handleLogin = () => {
  emit('login')
}
</script>

<template>
  <section
    id="records"
    class="relative py-12 md:py-16 px-4 bg-primary-900"
  >
    <!-- Background decoration -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div class="absolute -left-32 -top-32 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      <div class="absolute -right-32 -bottom-32 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
    </div>

    <div class="container mx-auto max-w-6xl relative z-10">
      <!-- Section Header -->
      <div class="text-center mb-8 md:mb-12">
        <h2 class="text-2xl md:text-3xl font-bold text-white mb-2">
          Records
        </h2>
        <p class="text-gray-400">
          Check the rankings and track your progress
        </p>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Leaderboard Block -->
        <LeaderboardBlock :current-player-id="currentPlayerId" />

        <!-- Personal Statistics Block -->
        <PersonalStatsBlock
          :is-logged-in="isLoggedIn"
          @login="handleLogin"
        />
      </div>
    </div>
  </section>
</template>
