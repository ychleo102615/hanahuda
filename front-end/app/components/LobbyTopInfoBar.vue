<!--
  LobbyTopInfoBar.vue - 大廳頂部資訊列

  @description
  大廳頁面專用的標題列，顯示標題、玩家名稱和選單按鈕。

  Props:
  - title: string - 標題（預設 'Game Lobby'）

  Events:
  - menuClick: 選單按鈕點擊事件
-->

<script setup lang="ts">
import MenuButton from './MenuButton.vue'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'

interface Props {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Game Lobby',
})

const emit = defineEmits<{
  menuClick: []
}>()

// 取得玩家資訊
const { displayName, isGuest } = useCurrentPlayer()
</script>

<template>
  <div class="h-full bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
    <!-- Left: Title -->
    <h1 data-testid="lobby-title" class="text-xl font-bold">{{ title }}</h1>

    <!-- Right: Player info + Menu -->
    <div class="flex items-center gap-3">
      <!-- Player name -->
      <div class="text-right">
        <div class="text-sm font-medium">{{ displayName || 'Loading...' }}</div>
        <div v-if="isGuest" class="text-xs text-gray-400">Guest</div>
      </div>
      <MenuButton @click="emit('menuClick')" />
    </div>
  </div>
</template>
