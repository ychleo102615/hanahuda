<!--
  LobbyTopInfoBar.vue - 大廳頂部資訊列

  @description
  大廳頁面專用的簡單標題列，顯示標題和選單按鈕。

  Props:
  - title: string - 標題（預設 'Game Lobby'）

  Events:
  - menuClick: 選單按鈕點擊事件
-->

<script setup lang="ts">
import MenuButton from './MenuButton.vue'

interface Props {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Game Lobby',
})

const emit = defineEmits<{
  menuClick: []
}>()
</script>

<template>
  <div class="h-full bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
    <h1 data-testid="lobby-title" class="text-xl font-bold">{{ title }}</h1>
    <MenuButton @click="emit('menuClick')" />
  </div>
</template>
