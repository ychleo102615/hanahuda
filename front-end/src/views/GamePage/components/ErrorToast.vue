<template>
  <Transition name="toast-slide">
    <div
      v-if="uiStateStore.errorMessage"
      class="fixed top-4 right-4 z-50 flex items-center gap-3 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-md"
      role="alert"
      aria-live="assertive"
    >
      <svg
        class="w-6 h-6 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <div class="flex-1">
        <p class="text-sm font-medium">{{ uiStateStore.errorMessage }}</p>
      </div>

      <button
        type="button"
        class="flex-shrink-0 ml-4 text-white hover:text-red-100 transition-colors"
        aria-label="Close error message"
        @click="handleClose"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * ErrorToast Component
 *
 * @description
 * 顯示錯誤提示訊息的 Toast 組件。
 * 整合 UIStateStore.errorMessage，自動顯示/隱藏。
 *
 * Features:
 * - 自動從 UIStateStore 讀取錯誤訊息
 * - 支援手動關閉
 * - 3 秒後自動消失（optional）
 * - 滑入/滑出動畫
 */

import { useUIStateStore } from '@/user-interface/adapter/stores/uiState'
import { watch, onMounted } from 'vue'

const uiStateStore = useUIStateStore()

/**
 * 關閉錯誤訊息
 */
function handleClose(): void {
  uiStateStore.errorMessage = null
}

/**
 * 自動消失計時器
 */
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 監聽 errorMessage 變化，設置自動關閉計時器
 */
watch(
  () => uiStateStore.errorMessage,
  (newMessage) => {
    // 清除舊的計時器
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
      autoCloseTimer = null
    }

    // 如果有新訊息，設置 5 秒後自動關閉
    if (newMessage) {
      autoCloseTimer = setTimeout(() => {
        uiStateStore.errorMessage = null
      }, 5000)
    }
  }
)

onMounted(() => {
  console.info('[ErrorToast] Component mounted')
})
</script>

<style scoped>
/* Toast 滑入/滑出動畫 */
.toast-slide-enter-active {
  transition: all 0.3s ease-out;
}

.toast-slide-leave-active {
  transition: all 0.2s ease-in;
}

.toast-slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
