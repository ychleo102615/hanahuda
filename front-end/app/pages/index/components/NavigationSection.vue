<script setup lang="ts">
/**
 * NavigationSection
 *
 * @description
 * 首頁導航區塊，位於 HeroSection 下方。
 * 提供 Rules、About 錨點連結卡片，讓使用者快速跳轉到頁面各區塊。
 * 使用金箔蒔絵 (Kinpaku Maki-e) 設計風格。
 *
 * @module pages/index/components/NavigationSection
 */

import { useScrollTo } from '~/composables/useScrollTo'

// Emits
const emit = defineEmits<{
  rulesClick: []
}>()

// Composables
const { scrollTo } = useScrollTo()

// Constants
const NAV_HEIGHT = 64 // NavigationBar height

// Navigation cards data
const navCards = [
  {
    id: 'rules',
    title: 'Game Rules',
    description: 'Learn the basics and winning strategies',
    icon: 'book',
  },
  {
    id: 'about',
    title: 'About',
    description: 'About this project and the developer',
    icon: 'info',
  },
]

// Methods
const handleCardClick = (targetId: string, event: Event) => {
  event.preventDefault()

  // 如果是 rules，發送事件讓父元件展開所有規則
  if (targetId === 'rules') {
    emit('rulesClick')
  }

  scrollTo(targetId, NAV_HEIGHT)
}
</script>

<template>
  <section class="relative overflow-hidden">
    <!-- Seigaiha Pattern Background -->
    <div
      class="absolute inset-0 seigaiha-pattern"
      aria-hidden="true"
    />

    <!-- Gold Border Top -->
    <div
      class="absolute top-0 left-0 right-0 h-px gold-border"
      aria-hidden="true"
    />

    <!-- Main Content -->
    <div class="relative bg-game-table/95 backdrop-blur-sm py-8 md:py-10">
      <div class="container mx-auto px-4 max-w-4xl">
        <nav
          aria-label="Page sections"
          class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
        >
          <!-- Navigation Cards -->
          <a
            v-for="card in navCards"
            :key="card.id"
            :href="`#${card.id}`"
            class="nav-card group relative flex items-start gap-4 p-6 rounded-xl cursor-pointer transition-all duration-200 ease-out"
            @click="handleCardClick(card.id, $event)"
          >
            <!-- Icon -->
            <div class="shrink-0 w-12 h-12 rounded-lg bg-gold-dark/20 flex items-center justify-center group-hover:bg-gold-dark/30 transition-colors">
              <!-- Book icon for Rules -->
              <svg
                v-if="card.icon === 'book'"
                class="w-6 h-6 text-gold-light"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <!-- Info icon for About -->
              <svg
                v-else-if="card.icon === 'info'"
                class="w-6 h-6 text-gold-light"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-white group-hover:text-gold-light transition-colors">
                {{ card.title }}
              </h3>
              <p class="text-sm text-gray-400 mt-1">
                {{ card.description }}
              </p>
            </div>

            <!-- Arrow Icon -->
            <div class="shrink-0 self-center">
              <svg
                class="w-5 h-5 text-gold-dark group-hover:text-gold-light group-hover:translate-x-1 transition-all duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </a>
        </nav>
      </div>
    </div>

    <!-- Gold Border Bottom -->
    <div
      class="absolute bottom-0 left-0 right-0 h-px gold-border"
      aria-hidden="true"
    />
  </section>
</template>

<style scoped>
.seigaiha-pattern {
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='50' viewBox='0 0 100 50' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 25 Q25 0 50 25 T100 25' fill='none' stroke='%23D4AF37' stroke-width='1'/%3E%3Cpath d='M0 35 Q25 10 50 35 T100 35' fill='none' stroke='%23D4AF37' stroke-width='0.8'/%3E%3Cpath d='M0 45 Q25 20 50 45 T100 45' fill='none' stroke='%23D4AF37' stroke-width='0.6'/%3E%3C/svg%3E");
  background-size: 100px 50px;
}

.nav-card {
  background: rgba(22, 48, 40, 0.5);
  border: 1px solid rgba(139, 105, 20, 0.3);
}

.nav-card:hover {
  background: rgba(26, 58, 42, 0.6);
  border-color: rgba(212, 175, 55, 0.5);
  box-shadow: 0 0 24px rgba(212, 175, 55, 0.08);
}

.nav-card:focus-visible {
  outline: none;
  border-color: rgba(212, 175, 55, 0.6);
  box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.3);
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .nav-card,
  .nav-card svg,
  .nav-card h3 {
    transition: none;
  }
}
</style>
