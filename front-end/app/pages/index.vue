<script setup lang="ts">
import { ref } from 'vue'
import NavigationBar from '~/components/NavigationBar.vue'
import HeroSection from '~/components/HeroSection.vue'
import RulesSection from '~/components/RulesSection.vue'
import Footer from '~/components/Footer.vue'
import type { RuleCategoryUnion, YakuCard } from '~/types/rules'
import type { NavigationLink } from '~/components/NavigationBar.vue'

// Import JSON data
import rulesDataJson from '~/data/rules.json'
import yakuDataJson from '~/data/yaku.json'

// Navigation Bar data
const navigationLinks: NavigationLink[] = [
  { label: 'Rules', target: '#rules', isCta: false },
  { label: 'About', target: '#about', isCta: false },
  { label: 'Start Game', target: '/lobby', isCta: true },
]

// Hero Section data
const heroData = {
  title: 'Hanafuda Koi-Koi',
  subtitle: 'Experience the classic Japanese card game online',
  ctaText: 'Start Playing',
  ctaTarget: '/lobby',
}

// Rules Section data (with proper typing)
const rulesCategories = ref<RuleCategoryUnion[]>(rulesDataJson.categories as RuleCategoryUnion[])
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
      logo="Hanafuda Koi-Koi"
      :links="navigationLinks"
      :transparent="false"
      @rules-click="handleRulesClick"
    />

    <main>
      <!-- Hero Section - overlapping with NavigationBar, full-screen design -->
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
          <h2 class="text-3xl font-bold text-primary-900 mb-4">About Hanafuda Koi-Koi</h2>
          <p class="text-lg text-primary-700">
            This is a demonstration project developed by Leo Huang.
          </p>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<style scoped>
.homepage {
  min-height: 100vh;
}
</style>
