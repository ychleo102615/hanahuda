<script setup lang="ts">
import HeroSection from '@/components/HeroSection.vue'

// Hero Section 資料
const heroData = {
  title: 'Hanafuda Koi-Koi',
  subtitle: 'Experience the classic Japanese card game online',
  ctaText: 'Start Playing',
  ctaTarget: '/game',
}
</script>

<template>
  <div class="min-h-screen">
    <main>
      <!-- Hero Section -->
      <HeroSection
        :title="heroData.title"
        :subtitle="heroData.subtitle"
        :cta-text="heroData.ctaText"
        :cta-target="heroData.ctaTarget"
      />

      <!-- 其他區塊將在後續 Phase 整合 -->
      <!-- NavigationBar, RulesSection, Footer -->
    </main>
  </div>
</template>

<style scoped>
.homepage {
  min-height: 100vh;
}
</style>
