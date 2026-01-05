<script setup lang="ts">
/**
 * LoginModal Component
 *
 * @description
 * 登入 Modal 覆蓋元件。
 * 在首頁點擊 Sign In 時顯示，提供快速登入體驗而無需跳轉頁面。
 *
 * 參考: specs/010-player-account/spec.md FR-024, FR-024a, FR-024b, FR-024c, FR-024d
 */

import { onMounted, onUnmounted, watch } from 'vue'
import { Z_INDEX, ENABLE_OAUTH_LOGIN } from '~/constants'
import LoginForm from './LoginForm.vue'
import OAuthButtons from './OAuthButtons.vue'

const props = defineProps<{
  isOpen: boolean
}>()

// 背景滾動鎖定（僅 client-side）
// 配合 CSS scrollbar-gutter: stable 避免內容跳動
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!import.meta.client) return

    if (isOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  },
)

const emit = defineEmits<{
  close: []
  success: []
}>()

// FR-024d: ESC key listener
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// FR-024d: Handle backdrop click
function handleBackdropClick() {
  emit('close')
}

// FR-024c: Handle login success
function handleLoginSuccess() {
  emit('success')
  emit('close')
}

// Cancel handler (from LoginForm)
function handleCancel() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 flex items-center justify-center bg-black/60"
        :style="{ zIndex: Z_INDEX.MODAL }"
        @click.self="handleBackdropClick"
      >
        <div class="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-gray-900 p-6 shadow-2xl mx-4">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-white">
              Sign In
            </h2>
            <button
              type="button"
              @click="emit('close')"
              class="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- FR-024a: LoginForm -->
          <LoginForm
            @success="handleLoginSuccess"
            @cancel="handleCancel"
          />

          <!-- OAuth Section (conditionally rendered) -->
          <template v-if="ENABLE_OAUTH_LOGIN">
            <!-- Divider -->
            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-700"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-gray-900 text-gray-400">Or continue with</span>
              </div>
            </div>

            <!-- FR-024a: OAuthButtons -->
            <OAuthButtons />
          </template>

          <!-- FR-024b: Create account link -->
          <div class="mt-6 text-center">
            <span class="text-gray-400">Don't have an account? </span>
            <NuxtLink
              to="/register"
              class="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              @click="emit('close')"
            >
              Create one
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
