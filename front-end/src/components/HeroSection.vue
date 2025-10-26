<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { HeroSectionProps } from '@/types'

// Props
const props = defineProps<HeroSectionProps>()

// Router
const router = useRouter()

// State
const isNavigating = ref(false)

// Methods
const handleCtaClick = async () => {
  if (isNavigating.value) return // 防止重複點擊

  isNavigating.value = true
  try {
    await router.push(props.ctaTarget)
  } finally {
    // 重置導航狀態（延遲避免快速重複點擊）
    setTimeout(() => {
      isNavigating.value = false
    }, 500)
  }
}

// 鍵盤導航支援
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    /* 防止空格鍵導致頁面滾動, 防止Enter鍵觸發表單提交 */
    event.preventDefault()
    handleCtaClick()
  }
}
</script>
<!--
  relative: 讓內部元素的絕對定位基於此容器
  overflow: hidden: 隱藏超出容器的內容
 -->

<template>
  <section
    class="hero-section relative flex min-h-[60vh] items-center justify-center overflow-hidden bg-gradient-to-br from-primary-900 to-primary-700 px-6 py-20 text-white md:min-h-[70vh] md:py-32"
    :style="backgroundImage ? `background-image: url('${backgroundImage}')` : ''"
    aria-labelledby="hero-title"
  >
    <!-- 背景裝飾層 -->
    <div class="absolute inset-0 bg-black/30" aria-hidden="true"></div>

    <!-- 主要內容 -->
    <div class="relative z-10 mx-auto max-w-4xl text-center">
      <!-- 遊戲標題 -->
      <h1
        id="hero-title"
        class="mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl"
      >
        {{ title }}
      </h1>

      <!-- 副標題 -->
      <p class="mb-10 text-lg text-gray-200 md:text-xl lg:text-2xl">
        {{ subtitle }}
      </p>

      <!-- CTA 按鈕 -->
      <button
        @click="handleCtaClick"
        @keydown="handleKeyDown"
        :disabled="isNavigating"
        :aria-busy="isNavigating"
        class="inline-flex items-center rounded-lg bg-accent-red px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-red-600 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-red disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 md:px-10 md:py-5 md:text-xl"
        tabindex="0"
      >
        <span>{{ ctaText }}</span>
        <svg
          v-if="!isNavigating"
          class="ml-2 h-5 w-5 md:h-6 md:w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
        <svg
          v-else
          class="ml-2 h-5 w-5 animate-spin md:h-6 md:w-6"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Hero Section 樣式已使用 Tailwind CSS Utility Classes */
/* 背景圖片支援（若有提供） */
.hero-section[style*='background-image'] {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
</style>
