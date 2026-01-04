<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import NavigationBar from '~/components/NavigationBar.vue'
import HeroSection from '~/components/HeroSection.vue'
import RulesSection from '~/components/RulesSection.vue'
import Footer from '~/components/Footer.vue'
import LoginModal from '~/identity/adapter/components/LoginModal.vue'
import type { RuleCategoryUnion, YakuCard } from '~/types/rules'
import type { NavigationLink } from '~/components/NavigationBar.vue'
import rulesDataJson from '~/data/rules.json'
import yakuDataJson from '~/data/yaku.json'

// 首頁專用：預留滾動條空間，避免 modal 開啟時內容跳動
onMounted(() => {
  document.documentElement.style.scrollbarGutter = 'stable'
})
onUnmounted(() => {
  document.documentElement.style.scrollbarGutter = ''
})

// Navigation Bar data
// FR-024: Sign In 觸發 Modal，Sign Up 移除（透過 Modal 內的連結前往）
const navigationLinks: NavigationLink[] = [
  { label: 'Rules', target: '#rules', isCta: false },
  { label: 'About', target: '#about', isCta: false },
  { label: 'Sign In', target: '/login', isCta: false },
  { label: 'Start Game', target: '/lobby', isCta: true },
]

// Hero Section data
const heroData = {
  title: 'Hanafuda Koi-Koi こいこい',
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

// FR-024: Login Modal state
const isLoginModalOpen = ref(false)

const handleLoginClick = () => {
  isLoginModalOpen.value = true
}

const handleLoginModalClose = () => {
  isLoginModalOpen.value = false
}

const handleLoginSuccess = () => {
  isLoginModalOpen.value = false
  // Optionally navigate to lobby or refresh user state
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Navigation Bar -->
    <NavigationBar
      logo="Hanafuda Koi-Koi こいこい"
      :links="navigationLinks"
      :transparent="false"
      @rules-click="handleRulesClick"
      @login-click="handleLoginClick"
    />

    <!-- FR-024: Login Modal -->
    <LoginModal
      :is-open="isLoginModalOpen"
      @close="handleLoginModalClose"
      @success="handleLoginSuccess"
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

      <!-- About Section - Project Introduction -->
      <section id="about" class="relative py-16 px-4 bg-primary-900 overflow-hidden">
        <!-- 裝飾元素 -->
        <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
          <!-- 右上角圓形裝飾 -->
          <div class="absolute -right-16 -top-16 w-64 h-64 rounded-full border-2 border-primary-700/30" />
          <!-- 左下角線條裝飾 -->
          <div class="absolute left-8 bottom-8 w-24 h-1 rotate-45 bg-primary-700/20" />
        </div>

        <div class="container mx-auto max-w-6xl relative z-10">
          <!-- 外框卡片 -->
          <div class="bg-primary-800/80 rounded-2xl p-8 md:p-12 border border-primary-700/50">
            <div class="flex flex-col lg:flex-row gap-8 lg:gap-12">
              <!-- 左側：文字內容 -->
              <div class="flex-1 space-y-6">
                <h2 class="text-3xl md:text-4xl font-bold text-white">
                  About the Project
                </h2>
                <p class="text-gray-300 text-lg leading-relaxed">
                  A full-stack web application showcasing modern development practices
                  through the classic Japanese card game Koi-Koi. Built with Clean Architecture,
                  real-time communication, and type-safe database operations.
                </p>
                <!-- 連結 -->
                <div class="flex items-center gap-6 pt-4">
                  <a
                    href="https://github.com/ychleo102615/hanahuda"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                </div>
              </div>

              <!-- 右側：技術棧卡片網格 -->
              <div class="flex-1 lg:max-w-md">
                <div class="grid grid-cols-2 gap-4">
                  <!-- Nuxt 4 -->
                  <div class="bg-primary-700/50 rounded-xl p-6 border border-primary-600/30">
                    <div class="text-2xl md:text-3xl font-bold text-amber-400 mb-2">Nuxt 4</div>
                    <div class="text-gray-300 text-sm">Full-Stack Framework</div>
                  </div>
                  <!-- SSE -->
                  <div class="bg-primary-700/50 rounded-xl p-6 border border-primary-600/30">
                    <div class="text-2xl md:text-3xl font-bold text-amber-400 mb-2">SSE</div>
                    <div class="text-gray-300 text-sm">Real-time Events</div>
                  </div>
                  <!-- Clean Architecture -->
                  <div class="bg-primary-700/50 rounded-xl p-6 border border-primary-600/30">
                    <div class="text-2xl md:text-3xl font-bold text-amber-400 mb-2">CA</div>
                    <div class="text-gray-300 text-sm">Clean Architecture</div>
                  </div>
                  <!-- Drizzle ORM -->
                  <div class="bg-primary-700/50 rounded-xl p-6 border border-primary-600/30">
                    <div class="text-2xl md:text-3xl font-bold text-amber-400 mb-2">Drizzle</div>
                    <div class="text-gray-300 text-sm">Type-Safe ORM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
