<script setup lang="ts">
import { ref } from 'vue'
import HeroSection from '@/components/HeroSection.vue'
import RulesSection from '@/components/RulesSection.vue'
import type { RuleCategory, YakuCard } from '@/types/rules'

// Import JSON data
import rulesDataJson from '@/data/rules.json'
import yakuDataJson from '@/data/yaku.json'

// Hero Section 資料
const heroData = {
  title: 'Hanafuda Koi-Koi',
  subtitle: 'Experience the classic Japanese card game online',
  ctaText: 'Start Playing',
  ctaTarget: '/game',
}

// Rules Section 資料 (with proper typing)
const rulesCategories = ref<RuleCategory[]>(rulesDataJson.categories as RuleCategory[])
const yakuList = ref<YakuCard[]>(yakuDataJson.yakuList as YakuCard[])
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

      <!-- Rules Section -->
      <RulesSection
        :categories="rulesCategories"
        :yaku-list="yakuList"
      />

      <!-- 其他區塊將在後續 Phase 整合 -->
      <!-- NavigationBar, Footer -->
    </main>
  </div>
</template>

<style scoped>
.homepage {
  min-height: 100vh;
}
</style>
