<script setup lang="ts">
/**
 * ReconnectionBanner - 重連提示橫幅
 *
 * @description
 * 當 SSE 連線中斷時顯示重連提示，包含連線狀態和進度訊息。
 * 重連成功後顯示短暫的成功訊息。
 */

import { computed } from 'vue'
import { Z_INDEX } from '@/constants'
import { useUIStateStore } from '../../../user-interface/adapter/stores/uiState'

const uiStore = useUIStateStore()

const isVisible = computed(() => {
  return uiStore.reconnecting || uiStore.connectionStatus === 'connecting'
})

const statusMessage = computed(() => {
  if (uiStore.reconnecting) {
    return '連線中斷，正在嘗試重連...'
  }
  if (uiStore.connectionStatus === 'connecting') {
    return '正在連線...'
  }
  return ''
})
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="isVisible"
      class="reconnection-banner"
      role="alert"
      aria-live="polite"
    >
      <div class="banner-content">
        <span class="loading-spinner" aria-hidden="true"></span>
        <span class="status-message">{{ statusMessage }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.reconnection-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: v-bind('Z_INDEX.RECONNECTION');
  background-color: #f59e0b;
  color: white;
  padding: 0.75rem 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.status-message {
  font-family: inherit;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Slide down transition */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
