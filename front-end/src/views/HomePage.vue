<script setup lang="ts">
import { ref } from 'vue'
import NavigationBar from '@/components/NavigationBar.vue'
import HeroSection from '@/components/HeroSection.vue'
import RulesSection from '@/components/RulesSection.vue'
import Footer from '@/components/Footer.vue'
import type { RuleCategory, YakuCard } from '@/types/rules'
import type { NavigationLink } from '@/components/NavigationBar.vue'
import type { AttributionLink } from '@/components/Footer.vue'

// Import JSON data
import rulesDataJson from '@/data/rules.json'
import yakuDataJson from '@/data/yaku.json'

// Navigation Bar data
const navigationLinks: NavigationLink[] = [
  { label: 'Rules', target: '#rules', isCta: false },
  { label: 'About', target: '#about', isCta: false },
  { label: 'Start Game', target: '/game', isCta: true },
]

// Hero Section data
const heroData = {
  title: 'Hanafuda Koi-Koi',
  subtitle: 'Experience the classic Japanese card game online',
  ctaText: 'Start Playing',
  ctaTarget: '/game',
}

// Rules Section data (with proper typing)
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

// Footer data
const footerData = {
  copyrightYear: 2025,
  projectName: 'Hanafuda Koi-Koi',
  attributions: [
    {
      name: 'Hanafuda Card Images',
      source: 'Louie Mantia (dotty-dev/Hanafuda-Louie-Recolor)',
      sourceUrl: 'https://github.com/dotty-dev/Hanafuda-Louie-Recolor',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  ] as AttributionLink[],
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
            Explore the charm of traditional Japanese Hanafuda card game
          </p>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <Footer
      :copyright-year="footerData.copyrightYear"
      :project-name="footerData.projectName"
      :attributions="footerData.attributions"
    />
  </div>
</template>

<style scoped>
.homepage {
  min-height: 100vh;
}
</style>
