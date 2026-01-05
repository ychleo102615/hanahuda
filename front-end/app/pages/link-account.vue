<script setup lang="ts">
/**
 * Link Account Page
 *
 * @description
 * OAuth 帳號連結頁面。
 * 當 OAuth 登入需要手動連結至現有帳號時顯示。
 *
 * 參考: specs/010-player-account/spec.md FR-006b
 */

import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import LinkAccountPrompt from '~/identity/adapter/components/LinkAccountPrompt.vue'

const router = useRouter()
const route = useRoute()

// OAuth link info from query params
const linkInfo = ref<{
  provider: 'google' | 'line'
  providerUserId: string
  providerEmail: string | null
  existingUsername: string
} | null>(null)

const errorMessage = ref('')

onMounted(() => {
  // Parse the token from query params
  const token = route.query.token as string

  if (!token) {
    errorMessage.value = 'Missing link token. Please try again.'
    return
  }

  try {
    // Token format: base64 encoded JSON
    const decoded = JSON.parse(atob(token))

    if (!decoded.provider || !decoded.providerUserId) {
      throw new Error('Invalid token format')
    }

    linkInfo.value = {
      provider: decoded.provider,
      providerUserId: decoded.providerUserId,
      providerEmail: decoded.providerEmail || null,
      existingUsername: decoded.existingUsername || '',
    }
  } catch {
    errorMessage.value = 'Invalid link token. Please try again.'
  }
})

function handleSuccess() {
  // 連結成功後導向 lobby
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
      <!-- Error State -->
      <div v-if="errorMessage" class="text-center">
        <div class="bg-red-900/30 border border-red-500 text-red-300 px-6 py-4 rounded-lg mb-4">
          {{ errorMessage }}
        </div>
        <NuxtLink
          to="/login"
          class="text-primary-400 hover:text-primary-300"
        >
          Back to login
        </NuxtLink>
      </div>

      <!-- Link Account Card -->
      <div
        v-else-if="linkInfo"
        class="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800"
      >
        <LinkAccountPrompt
          :provider="linkInfo.provider"
          :provider-user-id="linkInfo.providerUserId"
          :provider-email="linkInfo.providerEmail"
          :existing-username="linkInfo.existingUsername"
          @success="handleSuccess"
          @cancel="handleCancel"
        />
      </div>

      <!-- Loading State -->
      <div v-else class="text-center text-gray-400">
        Loading...
      </div>
    </div>
  </div>
</template>
