<!--
  MatchmakingErrorModal.vue - 配對錯誤 Modal

  @description
  在 Lobby 端顯示 getPlayerStatus API 的網路錯誤。
  設計風格參考 GameFinishedModal.vue。

  注意：
  - ALREADY_IN_QUEUE 和 ALREADY_IN_GAME 錯誤由狀態衝突對話框處理
  - 此 Modal 只處理網路相關錯誤

  Features:
  - 淡入/淡出動畫
  - 顯示錯誤訊息和重試按鈕
-->

<template>
  <Transition name="modal-fade">
    <div
      v-if="visible"
      class="fixed inset-0 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
      :style="{ zIndex: Z_INDEX.MODAL }"
      @click.self="handleDismiss"
    >
      <div
        class="modal-panel rounded-lg max-w-md w-full mx-4 overflow-hidden transform transition-all"
      >
        <!-- Header -->
        <div class="px-6 py-5 text-white modal-header bg-gradient-to-r from-red-600/80 to-red-700/80">
          <div class="flex items-center justify-center gap-2">
            <svg
              class="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
            <h2 id="error-modal-title" class="text-2xl font-bold text-center">
              {{ errorTitle }}
            </h2>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 py-6">
          <p class="text-center text-gray-300">
            {{ errorMessage || 'An error occurred. Please try again.' }}
          </p>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 modal-footer">
          <!-- Default: Retry (用於網路錯誤) -->
          <div class="flex gap-3 justify-end">
            <button
              type="button"
              class="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              @click="handleDismiss"
            >
              Close
            </button>
            <button
              type="button"
              data-testid="retry-button"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
              @click="$emit('retry')"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * MatchmakingErrorModal Component
 *
 * @description
 * 配對錯誤時顯示的 Modal，根據錯誤類型提供不同操作選項。
 */

import { computed } from 'vue'
import { Z_INDEX } from '~/constants'

interface Props {
  visible: boolean
  errorCode: string | null
  errorMessage: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  dismiss: []
  retry: []
}>()

/**
 * 錯誤標題
 *
 * @description
 * 此 Modal 在 Lobby 端只處理網路錯誤。
 * ALREADY_IN_QUEUE 和 ALREADY_IN_GAME 由狀態衝突對話框處理。
 */
const errorTitle = computed(() => {
  switch (props.errorCode) {
    case 'NETWORK_ERROR':
      return 'Connection Error'
    case 'RECOVERY_FAILED':
      return 'Connection Lost'
    default:
      return 'Error'
  }
})

/**
 * 關閉 Modal
 */
function handleDismiss(): void {
  emit('dismiss')
}
</script>

<style scoped>
/* Modal 淡入/淡出動畫 */
.modal-fade-enter-active {
  transition: opacity 0.3s ease;
}

.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-panel {
  animation: modal-scale-up 0.3s ease;
}

.modal-fade-leave-active .modal-panel {
  animation: modal-scale-down 0.2s ease;
}

@keyframes modal-scale-up {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes modal-scale-down {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.9);
    opacity: 0;
  }
}
</style>
