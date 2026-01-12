<!--
  DeleteAccountModal Component

  @description
  刪除帳號確認對話框
  - 訪客帳號：直接確認刪除
  - 已註冊帳號：需要輸入密碼確認
  - 使用 Teleport 渲染到 body
  - 支援過渡動畫

  @usage
  <DeleteAccountModal
    :is-open="showDeleteModal"
    :is-guest="false"
    @confirm="handleDelete"
    @cancel="showDeleteModal = false"
  />
-->

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useMotion } from '@vueuse/motion'
import { Z_INDEX, ENABLE_OAUTH_LOGIN } from '~/constants'

// Props 定義
interface Props {
  isOpen: boolean
  /** 是否為訪客帳號（訪客不需要密碼確認） */
  isGuest: boolean
  /** 是否正在處理中 */
  isLoading?: boolean
  /** 錯誤訊息 */
  errorMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  errorMessage: '',
})

// Events 定義
const emit = defineEmits<{
  /** 確認刪除，password 為密碼（訪客為 undefined） */
  confirm: [password: string | undefined]
  cancel: []
}>()

// State
const password = ref('')
const dialogRef = ref<HTMLElement>()

// Computed
const canSubmit = computed(() => {
  if (props.isGuest) return true
  return password.value.length > 0
})

// 初始化動畫
const initMotion = () => {
  if (!dialogRef.value) return

  useMotion(dialogRef.value, {
    initial: { scale: 0.95, opacity: 0 },
    enter: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
    leave: {
      scale: 0.95,
      opacity: 0,
      transition: { duration: 150 },
    },
  })
}

// Watch isOpen 變化
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      initMotion()
      password.value = ''
    }
  },
  { immediate: true },
)

// 處理確認
const handleConfirm = () => {
  if (!canSubmit.value || props.isLoading) return
  emit('confirm', props.isGuest ? undefined : password.value)
}

// 處理取消
const handleCancel = () => {
  if (props.isLoading) return
  emit('cancel')
}

// 處理 ESC 按鍵
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && !props.isLoading) {
    handleCancel()
  }
}

// 阻止背景滾動
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        data-testid="delete-account-modal-overlay"
        class="fixed inset-0 flex items-center justify-center p-4"
        :style="{ zIndex: Z_INDEX.MODAL }"
      >
        <!-- 遮罩 -->
        <div
          class="absolute inset-0 bg-black/50 transition-opacity"
          @click="handleCancel"
        />

        <!-- 對話框 -->
        <div
          ref="dialogRef"
          data-testid="delete-account-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          class="relative z-10 w-full max-w-md rounded-lg modal-panel p-6"
        >
          <!-- 標題 -->
          <div class="flex items-center justify-between mb-4">
            <h2
              id="delete-account-title"
              class="text-xl font-bold text-white"
            >
              Delete Account
            </h2>
            <button
              type="button"
              class="text-gray-400 hover:text-white transition-colors"
              :disabled="isLoading"
              @click="handleCancel"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- 警告訊息 -->
          <div class="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <div>
                <p class="text-red-200 font-medium">This action cannot be undone.</p>
                <p class="text-red-300/80 text-sm mt-1">
                  All your data will be permanently deleted, including:
                </p>
                <ul class="text-red-300/80 text-sm mt-2 list-disc list-inside">
                  <li>Your account credentials</li>
                  <li v-if="ENABLE_OAUTH_LOGIN">Linked OAuth accounts</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- 密碼輸入（僅註冊帳號） -->
          <div v-if="!isGuest" class="mb-6">
            <label for="delete-password" class="block text-sm font-medium text-gray-300 mb-2">
              Please enter your password to confirm:
            </label>
            <input
              id="delete-password"
              v-model="password"
              type="password"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter your password"
              :disabled="isLoading"
              @keydown.enter="handleConfirm"
            />
          </div>

          <!-- 錯誤訊息 -->
          <div v-if="errorMessage" class="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p class="text-red-300 text-sm">{{ errorMessage }}</p>
          </div>

          <!-- 按鈕區 -->
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              :disabled="isLoading"
              @click="handleCancel"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              :disabled="!canSubmit || isLoading"
              @click="handleConfirm"
            >
              <svg
                v-if="isLoading"
                class="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Fade 過渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
