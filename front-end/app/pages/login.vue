<script setup lang="ts">
/**
 * Login Page
 *
 * @description
 * 帳號登入頁面。
 * 提供註冊玩家重新登入的入口。
 * 支援帳號密碼登入與 OAuth 社群登入。
 *
 * 參考: specs/010-player-account/spec.md US3, US5
 */

import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import LoginForm from '~/identity/adapter/components/LoginForm.vue'
import OAuthButtons from '~/identity/adapter/components/OAuthButtons.vue'

const router = useRouter()
const route = useRoute()

// OAuth error message from query params
const oauthError = ref('')

onMounted(() => {
  // Check for OAuth error in query params
  const error = route.query.error
  if (error) {
    oauthError.value = decodeURIComponent(String(error))
    // Clear the error from URL
    router.replace({ query: {} })
  }
})

function handleSuccess() {
  // 登入成功後導向 lobby
  router.push('/lobby')
}

function handleCancel() {
  // 取消後返回首頁
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-primary-900 to-primary-950 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p class="text-gray-400">
          Sign in to continue playing Hanafuda Koi-Koi
        </p>
      </div>

      <!-- OAuth Error Message -->
      <div
        v-if="oauthError"
        class="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm mb-4"
      >
        {{ oauthError }}
      </div>

      <!-- Login Form Card -->
      <div class="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
        <LoginForm
          @success="handleSuccess"
          @cancel="handleCancel"
        />

        <!-- Divider -->
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-700"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-3 bg-gray-900/50 text-gray-500">Or continue with</span>
          </div>
        </div>

        <!-- OAuth Buttons -->
        <OAuthButtons />
      </div>

      <!-- Footer Links -->
      <div class="text-center mt-6 text-gray-400 text-sm">
        Don't have an account?
        <NuxtLink to="/register" class="text-primary-400 hover:text-primary-300 ml-1">
          Create one
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
