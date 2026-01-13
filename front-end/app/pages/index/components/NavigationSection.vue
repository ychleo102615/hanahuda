<script setup lang="ts">
/**
 * NavigationSection
 *
 * @description
 * 首頁導航區塊，位於 HeroSection 下方。
 * 提供 Records、Rules、About 錨點連結，讓使用者快速跳轉到頁面各區塊。
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
  <section class="bg-primary-800 border-t border-b border-primary-700/50">
    <div class="container mx-auto px-4">
      <nav
        aria-label="Page sections"
        class="flex flex-wrap items-center justify-center gap-4 md:gap-8 py-4 md:py-6"
      >
        <!-- Records -->
        <a
          v-if="showRecords !== false"
          href="#records"
          class="group flex items-center gap-2 px-4 py-2 text-sm md:text-base font-medium text-gray-300 hover:text-white transition-colors"
          @click="handleAnchorClick('records', $event)"
        >
          <svg
            class="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors"
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
          <span>Records</span>
        </a>

        <!-- Rules -->
        <a
          href="#rules"
          class="group flex items-center gap-2 px-4 py-2 text-sm md:text-base font-medium text-gray-300 hover:text-white transition-colors"
          @click="handleAnchorClick('rules', $event)"
        >
          <svg
            class="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span>Rules</span>
        </a>

        <!-- About -->
        <a
          href="#about"
          class="group flex items-center gap-2 px-4 py-2 text-sm md:text-base font-medium text-gray-300 hover:text-white transition-colors"
          @click="handleAnchorClick('about', $event)"
        >
          <svg
            class="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>About</span>
        </a>
      </nav>
    </div>
  </section>
</template>
