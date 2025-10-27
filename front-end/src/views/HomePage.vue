<script setup lang="ts">
import { ref } from 'vue'
import NavigationBar from '@/components/NavigationBar.vue'
import HeroSection from '@/components/HeroSection.vue'
import RulesSection from '@/components/RulesSection.vue'
import type { RuleCategory, YakuCard } from '@/types/rules'
import type { NavigationLink } from '@/components/NavigationBar.vue'

// Import JSON data
import rulesDataJson from '@/data/rules.json'
import yakuDataJson from '@/data/yaku.json'

// Navigation Bar 資料
const navigationLinks: NavigationLink[] = [
  { label: '規則', target: '#rules', isCta: false },
  { label: '關於', target: '#about', isCta: false },
  { label: '開始遊戲', target: '/game', isCta: true },
]

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

// RulesSection ref for programmatic control
const rulesSectionRef = ref<InstanceType<typeof RulesSection> | null>(null)

// Handle rules link click - auto-expand all categories
const handleRulesClick = () => {
  if (rulesSectionRef.value) {
    rulesSectionRef.value.expandAll()
  }
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Navigation Bar -->
    <NavigationBar
      logo="花札 Koi-Koi"
      :links="navigationLinks"
      :transparent="false"
      @rules-click="handleRulesClick"
    />

    <main>
      <!-- Hero Section - 與 NavigationBar 重疊，全螢幕設計 -->
      <section id="hero" class="relative min-h-screen">
        <HeroSection
          :title="heroData.title"
          :subtitle="heroData.subtitle"
          :cta-text="heroData.ctaText"
          :cta-target="heroData.ctaTarget"
        />
      </section>

      <!-- Rules Section -->
      <section id="rules" class="relative">
        <RulesSection
          ref="rulesSectionRef"
          :categories="rulesCategories"
          :yaku-list="yakuList"
        />
      </section>

      <!-- About Section Placeholder -->
      <section id="about" class="relative min-h-[50vh] bg-primary-50 flex items-center justify-center">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-primary-900 mb-4">關於 Hanafuda Koi-Koi</h2>
          <p class="text-lg text-primary-700">
            此區塊將在後續 Phase 實作 (Footer Section)
          </p>
        </div>
      </section>

      <!-- 其他區塊將在後續 Phase 整合 -->
      <!-- Footer -->
    </main>
  </div>
</template>

<style scoped>
.homepage {
  min-height: 100vh;
}
</style>
