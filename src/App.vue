<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">花牌遊戲「来来」</h1>
      <nav class="app-nav">
        <RouterLink to="/" class="nav-link">Home</RouterLink>
        <RouterLink to="/game" class="nav-link">Game</RouterLink>
        <RouterLink to="/about" class="nav-link">About</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
}

.app-header {
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.app-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1f2937;
  margin: 0;
}

.app-nav {
  display: flex;
  gap: 1rem;
}

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

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .app-title {
    font-size: 1.25rem;
  }
  
  .app-nav {
    justify-content: center;
  }
}
</style>
