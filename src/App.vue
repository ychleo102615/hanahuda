<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import { useLocale } from '@/ui/composables/useLocale'

const { t, currentLocale, availableLocales, setLocale, getLocaleName } = useLocale()
const showLanguageMenu = ref(false)

const toggleLanguageMenu = () => {
  showLanguageMenu.value = !showLanguageMenu.value
}

const selectLanguage = (locale: string) => {
  setLocale(locale)
  showLanguageMenu.value = false
}

// 點擊外部關閉下拉選單
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.language-selector')) {
    showLanguageMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    class="flex flex-col min-h-dvh bg-gradient-to-br from-green-50 to-emerald-50 overscroll-none [touch-action:pan-y]"
  >
    <header
      class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 shadow-sm select-none"
    >
      <h1 class="text-xl md:text-2xl font-bold text-gray-800 m-0">{{ t('app.title') }}</h1>
      <nav class="flex gap-4 justify-center items-center">
        <RouterLink to="/" class="nav-link">{{ t('app.nav.home') }}</RouterLink>
        <RouterLink to="/game" class="nav-link">{{ t('app.nav.game') }}</RouterLink>
        <RouterLink to="/about" class="nav-link">{{ t('app.nav.about') }}</RouterLink>

        <!-- Language Selector -->
        <div class="relative language-selector">
          <button
            @click="toggleLanguageMenu"
            class="nav-link flex items-center gap-1"
            aria-label="Language selector"
          >
            🌐 {{ getLocaleName(currentLocale) }}
            <svg
              class="w-3 h-3 transition-transform"
              :class="{ 'rotate-180': showLanguageMenu }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="showLanguageMenu"
            class="absolute right-0 mt-2 py-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-50"
          >
            <button
              v-for="locale in availableLocales"
              :key="locale"
              @click="selectLanguage(locale)"
              class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              :class="{ 'bg-blue-50 text-blue-600': locale === currentLocale }"
            >
              {{ getLocaleName(locale) }}
            </button>
          </div>
        </div>
      </nav>
    </header>
    <main class="flex-1 overflow-auto flex flex-col">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Tailwind classes are now used in the template instead of custom CSS */
.nav-link {
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: #4b5563;
  border-radius: 0.375rem;
  transition: all 0.2s;
  font-weight: 500;
}

.nav-link:hover {
  background-color: #f3f4f6;
  color: #1f2937;
}

.nav-link.router-link-exact-active {
  background-color: #3b82f6;
  color: white;
}
</style>
