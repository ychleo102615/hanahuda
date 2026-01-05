<script setup lang="ts">
/**
 * Register Page
 *
 * @description
 * 帳號註冊頁面。
 * 提供訪客升級為註冊玩家的入口。
 * 支援帳號密碼註冊與 OAuth 社群登入。
 *
 * 參考: specs/010-player-account/spec.md US2, US3
 */

// Nuxt pages 使用檔案路徑作為元件名稱
defineOptions({ name: 'RegisterPage' })

import { useRouter } from 'vue-router'
import { ENABLE_OAUTH_LOGIN } from '~/constants'
import RegisterForm from '~/identity/adapter/components/RegisterForm.vue'
import OAuthButtons from '~/identity/adapter/components/OAuthButtons.vue'

const router = useRouter()

function handleSuccess() {
  // 註冊成功後導向首頁或 lobby
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
        <h1 class="text-3xl font-bold text-white mb-2">Create Account</h1>
        <p class="text-gray-400">
          Join Hanafuda Koi-Koi and save your progress
        </p>
      </div>

      <!-- Register Form Card -->
      <div class="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
        <!-- OAuth Section (conditionally rendered) -->
        <template v-if="ENABLE_OAUTH_LOGIN">
          <!-- OAuth Buttons (Quick signup) -->
          <OAuthButtons />

          <!-- Divider -->
          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-700"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-3 bg-gray-900/50 text-gray-500">Or register with email</span>
            </div>
          </div>
        </template>

        <RegisterForm
          @success="handleSuccess"
          @cancel="handleCancel"
        />
      </div>

      <!-- Footer Links -->
      <div class="text-center mt-6 text-gray-400 text-sm">
        Already have an account?
        <NuxtLink to="/login" class="text-primary-400 hover:text-primary-300 ml-1">
          Sign in
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
