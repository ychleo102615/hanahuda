<!--
  PrivateRoomPanel.vue - 私人房間面板

  @description
  顯示活躍私人房間的資訊：Room ID、分享連結、房間狀態。
  提供複製連結、解散房間功能。

  @module pages/lobby/components/PrivateRoomPanel
-->

<script setup lang="ts">
import { computed } from 'vue'
import { usePrivateRoomStateStore } from '~/game-client/adapter/stores/privateRoomState'
import { useUIStateStore } from '~/game-client/adapter/stores/uiState'

const emit = defineEmits<{
  dissolve: []
}>()

const privateRoomStore = usePrivateRoomStateStore()
const uiStore = useUIStateStore()

const statusLabel = computed(() => {
  switch (privateRoomStore.roomStatus) {
    case 'WAITING': return 'Waiting for guest...'
    case 'FULL': return 'Room full — starting game...'
    default: return ''
  }
})

async function handleCopyShareUrl() {
  const url = privateRoomStore.shareUrl
  if (!url) return

  try {
    await navigator.clipboard.writeText(url)
    uiStore.addToast({
      type: 'success',
      message: 'Share link copied!',
      duration: 2000,
      dismissible: false,
    })
  } catch {
    uiStore.addToast({
      type: 'error',
      message: 'Failed to copy link',
      duration: 2000,
      dismissible: false,
    })
  }
}

function handleCopyRoomId() {
  const roomId = privateRoomStore.roomId
  if (!roomId) return

  navigator.clipboard.writeText(roomId).then(() => {
    uiStore.addToast({
      type: 'success',
      message: 'Room ID copied!',
      duration: 2000,
      dismissible: false,
    })
  })
}
</script>

<template>
  <div class="lobby-card rounded-xl p-6 md:p-8">
    <!-- 標題 -->
    <h2 class="text-xl md:text-2xl font-bold text-center mb-6">
      <span class="bg-gradient-to-r from-gold-pale via-gold-light to-gold bg-clip-text text-transparent">
        Private Room
      </span>
    </h2>

    <!-- Room ID -->
    <div class="mb-4">
      <label class="text-xs text-gold-dark uppercase tracking-wider">Room ID</label>
      <div class="flex items-center gap-3 mt-1">
        <span class="text-3xl font-mono font-bold tracking-widest text-gold-light">
          {{ privateRoomStore.roomId }}
        </span>
        <button
          class="text-xs text-gold-dark hover:text-gold-light transition-colors underline"
          @click="handleCopyRoomId"
        >
          Copy
        </button>
      </div>
    </div>

    <!-- 狀態 -->
    <div class="mb-6">
      <div class="flex items-center gap-2">
        <span
          class="inline-block w-2 h-2 rounded-full"
          :class="privateRoomStore.roomStatus === 'WAITING' ? 'bg-gold animate-pulse' : 'bg-green-400'"
        />
        <span class="text-sm text-gray-300">{{ statusLabel }}</span>
      </div>
    </div>

    <!-- 分享連結 -->
    <div class="mb-6">
      <label class="text-xs text-gold-dark uppercase tracking-wider">Share Link</label>
      <div class="flex gap-2 mt-1">
        <input
          :value="privateRoomStore.shareUrl"
          type="text"
          readonly
          class="flex-1 px-3 py-2 bg-black/30 text-gray-300 text-sm rounded border border-gold-dark/30 truncate"
        />
        <button
          class="px-4 py-2 bg-gold-dark hover:bg-gold text-white text-sm font-semibold rounded transition-colors shrink-0"
          @click="handleCopyShareUrl"
        >
          Copy
        </button>
      </div>
    </div>

    <!-- 分隔線 -->
    <div class="border-t border-gold-dark/30 pt-4">
      <button
        class="text-sm text-red-400 hover:text-red-300 transition-colors"
        @click="emit('dissolve')"
      >
        Dissolve Room
      </button>
    </div>
  </div>
</template>
