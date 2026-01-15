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
const isVisible = ref(false)
const isMaskFaded = ref(false)
const showEntryAnimation = ref(true)

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

// Entry animation completion handler
const handleEntryAnimationStop = (event: AnimationEvent) => {
  if (event.animationName.includes('fade-in')) {
    showEntryAnimation.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Add scroll listener
  window.addEventListener('scroll', handleScroll, { passive: true })

  // Trigger entry animation for text content
  setTimeout(() => {
    isVisible.value = true
  }, 100)

  // Trigger mask fade after button animation completes (500ms delay + 600ms animation)
  setTimeout(() => {
    isMaskFaded.value = true
  }, 1200)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
<!--
  relative: Allows absolute positioning of inner elements based on this container
  overflow: hidden: Hides content that overflows the container
 -->

<template>
  <section
    class="hero-section relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-game-table to-game-felt px-6  text-white"
    :style="backgroundImage ? `background-image: url('${backgroundImage}')` : ''"
    aria-labelledby="hero-title"
  >
    <!-- Card grid background -->
    <HeroCardGrid :parallax-offset="parallaxOffset" />

    <!-- Dynamic mask layer - fades from dark to light with entry animation -->
    <div
      class="pointer-events-none absolute inset-0 bg-black transition-opacity duration-[2500ms] ease-out"
      :class="isMaskFaded ? 'opacity-35' : 'opacity-80'"
      aria-hidden="true"
    />

    <!-- Main content -->
    <div
      class="pointer-events-none relative z-10 mx-auto max-w-4xl text-center"
      :style="{ transform: `translateY(${parallaxOffset * 0.1}px)` }"
    >
      <!-- Game title -->
      <h1
        id="hero-title"
        :class="[
          'mb-6 text-4xl font-bold font-serif tracking-tight md:text-6xl lg:text-7xl',
          'bg-linear-to-r from-amber-200 via-yellow-100 to-white bg-clip-text text-transparent',
          'opacity-0',
          isVisible && 'animate-slide-up-fade-in'
        ]"
        :style="{
          animationDelay: '100ms',
          textShadow: '0 0 30px rgba(251, 191, 36, 0.3)'
        }"
      >
        {{ title }}
      </h1>

      <!-- Subtitle -->
      <p
        :class="[
          'mb-10 text-lg text-gray-200 md:text-xl lg:text-2xl',
          'opacity-0',
          isVisible && 'animate-slide-up-fade-in'
        ]"
        :style="{
          animationDelay: '300ms'
        }"
      >
        {{ subtitle }}
      </p>

      <!-- CTA Button -->
      <button
        @click="handleCtaClick"
        @keydown="handleKeyDown"
        @animationend="handleEntryAnimationStop"
        @animationcancel="handleEntryAnimationStop"
        :disabled="isNavigating"
        :aria-busy="isNavigating"
        :class="[
          'pointer-events-auto inline-flex items-center rounded-lg bg-accent-red px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 cursor-pointer',
          'hover:bg-red-600 hover:shadow-xl',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-red',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100',
          'md:px-10 md:py-5 md:text-xl',
          (!isVisible || showEntryAnimation) && 'opacity-0',
          // normal state
          !isNavigating && !showEntryAnimation && 'animate-pulse-subtle hover:animate-none',
          isVisible && showEntryAnimation && 'animate-fade-in'
        ]"
        :style="{
          animationDelay: '500ms'
        }"
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
