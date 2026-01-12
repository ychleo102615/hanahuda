<!--
  ConfirmDialog Component

  @description
  可重用的確認對話框組件
  - 顯示標題、訊息和確認/取消按鈕
  - 使用 Teleport 渲染到 body
  - 支援過渡動畫
  - Emit confirm / cancel 事件

  @usage
  <ConfirmDialog
    :is-open="showDialog"
    title="確認操作"
    message="確定要執行此操作嗎？"
    confirmText="確認"
    cancelText="取消"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />
-->

<script setup lang="ts">
import { watch, ref } from 'vue'
import { useMotion } from '@vueuse/motion'
import { Z_INDEX } from '~/constants'

// Props 定義
interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: '確認',
  cancelText: '取消',
})

// Events 定義
const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

// Refs
const dialogRef = ref<HTMLElement>()

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
    }
  },
  { immediate: true }
)

// 處理確認
const handleConfirm = () => {
  emit('confirm')
}

// 處理取消
const handleCancel = () => {
  emit('cancel')
}

// 阻止背景滾動
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
  { immediate: true }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        data-testid="confirm-dialog-overlay"
        class="fixed inset-0 flex items-center justify-center"
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
          data-testid="confirm-dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title"
          class="relative z-10 w-full max-w-md rounded-lg modal-panel p-6"
        >
          <!-- 標題 -->
          <h2
            data-testid="dialog-title"
            class="mb-4 text-xl font-bold text-white"
          >
            {{ title }}
          </h2>

          <!-- 訊息 -->
          <p
            data-testid="dialog-message"
            class="mb-6 text-base text-gray-300"
          >
            {{ message }}
          </p>

          <!-- 按鈕區 -->
          <div class="flex justify-end space-x-3">
            <button
              data-testid="cancel-button"
              type="button"
              class="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 transition-colors"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              data-testid="confirm-button"
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
              @click="handleConfirm"
            >
              {{ confirmText }}
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
