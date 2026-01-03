<script setup lang="ts">
/**
 * RegisterPrompt Component
 *
 * @description
 * 訪客註冊提示元件。
 * 顯示於大廳頁面，提示訪客玩家註冊以保留遊戲紀錄。
 *
 * 參考: specs/010-player-account/spec.md FR-017
 */

import { ref } from 'vue'
import { useCurrentPlayer } from '../composables/use-current-player'

const { displayName, shouldShowRegisterPrompt } = useCurrentPlayer()

const isDismissed = ref(false)
const skipPromptForSession = ref(false)

/**
 * 關閉提示
 */
function dismiss() {
  isDismissed.value = true
  if (skipPromptForSession.value) {
    // 儲存到 cookie，這個 session 不再顯示
    document.cookie = 'skip_register_prompt=1; max-age=86400; path=/'
  }
}

/**
 * 導向註冊頁面
 */
function goToRegister() {
  navigateTo('/register')
}

// 檢查是否已跳過
const hasSkippedPrompt = typeof document !== 'undefined' &&
  document.cookie.includes('skip_register_prompt=1')

const isVisible = computed(() =>
  shouldShowRegisterPrompt.value && !isDismissed.value && !hasSkippedPrompt
)
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="isVisible"
      class="fixed bottom-4 left-4 right-4 mx-auto max-w-md bg-amber-50 border border-amber-200 rounded-lg shadow-lg p-4 z-50"
    >
      <div class="flex items-start gap-3">
        <!-- Icon -->
        <div class="flex-shrink-0 text-amber-500">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <!-- Content -->
        <div class="flex-1">
          <h3 class="text-sm font-medium text-amber-800">
            Playing as {{ displayName }}
          </h3>
          <p class="mt-1 text-sm text-amber-700">
            Create an account to save your game history and stats!
          </p>

          <!-- Actions -->
          <div class="mt-3 flex items-center gap-3">
            <button
              @click="goToRegister"
              class="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
            >
              Register Now
            </button>
            <button
              @click="dismiss"
              class="px-3 py-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
            >
              Later
            </button>
          </div>

          <!-- Skip checkbox -->
          <label class="mt-2 flex items-center gap-2 text-xs text-amber-600">
            <input
              v-model="skipPromptForSession"
              type="checkbox"
              class="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            Don't show again today
          </label>
        </div>

        <!-- Close button -->
        <button
          @click="dismiss"
          class="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}
</style>
