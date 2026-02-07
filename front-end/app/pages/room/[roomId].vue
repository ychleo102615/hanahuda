<!--
  JoinRoomViaLink.vue - 透過分享連結加入私人房間

  @description
  使用者透過分享連結 /room/:roomId 加入私人房間。
  自動呼叫 join API，成功後導航至 /game。
  錯誤時顯示 toast 並返回大廳。
-->

<script setup lang="ts">
definePageMeta({
  middleware: 'lobby',
})

import { ref, onMounted } from 'vue'
import { usePrivateRoomStateStore } from '~/game-client/adapter/stores/privateRoomState'
import { useUIStateStore } from '~/game-client/adapter/stores/uiState'

const route = useRoute()
const privateRoomStore = usePrivateRoomStateStore()
const uiStore = useUIStateStore()

const isJoining = ref(true)
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  const roomId = route.params.roomId as string

  if (!roomId) {
    errorMessage.value = 'Invalid room link'
    isJoining.value = false
    return
  }

  try {
    const response = await $fetch<{
      success: boolean
      room_id: string
      host_name: string
      room_type: string
      error?: { code: string; message: string }
    }>(`/api/private-room/${roomId}/join`, {
      method: 'POST',
    })

    if (response.success) {
      privateRoomStore.setRoomInfo({
        roomId: response.room_id,
        roomType: response.room_type,
        hostName: response.host_name,
        roomStatus: 'FULL',
      })
      navigateTo('/game')
    }
  } catch (error: unknown) {
    const errorData = error as { data?: { error?: { code?: string; message?: string } } }
    const message = errorData?.data?.error?.message ?? 'Failed to join room'
    errorMessage.value = message

    uiStore.addToast({
      type: 'error',
      message,
      duration: 4000,
      dismissible: true,
    })

    // 延遲導航讓 toast 有時間顯示
    setTimeout(() => {
      navigateTo('/lobby')
    }, 1500)
  } finally {
    isJoining.value = false
  }
})
</script>

<template>
  <div class="min-h-screen lobby-bg flex items-center justify-center">
    <div class="text-center">
      <template v-if="isJoining">
        <div class="animate-spin rounded-full h-12 w-12 border-2 border-gold-dark border-t-gold-light mx-auto mb-4" />
        <p class="text-gold-light text-lg">Joining room...</p>
      </template>
      <template v-else-if="errorMessage">
        <p class="text-red-400 mb-4">{{ errorMessage }}</p>
        <p class="text-gray-400 text-sm">Redirecting to lobby...</p>
      </template>
    </div>
  </div>
</template>
