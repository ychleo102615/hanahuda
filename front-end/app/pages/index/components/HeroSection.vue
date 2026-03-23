<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import type { HeroSectionProps } from '~/types'
import HeroCardGrid from './HeroCardGrid.vue'

// Props
const props = defineProps<HeroSectionProps>()

// Router
const router = useRouter()

// State
const isNavigating = ref(false)
const parallaxOffset = ref(0)

// Methods
const handleCtaClick = async () => {
  if (isNavigating.value) return // Prevent duplicate clicks

  isNavigating.value = true
  try {
    await router.push(props.ctaTarget)
  } finally {
    // Reset navigation state (delay to prevent rapid repeated clicks)
    setTimeout(() => {
      isNavigating.value = false
    }, 500)
  }
}

// Keyboard navigation support
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    /* Prevent spacebar from scrolling page, prevent Enter from submitting forms */
    event.preventDefault()
    handleCtaClick()
  }
}

// Parallax scroll effect
const handleScroll = () => {
  parallaxOffset.value = window.scrollY
}

// Lifecycle
onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
<!--
  relative: Allows absolute positioning of inner elements based on this container
  overflow: clip: Clips overflowing content without creating a scroll container
 -->

<template>
  <section
    class="hero-section relative flex min-h-screen items-center justify-center overflow-clip bg-gradient-to-br from-game-table to-game-felt px-6  text-white"
    :style="backgroundImage ? `background-image: url('${backgroundImage}')` : ''"
    aria-labelledby="hero-title"
  >
    <!-- Card grid background with parallax -->
    <div
      class="absolute inset-0"
      :style="{ transform: `translateY(${parallaxOffset * 0.2}px)` }"
    >
      <HeroCardGrid />
    </div>

    <!-- Mask layer — CSS animation: opacity 0.8 → 0.35 after 800ms delay -->
    <!-- Inline style provides initial value before CSS loads (FOUC protection) -->
    <div
      class="animate-mask-dim pointer-events-none absolute inset-0"
      style="background-color: black; opacity: 0.8"
      aria-hidden="true"
    />

    <!-- Main content -->
    <div
      class="pointer-events-none relative z-10 mx-auto max-w-4xl text-center"
      :style="{ transform: `translateY(${parallaxOffset * 0.1}px)` }"
    >
      <!-- Game title — CSS animation starts immediately from SSR HTML -->
      <h1
        id="hero-title"
        class="animate-slide-up-fade-in mb-6 text-4xl font-bold font-serif tracking-wider md:text-6xl lg:text-7xl bg-linear-to-r from-amber-200 via-yellow-100 to-white bg-clip-text text-transparent"
        :style="{
          animationDelay: '100ms',
          textShadow: '0 0 30px rgba(251, 191, 36, 0.3)'
        }"
      >
        <span class="block">Hanafuda Koi-Koi</span>
        <span class="block">こいこい</span>
      </h1>

      <!-- Subtitle -->
      <p
        class="animate-slide-up-fade-in mb-10 text-lg text-gray-200 md:text-xl lg:text-2xl"
        style="animation-delay: 300ms"
      >
        {{ subtitle }}
      </p>

      <!-- CTA Button — fade-in at 500ms, then pulse; hover pauses pulse -->
      <button
        @click="handleCtaClick"
        @keydown="handleKeyDown"
        :disabled="isNavigating"
        :aria-busy="isNavigating"
        :class="[
          'pointer-events-auto inline-flex items-center rounded-lg bg-lacquer-black/80 border border-gold-light text-gold-light px-8 py-4 text-lg font-semibold transition-all duration-300 cursor-pointer',
          'hover:bg-lacquer-black hover:shadow-lg hover:shadow-gold-light/20',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100',
          'md:px-10 md:py-5 md:text-xl',
          !isNavigating && 'animate-hero-cta hover:[animation-play-state:paused]',
        ]"
        tabindex="0"
      >
        <span>{{ ctaText }}</span>
        <svg
          v-if="!isNavigating"
          class="ml-2 h-5 w-5 md:h-6 md:w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
        <svg
          v-else
          class="ml-2 h-5 w-5 animate-spin md:h-6 md:w-6"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Hero Section styles using Tailwind CSS Utility Classes */
/* Background image support (if provided) */
.hero-section[style*='background-image'] {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
</style>
