<script setup lang="ts">
/**
 * OAuthButtons Component
 *
 * @description
 * OAuth 社群登入按鈕元件。
 * 支援 Google 和 Line 登入。
 *
 * 參考: specs/010-player-account/spec.md FR-004, FR-005
 */

// OAuth providers configuration
const providers = [
  {
    id: 'google',
    name: 'Google',
    icon: 'i-logos-google-icon',
    bgColor: 'bg-white hover:bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
  },
  {
    id: 'line',
    name: 'Line',
    icon: 'i-logos-line',
    bgColor: 'bg-[#00C300] hover:bg-[#00B300]',
    textColor: 'text-white',
    borderColor: 'border-transparent',
  },
]

function handleOAuthLogin(provider: string) {
  // Redirect to OAuth endpoint
  window.location.href = `/api/v1/auth/oauth/${provider}`
}
</script>

<template>
  <div class="space-y-3">
    <button
      v-for="provider in providers"
      :key="provider.id"
      type="button"
      @click="handleOAuthLogin(provider.id)"
      :class="[
        provider.bgColor,
        provider.textColor,
        provider.borderColor,
        'w-full flex items-center justify-center gap-3 px-4 py-2.5 border rounded-lg font-medium transition-colors'
      ]"
    >
      <span :class="provider.icon" class="text-xl" />
      <span>Continue with {{ provider.name }}</span>
    </button>
  </div>
</template>
