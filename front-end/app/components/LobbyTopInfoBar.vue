<!--
  LobbyTopInfoBar.vue - 大廳頂部資訊列

  @description
  大廳頁面專用的標題列，顯示標題、玩家名稱和選單按鈕。

  Props:
  - title: string - 標題（預設 'Game Lobby'）

  Events:
  - menuClick: 選單按鈕點擊事件
  - playerClick: 玩家圖示點擊事件（顯示資訊小卡）
-->

<script setup lang="ts">
import { ref } from 'vue'
import MenuButton from './MenuButton.vue'
import PlayerBadge from './PlayerBadge.vue'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'

interface Props {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Game Lobby',
})

const emit = defineEmits<{
  menuClick: []
  playerClick: []
}>()

// 取得玩家資訊
const { displayName, isGuest } = useCurrentPlayer()

// Ref for PlayerBadge container (for Popover positioning)
const playerBadgeRef = ref<HTMLElement | null>(null)

// Expose ref for parent to access
defineExpose({
  playerBadgeRef,
})
</script>

<template>
  <div class="h-full bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
    <!-- Left: Title -->
    <h1 data-testid="lobby-title" class="text-xl font-bold">{{ title }}</h1>

    <!-- Right: Player info + Menu -->
    <div class="flex items-center gap-3">
      <!-- Player badge (clickable to show info card) -->
      <div v-if="displayName" ref="playerBadgeRef">
        <PlayerBadge
          :display-name="displayName"
          :is-guest="isGuest"
          :clickable="true"
          size="md"
          @click="emit('playerClick')"
        />
      </div>
      <span v-else class="text-sm text-gray-400">Loading...</span>
      <MenuButton @click="emit('menuClick')" />
    </div>
  </div>
</template>
