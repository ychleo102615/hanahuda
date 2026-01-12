<script setup lang="ts">
/**
 * Telegram Debug Panel
 *
 * 顯示 Telegram Mini App 環境偵測與認證狀態
 * 僅供除錯使用，正式環境請移除
 */
import { useTelegram } from '~/composables/useTelegram'

const telegram = useTelegram()
const isExpanded = ref(true)

// 取得 window.Telegram 狀態
const windowTelegram = computed(() => {
  if (typeof window === 'undefined') return 'SSR'
  if (!window.Telegram) return 'undefined'
  if (!window.Telegram.WebApp) return 'WebApp undefined'
  return 'OK'
})

const initDataPreview = computed(() => {
  if (typeof window === 'undefined') return 'SSR'
  const data = window.Telegram?.WebApp?.initData
  if (!data) return '(empty)'
  return data.substring(0, 80) + '...'
})
</script>

<template>
  <div class="fixed bottom-4 left-4 right-4 z-[9999] bg-black/90 text-white text-xs rounded-lg overflow-hidden">
    <button
      class="w-full px-3 py-2 bg-purple-600 text-left font-bold"
      @click="isExpanded = !isExpanded"
    >
      🔧 Telegram Debug {{ isExpanded ? '▼' : '▲' }}
    </button>

    <div v-if="isExpanded" class="p-3 space-y-2 max-h-64 overflow-auto">
      <div class="grid grid-cols-2 gap-1">
        <span class="text-gray-400">window.Telegram:</span>
        <span :class="windowTelegram === 'OK' ? 'text-green-400' : 'text-red-400'">
          {{ windowTelegram }}
        </span>

        <span class="text-gray-400">isTelegramEnv:</span>
        <span :class="telegram.isTelegramEnv.value ? 'text-green-400' : 'text-red-400'">
          {{ telegram.isTelegramEnv.value }}
        </span>

        <span class="text-gray-400">isVerified:</span>
        <span :class="telegram.isVerified.value ? 'text-green-400' : 'text-yellow-400'">
          {{ telegram.isVerified.value }}
        </span>

        <span class="text-gray-400">isVerifying:</span>
        <span>{{ telegram.isVerifying.value }}</span>

        <span class="text-gray-400">error:</span>
        <span class="text-red-400">{{ telegram.error.value || '(none)' }}</span>
      </div>

      <div class="border-t border-gray-700 pt-2">
        <div class="text-gray-400 mb-1">initData:</div>
        <div class="text-[10px] break-all text-gray-300 bg-gray-800 p-1 rounded">
          {{ initDataPreview }}
        </div>
      </div>

      <button
        v-if="telegram.isTelegramEnv.value && !telegram.isVerified.value"
        class="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold"
        :disabled="telegram.isVerifying.value"
        @click="telegram.verify()"
      >
        {{ telegram.isVerifying.value ? '驗證中...' : '手動觸發驗證' }}
      </button>
    </div>
  </div>
</template>
