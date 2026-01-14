<script setup lang="ts">
/**
 * NavigationSection
 *
 * @description
 * 首頁導航區塊，位於 HeroSection 下方。
 * 提供 Records、Rules、About 錨點連結，讓使用者快速跳轉到頁面各區塊。
 * 使用金箔蒔絵 (Kinpaku Maki-e) 設計風格。
 *
 * @module pages/index/components/NavigationSection
 */

import { useScrollTo } from '~/composables/useScrollTo'

// Props
defineProps<{
  /** 是否顯示 Records 連結 (預設 true) */
  showRecords?: boolean
}>()

// Emits
const emit = defineEmits<{
  rulesClick: []
}>()

// Composables
const { scrollTo } = useScrollTo()

// Constants
const NAV_HEIGHT = 64 // NavigationBar height

// Methods
const handleAnchorClick = (targetId: string, event: Event) => {
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
    <div class="relative bg-primary-900/95 backdrop-blur-sm">
      <div class="container mx-auto px-4">
        <nav
          aria-label="Page sections"
          class="flex flex-wrap items-center justify-center gap-2 md:gap-6 py-4 md:py-5"
        >
          <!-- Records -->
          <a
            v-if="showRecords !== false"
            href="#records"
            class="nav-link group relative px-4 py-2 rounded-lg cursor-pointer text-gray-300 hover:text-white transition-all duration-200 ease-out"
            @click="handleAnchorClick('records', $event)"
          >
            <span class="nav-link-bg" />
            <span class="relative flex items-center gap-2">
              <svg
                class="w-5 h-5 text-gold-light group-hover:text-gold-bright transition-colors duration-200"
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
              <span class="text-sm md:text-base font-medium">Records</span>
            </span>
          </a>

          <!-- Decorative Divider -->
          <div
            v-if="showRecords !== false"
            class="hidden md:block w-px h-5 bg-gold-dark/30"
            aria-hidden="true"
          />

          <!-- Rules -->
          <a
            href="#rules"
            class="nav-link group relative px-4 py-2 rounded-lg cursor-pointer text-gray-300 hover:text-white transition-all duration-200 ease-out"
            @click="handleAnchorClick('rules', $event)"
          >
            <span class="nav-link-bg" />
            <span class="relative flex items-center gap-2">
              <svg
                class="w-5 h-5 text-gold-light group-hover:text-gold-bright transition-colors duration-200"
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
              <span class="text-sm md:text-base font-medium">Rules</span>
            </span>
          </a>

          <!-- Decorative Divider -->
          <div
            class="hidden md:block w-px h-5 bg-gold-dark/30"
            aria-hidden="true"
          />

          <!-- About -->
          <a
            href="#about"
            class="nav-link group relative px-4 py-2 rounded-lg cursor-pointer text-gray-300 hover:text-white transition-all duration-200 ease-out"
            @click="handleAnchorClick('about', $event)"
          >
            <span class="nav-link-bg" />
            <span class="relative flex items-center gap-2">
              <svg
                class="w-5 h-5 text-gold-light group-hover:text-gold-bright transition-colors duration-200"
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
              <span class="text-sm md:text-base font-medium">About</span>
            </span>
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

.gold-border {
  background: linear-gradient(90deg, transparent 0%, rgba(139, 105, 20, 0.6) 20%, rgba(212, 175, 55, 0.8) 50%, rgba(139, 105, 20, 0.6) 80%, transparent 100%);
}

.nav-link-bg {
  position: absolute;
  inset: 0;
  border-radius: 0.5rem;
  opacity: 0;
  transition: opacity 200ms ease-out;
  background: linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, rgba(139, 105, 20, 0.04) 100%);
  border: 1px solid rgba(212, 175, 55, 0.15);
}

.nav-link:hover .nav-link-bg {
  opacity: 1;
}

.nav-link:focus-visible {
  outline: none;
}

.nav-link:focus-visible .nav-link-bg {
  opacity: 1;
  border-color: rgba(212, 175, 55, 0.4);
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .nav-link,
  .nav-link-bg,
  .nav-link svg {
    transition: none;
  }
}
</style>
