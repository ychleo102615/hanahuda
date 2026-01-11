<!--
  UnifiedToast.vue - Unified Toast Notification Component

  @description
  A unified toast notification system that displays messages at the bottom center
  of the screen. Supports multiple toast types with different styling.

  Features:
  - Multiple toast types: info, success, error, loading
  - Auto-dismiss with configurable duration
  - Manual dismiss for error toasts
  - Loading spinner for loading type
  - Fade transition animation
  - Stacked display for multiple toasts
-->

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Z_INDEX } from '~/constants'
import { useUIStateStore, type ToastData, type ToastType } from '~/game-client/adapter/stores/uiState'

const uiStore = useUIStateStore()
const { activeToasts } = storeToRefs(uiStore)

/**
 * Get background color class based on toast type
 */
function getBackgroundClass(type: ToastType): string {
  switch (type) {
    case 'info':
      return 'bg-blue-600'
    case 'success':
      return 'bg-green-600'
    case 'error':
      return 'bg-red-600'
    case 'warning':
      return 'bg-amber-500'
    case 'loading':
      return 'bg-gray-700'
    default:
      return 'bg-blue-600'
  }
}

/**
 * Get icon for toast type
 */
function getIcon(type: ToastType): string {
  switch (type) {
    case 'info':
      return 'M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'success':
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'error':
      return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'warning':
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    case 'loading':
      return '' // Loading uses spinner instead
    default:
      return 'M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
}

/**
 * Handle dismiss button click
 */
function handleDismiss(id: string): void {
  uiStore.removeToast(id)
}

/**
 * Check if toast should show dismiss button
 */
function shouldShowDismiss(toast: ToastData): boolean {
  return toast.dismissible
}

/**
 * Z-Index for toast container
 */
const zIndex = computed(() => Z_INDEX.TOAST)
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-2 pointer-events-none"
      :style="{ zIndex }"
    >
      <TransitionGroup name="toast-fade">
        <div
          v-for="toast in activeToasts"
          :key="toast.id"
          class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white pointer-events-auto min-w-[200px] max-w-md"
          :class="getBackgroundClass(toast.type)"
          role="alert"
          :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
        >
          <!-- Loading Spinner -->
          <span
            v-if="toast.type === 'loading'"
            class="loading-spinner flex-shrink-0"
            aria-hidden="true"
          />

          <!-- Icon for non-loading types -->
          <svg
            v-else
            class="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="getIcon(toast.type)"
            />
          </svg>

          <!-- Message -->
          <span class="flex-1 text-sm font-medium">{{ toast.message }}</span>

          <!-- Dismiss Button -->
          <button
            v-if="shouldShowDismiss(toast)"
            type="button"
            class="flex-shrink-0 ml-2 text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss"
            @click="handleDismiss(toast.id)"
          >
            <svg
              class="w-4 h-4"
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
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* Loading Spinner */
.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Toast Fade Transition */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.toast-fade-move {
  transition: transform 0.3s ease;
}
</style>
