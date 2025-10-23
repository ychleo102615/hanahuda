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
 * - 支援響應式設計（桌面/手機）
 * - 防止重複點擊導航
 * - 支援鍵盤導航（Tab + Enter）
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
    class="hero-section"
    :style="backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}"
    role="banner"
    aria-label="Hero Section"
  >
    <div class="hero-content">
      <!-- 主標題 -->
      <h1 class="hero-title">
        {{ title }}
      </h1>

      <!-- 副標題 -->
      <p class="hero-subtitle">
        {{ subtitle }}
      </p>

      <!-- CTA 按鈕 -->
      <button
        class="hero-cta"
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
/* ========================================
   Hero Section 容器
   ======================================== */

.hero-section {
  /* 佈局：Flexbox 置中 */
  display: flex;
  align-items: center;
  justify-content: center;

  /* 尺寸：全視窗高度 */
  min-height: 100vh;

  /* 背景設計：傳統花牌意象融合現代風格 */
  background-color: #f5f1e8; /* 米白色背景 */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  /* 內距 */
  padding: 2rem;

  /* 文字置中 */
  text-align: center;
}

/* ========================================
   Hero Section 內容容器
   ======================================== */

.hero-content {
  max-width: 800px;
  width: 100%;
  z-index: 1; /* 確保內容在背景之上 */
}

/* ========================================
   主標題
   ======================================== */

.hero-title {
  /* 字體樣式 */
  font-size: 3.5rem; /* 桌面版大標題 */
  font-weight: 700;
  line-height: 1.2;

  /* 色彩：深紅色（傳統日式色彩） */
  color: #8b0000;

  /* 間距 */
  margin-bottom: 1.5rem;

  /* 文字陰影（提升可讀性） */
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

/* ========================================
   副標題
   ======================================== */

.hero-subtitle {
  /* 字體樣式 */
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.6;

  /* 色彩：深灰色 */
  color: #333333;

  /* 間距 */
  margin-bottom: 2.5rem;
}

/* ========================================
   CTA 按鈕
   ======================================== */

.hero-cta {
  /* 字體樣式 */
  font-size: 1.25rem;
  font-weight: 600;

  /* 色彩：深紅色背景 + 白色文字 */
  background-color: #8b0000;
  color: #ffffff;

  /* 尺寸 */
  padding: 1rem 2.5rem;

  /* 圓角 */
  border-radius: 0.5rem;

  /* 邊框 */
  border: none;

  /* 游標 */
  cursor: pointer;

  /* 轉場動畫 */
  transition: all 0.3s ease;

  /* 陰影 */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* CTA 按鈕 Hover 狀態 */
.hero-cta:hover:not(:disabled) {
  background-color: #a52a2a; /* 淺一點的紅色 */
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

/* CTA 按鈕 Focus 狀態（鍵盤導航） */
.hero-cta:focus-visible {
  outline: 3px solid #4a90e2; /* 藍色 focus 指示器 */
  outline-offset: 4px;
}

/* CTA 按鈕 Active 狀態 */
.hero-cta:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* CTA 按鈕 Disabled 狀態 */
.hero-cta:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ========================================
   響應式設計：手機版
   ======================================== */

@media (max-width: 768px) {
  .hero-section {
    padding: 1.5rem;
    min-height: 80vh; /* 手機版稍微降低高度 */
  }

  .hero-title {
    font-size: 2.5rem; /* 手機版縮小標題 */
  }

  .hero-subtitle {
    font-size: 1.125rem;
    margin-bottom: 2rem;
  }

  .hero-cta {
    font-size: 1.125rem;
    padding: 0.875rem 2rem;
    width: 100%; /* 手機版按鈕全寬 */
  }
}

/* 超小螢幕 */
@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }
}
</style>
