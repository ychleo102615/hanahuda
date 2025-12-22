<!--
  MenuButton.vue - 選單按鈕元件

  @description
  共用的漢堡選單按鈕，用於開啟側邊面板。

  Events:
  - click: 按鈕點擊事件
-->

<script setup lang="ts">
const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    data-testid="menu-button"
    aria-label="Open menu"
    class="p-2 rounded-lg hover:bg-white/10 transition-colors"
    @click="emit('click')"
  >
    <svg
      class="h-6 w-6 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  </button>
</template>
