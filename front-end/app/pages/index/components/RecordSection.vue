<script setup lang="ts">
/**
 * RecordSection
 *
 * @description
 * 首頁記錄區塊容器，包含排行榜和個人統計。
 * 位於 NavigationSection 下方。
 * 使用金箔蒔絵 (Kinpaku Maki-e) 設計風格。
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
    class="relative py-16 md:py-20 px-4 overflow-hidden"
  >
    <!-- Background with Asanoha Pattern -->
    <div
      class="absolute inset-0 bg-primary-900"
      aria-hidden="true"
    >
      <!-- Asanoha Pattern Overlay -->
      <div class="absolute inset-0 asanoha-pattern" />
    </div>

    <!-- Decorative Gold Blur Accents -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div class="absolute -left-40 top-1/4 w-80 h-80 bg-gold-light/5 rounded-full blur-3xl" />
      <div class="absolute -right-40 bottom-1/4 w-80 h-80 bg-gold-light/5 rounded-full blur-3xl" />
    </div>

    <div class="container mx-auto max-w-6xl relative z-10">
      <!-- Section Header -->
      <div class="text-center mb-10 md:mb-14">
        <!-- Decorative Line -->
        <div class="flex items-center justify-center gap-4 mb-4" aria-hidden="true">
          <div class="w-12 h-px bg-gradient-to-r from-transparent to-gold-dark/60" />
          <svg
            class="w-5 h-5 text-gold-light"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <div class="w-12 h-px bg-gradient-to-l from-transparent to-gold-dark/60" />
        </div>

        <h2 class="text-2xl md:text-3xl font-bold font-serif text-white mb-3 tracking-wide">
          Records
        </h2>
        <p class="text-gray-300 text-sm md:text-base max-w-md mx-auto">
          Check the rankings and track your progress
        </p>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
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

<style scoped>
.asanoha-pattern {
  opacity: 0.06;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23D4AF37' stroke-width='0.5'%3E%3Cpath d='M30 0 L30 60 M0 30 L60 30'/%3E%3Cpath d='M30 0 L0 30 L30 60 L60 30 Z'/%3E%3Cpath d='M15 15 L30 0 L45 15 L30 30 Z'/%3E%3Cpath d='M15 45 L30 30 L45 45 L30 60 Z'/%3E%3Cpath d='M0 30 L15 15 L30 30 L15 45 Z'/%3E%3Cpath d='M30 30 L45 15 L60 30 L45 45 Z'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 60px 60px;
}
</style>
