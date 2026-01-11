<!--
  MatchmakingErrorModal.vue - 配對錯誤 Modal

  @description
  顯示配對相關錯誤的 Modal，根據錯誤類型提供不同操作選項。
  設計風格參考 GameFinishedModal.vue。

  Features:
  - 淡入/淡出動畫
  - 根據錯誤類型顯示不同標題和按鈕
  - 支援多種操作：重試、返回遊戲、返回首頁、繼續配對、切換房間
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
        class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all"
      >
        <!-- Header -->
        <div class="px-6 py-5 text-white bg-gradient-to-r from-red-500 to-red-600">
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
          <p class="text-center text-gray-700">
            {{ errorMessage || 'An error occurred. Please try again.' }}
          </p>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50">
          <!-- Queue Conflict: 兩個選項 -->
          <div v-if="actionType === 'queue-conflict'" class="flex flex-col gap-3">
            <button
              type="button"
              data-testid="continue-queue-button"
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              @click="$emit('continueQueue')"
            >
              Continue Current Queue
            </button>
            <button
              type="button"
              data-testid="cancel-and-switch-button"
              class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              @click="$emit('cancelAndSwitch')"
            >
              Cancel and Switch Room
            </button>
          </div>

          <!-- Back to Game -->
          <div v-else-if="actionType === 'back-to-game'" class="flex gap-3 justify-end">
            <button
              type="button"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              @click="handleDismiss"
            >
              Close
            </button>
            <button
              type="button"
              data-testid="back-to-game-button"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              @click="$emit('backToGame')"
            >
              Back to Game
            </button>
          </div>

          <!-- Back to Home -->
          <div v-else-if="actionType === 'back-to-home'" class="flex justify-center">
            <button
              type="button"
              data-testid="back-to-home-button"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              @click="$emit('backToHome')"
            >
              Back to Home
            </button>
          </div>

          <!-- Default: Retry -->
          <div v-else class="flex gap-3 justify-end">
            <button
              type="button"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              @click="handleDismiss"
            >
              Close
            </button>
            <button
              type="button"
              data-testid="retry-button"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
  backToGame: []
  backToHome: []
  continueQueue: []
  cancelAndSwitch: []
}>()

/**
 * 錯誤標題
 */
const errorTitle = computed(() => {
  switch (props.errorCode) {
    case 'ALREADY_IN_QUEUE':
      return 'Already in Queue'
    case 'ALREADY_IN_GAME':
      return 'Game in Progress'
    case 'INVALID_ROOM_TYPE':
      return 'Invalid Room Type'
    case 'SESSION_EXPIRED':
      return 'Session Expired'
    case 'RECOVERY_FAILED':
      return 'Connection Lost'
    case 'NETWORK_ERROR':
      return 'Connection Error'
    default:
      return 'Matchmaking Failed'
  }
})

/**
 * 操作類型
 */
const actionType = computed(() => {
  switch (props.errorCode) {
    case 'ALREADY_IN_QUEUE':
      return 'queue-conflict'
    case 'ALREADY_IN_GAME':
      return 'back-to-game'
    case 'SESSION_EXPIRED':
      return 'back-to-home'
    default:
      return 'retry'
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

.modal-fade-enter-active .bg-white {
  animation: modal-scale-up 0.3s ease;
}

.modal-fade-leave-active .bg-white {
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
