<script setup lang="ts">
/**
 * RegisterForm Component
 *
 * @description
 * 帳號註冊表單元件。
 * 支援帳號密碼註冊與前端驗證。
 *
 * 參考: specs/010-player-account/spec.md FR-001, FR-002, FR-003
 */

import { ref, computed } from 'vue'
import { VALIDATION_RULES } from '#shared/contracts/identity-types'
import { useAuth } from '../composables/use-auth'

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const { setCurrentPlayer } = useAuth()

// Form state
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})

// Validation
const isUsernameValid = computed(() => {
  if (!username.value) return true // Don't show error when empty
  return VALIDATION_RULES.username.pattern.test(username.value) &&
    username.value.length >= VALIDATION_RULES.username.minLength &&
    username.value.length <= VALIDATION_RULES.username.maxLength
})

const isEmailValid = computed(() => {
  if (!email.value) return true // Email is optional
  return VALIDATION_RULES.email.pattern.test(email.value)
})

const isPasswordValid = computed(() => {
  if (!password.value) return true
  return password.value.length >= VALIDATION_RULES.password.minLength &&
    VALIDATION_RULES.password.pattern.test(password.value)
})

const isConfirmPasswordValid = computed(() => {
  if (!confirmPassword.value) return true
  return confirmPassword.value === password.value
})

const isFormValid = computed(() => {
  return username.value &&
    password.value &&
    confirmPassword.value &&
    isUsernameValid.value &&
    isEmailValid.value &&
    isPasswordValid.value &&
    isConfirmPasswordValid.value
})

// Submit handler
async function handleSubmit() {
  if (!isFormValid.value || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''
  fieldErrors.value = {}

  try {
    const response = await $fetch<{ player: { id: string; displayName: string; isGuest: boolean } }>('/api/v1/auth/register', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value,
        confirmPassword: confirmPassword.value,
        email: email.value || undefined,
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
    if (error && typeof error === 'object' && 'statusMessage' in error) {
      errorMessage.value = (error as { statusMessage: string }).statusMessage
    } else {
      errorMessage.value = 'Registration failed. Please try again.'
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
      <label for="username" class="block text-sm font-medium text-gray-300 mb-1">
        Username
      </label>
      <input
        id="username"
        v-model="username"
        type="text"
        autocomplete="username"
        class="w-full px-4 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        :class="[
          username && !isUsernameValid
            ? 'border-red-500'
            : 'border-gray-600'
        ]"
        placeholder="3-20 characters, letters, numbers, underscore"
      />
      <p v-if="username && !isUsernameValid" class="mt-1 text-xs text-red-400">
        {{ VALIDATION_RULES.username.patternMessage }}
      </p>
    </div>

    <!-- Email (optional) -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-300 mb-1">
        Email <span class="text-gray-500">(optional)</span>
      </label>
      <input
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        class="w-full px-4 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        :class="[
          email && !isEmailValid
            ? 'border-red-500'
            : 'border-gray-600'
        ]"
        placeholder="your@email.com"
      />
      <p v-if="email && !isEmailValid" class="mt-1 text-xs text-red-400">
        {{ VALIDATION_RULES.email.patternMessage }}
      </p>
    </div>

    <!-- Password -->
    <div>
      <label for="password" class="block text-sm font-medium text-gray-300 mb-1">
        Password
      </label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        class="w-full px-4 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        :class="[
          password && !isPasswordValid
            ? 'border-red-500'
            : 'border-gray-600'
        ]"
        placeholder="At least 8 characters with letters and numbers"
      />
      <p v-if="password && !isPasswordValid" class="mt-1 text-xs text-red-400">
        {{ VALIDATION_RULES.password.patternMessage }}
      </p>
    </div>

    <!-- Confirm Password -->
    <div>
      <label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-1">
        Confirm Password
      </label>
      <input
        id="confirmPassword"
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        class="w-full px-4 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        :class="[
          confirmPassword && !isConfirmPasswordValid
            ? 'border-red-500'
            : 'border-gray-600'
        ]"
        placeholder="Enter password again"
      />
      <p v-if="confirmPassword && !isConfirmPasswordValid" class="mt-1 text-xs text-red-400">
        Passwords do not match
      </p>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-2">
      <button
        type="submit"
        :disabled="!isFormValid || isLoading"
        class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        <span v-if="isLoading">Registering...</span>
        <span v-else>Create Account</span>
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
