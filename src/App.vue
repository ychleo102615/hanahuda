<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref } from 'vue'
const gameTitle = ref('花牌遊戲「来来」')
</script>

<template>
  <div
    class="flex flex-col min-h-dvh bg-gradient-to-br from-green-50 to-emerald-50 overscroll-none [touch-action:pan-y]"
  >
    <header
      class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 shadow-sm select-none"
    >
      <h1 class="text-xl md:text-2xl font-bold text-gray-800 m-0">{{ gameTitle }}</h1>
      <nav class="flex gap-4 justify-center">
        <RouterLink to="/" class="nav-link">Home</RouterLink>
        <RouterLink to="/game" class="nav-link">Game</RouterLink>
        <RouterLink to="/about" class="nav-link">About</RouterLink>
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
