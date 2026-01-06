<script setup lang="ts">
/**
 * LoginForm Component
 *
 * @description
 * 帳號登入表單元件。
 * 支援帳號密碼登入與前端驗證。
 *
 * 參考: specs/010-player-account/spec.md FR-011, FR-012, FR-025
 */

import { ref, computed } from 'vue'
import { useAuth } from '../composables/use-auth'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const { setCurrentPlayer } = useAuth()

// Form state
const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// Validation
const isFormValid = computed(() => {
  return username.value && password.value
})

// Submit handler
async function handleSubmit() {
  if (!isFormValid.value || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ player: { id: string; displayName: string; isGuest: boolean } }>('/api/v1/auth/login', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value,
      },
    })

    // Update auth store
    setCurrentPlayer({
      id: response.player.id,
      displayName: response.player.displayName,
      isGuest: response.player.isGuest,
      isAuthenticated: true,
    })

    // Show success toast (FR-025)
    const uiStore = useUIStateStore()
    uiStore.addToast({
      type: 'success',
      message: `Welcome back, ${response.player.displayName}!`,
      duration: 3000,
      dismissible: false,
    })

    emit('success')
  } catch (error: unknown) {
    // H3 error 結構: error.data = { statusCode, statusMessage, data: { message } }
    if (error && typeof error === 'object') {
      const err = error as { data?: { data?: { message?: string }; statusMessage?: string } }
      errorMessage.value = err.data?.data?.message || err.data?.statusMessage || 'Login failed. Please check your credentials and try again.'
    } else {
      errorMessage.value = 'Login failed. Please check your credentials and try again.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Error message -->
    <div
      v-if="errorMessage"
      class="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm"
    >
      {{ errorMessage }}
    </div>

    <!-- Username -->
    <div>
      <label for="login-username" class="block text-sm font-medium text-gray-300 mb-1">
        Username
      </label>
      <input
        id="login-username"
        v-model="username"
        type="text"
        autocomplete="username"
        class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        placeholder="Enter your username"
      />
    </div>

    <!-- Password -->
    <div>
      <label for="login-password" class="block text-sm font-medium text-gray-300 mb-1">
        Password
      </label>
      <input
        id="login-password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        placeholder="Enter your password"
      />
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-2">
      <button
        type="submit"
        :disabled="!isFormValid || isLoading"
        class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        <span v-if="isLoading">Signing in...</span>
        <span v-else>Sign In</span>
      </button>
      <button
        type="button"
        @click="emit('cancel')"
        class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
      >
        Cancel
      </button>
    </div>
  </form>
</template>
