<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { HeroSectionProps } from '@/types'

/**
 * HeroSection 組件
 * User Story 1: 快速了解遊戲並開始體驗
 *
 * 功能:
 * - 顯示遊戲標題和副標題
 * - 提供「開始遊戲」CTA 按鈕
 * - 支援響應式設計（桌面/手機）- 使用 Tailwind utility classes
 * - 防止重複點擊導航
 * - 支援鍵盤導航（Tab + Enter）
 *
 * 樣式方法：Tailwind CSS v4 (Utility-First)
 */

// Props 定義
const props = withDefaults(defineProps<HeroSectionProps>(), {
  backgroundImage: ''
})

// Router 實例
const router = useRouter()

// 導航狀態（防止重複點擊）
const isNavigating = ref(false)

/**
 * 處理 CTA 按鈕點擊
 * 導航至遊戲頁面，防止重複點擊
 */
const handleCtaClick = async () => {
  if (isNavigating.value) {
    return
  }

  isNavigating.value = true

  try {
    await router.push(props.ctaTarget)
  } catch (error) {
    console.error('Navigation failed:', error)
  } finally {
    // 延遲重置狀態，確保導航完成
    setTimeout(() => {
      isNavigating.value = false
    }, 1000)
  }
}

/**
 * 處理鍵盤事件（Enter 鍵）
 */
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleCtaClick()
  }
}
</script>

<template>
  <section
    id="hero"
    class="flex items-center justify-center min-h-screen bg-[#f5f1e8] px-8 py-16 text-center bg-cover bg-center bg-no-repeat"
    :style="backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}"
    role="banner"
    aria-label="Hero Section"
  >
    <!-- 內容容器 -->
    <div class="max-w-3xl w-full z-10">
      <!-- 主標題 -->
      <h1
        class="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-[--color-accent-red] mb-6 drop-shadow-sm"
      >
        {{ title }}
      </h1>

      <!-- 副標題 -->
      <p class="text-xl md:text-2xl font-normal leading-relaxed text-gray-700 mb-10">
        {{ subtitle }}
      </p>

      <!-- CTA 按鈕 - 使用 main.css 中定義的 .btn-primary -->
      <button
        class="btn-primary text-lg md:text-xl w-full md:w-auto disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
        :disabled="isNavigating"
        :aria-label="ctaText"
        :aria-busy="isNavigating"
        tabindex="0"
        @click="handleCtaClick"
        @keydown="handleKeyDown"
      >
        {{ isNavigating ? 'Loading...' : ctaText }}
      </button>
    </div>
  </section>
</template>

<style scoped>
/*
 * Tailwind CSS Utility-First 方法
 * 幾乎所有樣式都使用 Tailwind utility classes
 * 僅在極特殊情況下使用 scoped CSS
 *
 * 按鈕樣式使用 main.css 中定義的 .btn-primary
 * 色彩使用 CSS variables (--color-accent-red)
 * 響應式使用 Tailwind breakpoints (md:, lg:)
 */
</style>
