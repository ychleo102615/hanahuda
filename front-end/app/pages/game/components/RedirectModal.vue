<template>
  <Transition name="modal-fade">
    <div
      v-if="uiStateStore.redirectModalVisible"
      class="fixed inset-0 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="redirect-modal-title"
      :style="{ zIndex: Z_INDEX.MODAL }"
    >
      <div
        class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all"
      >
        <!-- Header -->
        <div
          class="px-6 py-5 text-white"
          :class="headerGradientClass"
        >
          <h2 id="redirect-modal-title" class="text-2xl font-bold text-center">
            {{ modalTitle }}
          </h2>
        </div>

        <!-- Body -->
        <div class="px-6 py-6 space-y-4">
          <p class="text-center text-lg text-gray-800">
            {{ modalMessage }}
          </p>

          <!-- Countdown -->
          <p class="text-center text-sm text-gray-600">
            {{ countdownText }}
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
            class="px-6 py-2 text-white rounded-lg transition-colors font-medium"
            :class="buttonClass"
            @click="handleRedirect"
          >
            {{ buttonText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * RedirectModal Component
 *
 * @description
 * 通用的重導向 Modal，用於顯示需要離開遊戲頁面的錯誤。
 * 支援重導向至首頁（home）或大廳（lobby）。
 * 包含 5 秒倒數，結束後自動導航。
 *
 * Features:
 * - 根據 target 決定標題、顏色、導航路徑
 * - 5 秒倒數（< 3 秒時文字轉紅色）
 * - 手動點擊按鈕可提前返回
 * - 倒數結束自動導航
 */

import { ref, computed, watch, onUnmounted } from 'vue'
import { Z_INDEX } from '~/constants'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'

const uiStateStore = useUIStateStore()
const router = useRouter()

const COUNTDOWN_SECONDS = 5
const countdown = ref(COUNTDOWN_SECONDS)
let intervalId: ReturnType<typeof setInterval> | null = null

// 計算屬性
const modalData = computed(() => uiStateStore.redirectModalData)
const redirectTarget = computed(() => modalData.value?.target ?? 'lobby')

const modalTitle = computed(() => {
  if (modalData.value?.title) return modalData.value.title
  return redirectTarget.value === 'home' ? 'Session Error' : 'Game Error'
})

const modalMessage = computed(() =>
  modalData.value?.message ?? 'An unexpected error occurred.'
)

const countdownText = computed(() =>
  redirectTarget.value === 'home' ? 'Returning to home in' : 'Returning to lobby in'
)

const buttonText = computed(() =>
  redirectTarget.value === 'home' ? 'Return to Home' : 'Return to Lobby'
)

const headerGradientClass = computed(() =>
  redirectTarget.value === 'home'
    ? 'bg-gradient-to-r from-orange-500 to-orange-600'
    : 'bg-gradient-to-r from-red-500 to-red-600'
)

const buttonClass = computed(() =>
  redirectTarget.value === 'home'
    ? 'bg-orange-600 hover:bg-orange-700'
    : 'bg-blue-600 hover:bg-blue-700'
)

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
      handleRedirect()
    }
  }, 1000)
}

/**
 * 執行重導向
 */
function handleRedirect(): void {
  clearCountdownInterval()
  const path = redirectTarget.value === 'home' ? '/' : '/lobby'
  uiStateStore.hideRedirectModal()
  router.push(path)
}

// 監聯 Modal 顯示狀態，啟動/停止倒數
watch(
  () => uiStateStore.redirectModalVisible,
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
