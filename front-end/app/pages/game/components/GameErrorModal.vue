<template>
  <Transition name="modal-fade">
    <div
      v-if="uiStateStore.gameErrorModalVisible"
      class="fixed inset-0 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-error-title"
      :style="{ zIndex: Z_INDEX.MODAL }"
    >
      <div
        class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all"
      >
        <!-- Header -->
        <div class="px-6 py-5 text-white bg-gradient-to-r from-red-500 to-red-600">
          <h2 id="game-error-title" class="text-2xl font-bold text-center">
            Game Error
          </h2>
        </div>

        <!-- Body -->
        <div class="px-6 py-6 space-y-4">
          <p class="text-center text-lg text-gray-800">
            {{ uiStateStore.gameErrorMessage ?? 'An unexpected error occurred.' }}
          </p>

          <!-- Countdown -->
          <p class="text-center text-sm text-gray-600">
            Returning to lobby in
            <span
              :class="[
                'font-bold',
                countdown <= 3 ? 'text-red-600' : 'text-gray-800',
              ]"
            >
              {{ countdown }}
            </span>
            seconds...
          </p>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 flex justify-center">
          <button
            type="button"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            @click="handleReturnToLobby"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * GameErrorModal Component
 *
 * @description
 * 通用的遊戲錯誤 Modal，用於顯示 GameError 事件。
 * 包含 5 秒倒數，結束後自動返回大廳。
 *
 * Features:
 * - 顯示錯誤訊息（來自 uiStateStore.gameErrorMessage）
 * - 5 秒倒數（< 3 秒時文字轉紅色）
 * - 手動點擊「Return to Lobby」按鈕可提前返回
 * - 倒數結束自動導航至 /lobby
 */

import { ref, watch, onUnmounted } from 'vue'
import { Z_INDEX } from '~/constants'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'

const uiStateStore = useUIStateStore()
const router = useRouter()

const COUNTDOWN_SECONDS = 5
const countdown = ref(COUNTDOWN_SECONDS)
let intervalId: ReturnType<typeof setInterval> | null = null

/**
 * 清理倒數計時器
 */
function clearCountdownInterval(): void {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

/**
 * 啟動倒數計時器
 */
function startCountdown(): void {
  clearCountdownInterval()
  countdown.value = COUNTDOWN_SECONDS

  intervalId = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      handleReturnToLobby()
    }
  }, 1000)
}

/**
 * 返回大廳
 */
function handleReturnToLobby(): void {
  clearCountdownInterval()
  uiStateStore.hideGameErrorModal()
  router.push('/lobby')
}

// 監聽 Modal 顯示狀態，啟動/停止倒數
watch(
  () => uiStateStore.gameErrorModalVisible,
  (visible) => {
    if (visible) {
      startCountdown()
    } else {
      clearCountdownInterval()
    }
  },
  { immediate: true }
)

// 組件卸載時清理計時器
onUnmounted(() => {
  clearCountdownInterval()
})
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
