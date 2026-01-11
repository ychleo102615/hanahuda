<!--
  LobbyTopInfoBar.vue - 大廳頂部資訊列

  @description
  大廳頁面專用的標題列，顯示標題、玩家名稱和選單。
  使用 ResponsiveMenu 組件處理選單邏輯。

  Props:
  - title: string - 標題（預設 'Game Lobby'）
  - menuItems: MenuItem[] - 選單項目列表

  Events:
  - playerClick: 玩家圖示點擊事件（顯示資訊小卡）
  - logout: 登出事件
  - deleteAccount: 刪除帳號事件
-->

<script setup lang="ts">
import { ref } from 'vue'
import PlayerBadge from '~/components/PlayerBadge.vue'
import ResponsiveMenu from '~/components/menu/ResponsiveMenu.vue'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'
import type { MenuItem } from '~/components/menu/types'

// Re-export MenuItem type for parent components
export type { MenuItem }

interface Props {
  title?: string
  menuItems?: MenuItem[]
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Game Lobby',
  menuItems: () => [],
})

const emit = defineEmits<{
  playerClick: []
  logout: []
  deleteAccount: []
}>()

// 取得玩家資訊
const { displayName, isGuest } = useCurrentPlayer()

// 選單開關狀態
const isMenuOpen = ref(false)

// Ref for PlayerBadge container (for Popover positioning)
const playerBadgeRef = ref<HTMLElement | null>(null)

// 切換選單
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// 關閉選單
const closeMenu = () => {
  isMenuOpen.value = false
}

// Expose ref for parent to access
defineExpose({
  playerBadgeRef,
})
</script>

<template>
  <div class="h-full bg-gray-800 text-white relative">
    <!-- Header Bar -->
    <div class="h-full px-4 py-2 flex items-center justify-between">
      <!-- Left: Title -->
      <h1 data-testid="lobby-title" class="text-xl font-bold">{{ title }}</h1>

      <!-- Right: Player info + Menu Button -->
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

        <!-- Menu Button -->
        <button
          data-testid="menu-button"
          aria-label="Toggle menu"
          :aria-expanded="isMenuOpen"
          class="p-2 rounded-lg hover:bg-white/10 transition-colors"
          @click="toggleMenu"
        >
          <svg
            class="h-6 w-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="!isMenuOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Responsive Menu -->
    <ResponsiveMenu
      :is-open="isMenuOpen"
      :menu-items="props.menuItems"
      :show-player-actions="!isGuest"
      @close="closeMenu"
      @logout="emit('logout')"
      @delete-account="emit('deleteAccount')"
    />
  </div>
</template>
