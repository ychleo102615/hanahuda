<!--
  KoiKoiAnnouncement.vue - 對手 Koi-Koi 公告動畫

  @description
  當對手選擇 Koi-Koi 時，在畫面中央顯示「Koi-Koi!」動畫提示。
  動畫會在 2 秒後自動隱藏（由 NotificationPortAdapter 控制）。

  視覺設計：
  - 金色字體（#D4AF37，text-amber-400）
  - 淡入淡出動畫
  - 置中顯示，不遮擋遊戲操作
-->

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'

const uiState = useUIStateStore()
const { koiKoiAnnouncementVisible } = storeToRefs(uiState)
</script>

<template>
  <Teleport to="body">
    <Transition name="koikoi-fade">
      <div
        v-if="koiKoiAnnouncementVisible"
        class="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
      >
        <div
          class="text-5xl font-bold text-amber-400 drop-shadow-lg animate-pulse"
          style="text-shadow: 0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.3);"
        >
          Koi-Koi!
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.koikoi-fade-enter-active,
.koikoi-fade-leave-active {
  transition: opacity 0.5s ease;
}

.koikoi-fade-enter-from,
.koikoi-fade-leave-to {
  opacity: 0;
}
</style>
