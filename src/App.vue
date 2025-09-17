<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
    <header
      class="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 shadow-sm"
    >
      <h1 class="text-xl md:text-2xl font-bold text-gray-800 m-0">花牌遊戲「来来」</h1>
      <nav class="flex gap-4 justify-center">
        <RouterLink
          to="/"
          class="px-4 py-2 no-underline text-gray-600 rounded-md transition-all duration-200 font-medium hover:bg-gray-100 hover:text-gray-800 router-link-exact-active:bg-blue-500 router-link-exact-active:text-white"
          >Home</RouterLink
        >
        <RouterLink
          to="/game"
          class="px-4 py-2 no-underline text-gray-600 rounded-md transition-all duration-200 font-medium hover:bg-gray-100 hover:text-gray-800 router-link-exact-active:bg-blue-500 router-link-exact-active:text-white"
          >Game</RouterLink
        >
        <RouterLink
          to="/about"
          class="px-4 py-2 no-underline text-gray-600 rounded-md transition-all duration-200 font-medium hover:bg-gray-100 hover:text-gray-800 router-link-exact-active:bg-blue-500 router-link-exact-active:text-white"
          >About</RouterLink
        >
      </nav>
    </header>
    <main class="flex-1 flex flex-col">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Tailwind classes are now used in the template instead of custom CSS */
</style>
