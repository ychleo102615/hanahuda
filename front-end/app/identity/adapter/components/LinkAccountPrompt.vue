<script setup lang="ts">
/**
 * LinkAccountPrompt Component
 *
 * @description
 * OAuth 帳號連結提示元件。
 * 當 OAuth 登入發現帳號已存在需手動連結時顯示。
 *
 * 參考: specs/010-player-account/spec.md FR-006b
 */

import { ref, computed } from 'vue'
import { useAuth } from '../composables/use-auth'

const props = defineProps<{
  /** OAuth Provider */
  provider: 'google' | 'line'
  /** OAuth Provider User ID */
  providerUserId: string
  /** OAuth Provider Email（可選） */
  providerEmail?: string | null
  /** 現有帳號的 username（預填） */
  existingUsername?: string
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const { setCurrentPlayer } = useAuth()

// Form state
const username = ref(props.existingUsername || '')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// Validation
const isFormValid = computed(() => {
  return username.value && password.value
})

// Provider display info
const providerInfo = computed(() => {
  return {
    google: { name: 'Google', icon: 'i-logos-google-icon' },
    line: { name: 'Line', icon: 'i-logos-line' },
  }[props.provider]
})

// Submit handler
async function handleSubmit() {
  if (!isFormValid.value || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ player: { id: string; displayName: string; isGuest: boolean } }>('/api/v1/auth/link-account', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value,
        provider: props.provider,
        providerUserId: props.providerUserId,
        providerEmail: props.providerEmail,
      },
    })

    // Update auth store
    setCurrentPlayer({
      id: response.player.id,
      displayName: response.player.displayName,
      isGuest: response.player.isGuest,
      isAuthenticated: true,
    })

    emit('success')
  } catch (error: unknown) {
    // H3 error 結構: error.data = { statusCode, statusMessage, data: { message } }
    if (error && typeof error === 'object') {
      const err = error as { data?: { data?: { message?: string }; statusMessage?: string } }
      errorMessage.value = err.data?.data?.message || err.data?.statusMessage || 'Failed to link account. Please check your credentials and try again.'
    } else {
      errorMessage.value = 'Failed to link account. Please check your credentials and try again.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
        <span :class="providerInfo?.icon" class="text-3xl" />
      </div>
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        Link Your Account
      </h2>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Your {{ providerInfo?.name }} account
        <span v-if="providerEmail" class="font-medium">({{ providerEmail }})</span>
        appears to match an existing account. Enter your password to link them.
      </p>
    </div>

    <!-- Form -->
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
        <label for="link-username" class="block text-sm font-medium text-gray-300 mb-1">
          Username
        </label>
        <input
          id="link-username"
          v-model="username"
          type="text"
          autocomplete="username"
          class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Enter your username"
        />
      </div>

      <!-- Password -->
      <div>
        <label for="link-password" class="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <input
          id="link-password"
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
          <span v-if="isLoading">Linking...</span>
          <span v-else>Link Account</span>
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

    <!-- Alternative -->
    <div class="text-center text-sm text-gray-500">
      <p>
        Don't have an account?
        <button
          type="button"
          @click="emit('cancel')"
          class="text-primary-400 hover:text-primary-300 ml-1"
        >
          Create a new one
        </button>
      </p>
    </div>
  </div>
</template>
