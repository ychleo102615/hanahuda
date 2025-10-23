<script setup lang="ts">
import HeroSection from '@/components/HeroSection.vue'
import type { HeroSectionProps } from '@/types'

/**
 * HomePage 首頁組件
 * 整合所有首頁區塊組件
 *
 * Phase 3 (MVP): 僅包含 HeroSection
 * Future: 將整合 NavigationBar, RulesSection, Footer
 */

// Hero Section 配置
const heroConfig: HeroSectionProps = {
  title: '花牌遊戲「來來」',
  subtitle: '體驗傳統日本花牌遊戲的魅力',
  ctaText: '開始遊戲',
  ctaTarget: '/game'
}
</script>

<template>
  <div class="home-page">
    <!-- Phase 3: User Story 1 - Hero Section -->
    <HeroSection
      :title="heroConfig.title"
      :subtitle="heroConfig.subtitle"
      :cta-text="heroConfig.ctaText"
      :cta-target="heroConfig.ctaTarget"
    />

    <!-- Phase 4: User Story 2 - Rules Section (待實作) -->
    <!-- <RulesSection /> -->

    <!-- Phase 5: User Story 3 - Navigation Bar (待實作) -->
    <!-- <NavigationBar /> -->

    <!-- Phase 6: User Story 4 - Footer (待實作) -->
    <!-- <Footer /> -->
  </div>
</template>

<style scoped>
.home-page {
  /* 移除預設間距 */
  margin: 0;
  padding: 0;

  /* 確保頁面完整高度 */
  min-height: 100vh;

  /* 背景色 */
  background-color: #f5f1e8;
}
</style>
