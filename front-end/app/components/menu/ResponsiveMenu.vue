<!--
  ResponsiveMenu.vue - 響應式選單組件

  @description
  統一的選單組件，根據螢幕尺寸顯示不同樣式：
  - 電腦模式 (>=768px)：右側滑出面板
  - 手機模式 (<768px)：向下展開 dropdown

  Props:
  - isOpen: boolean - 選單是否開啟
  - menuItems: MenuItem[] - 選單項目列表
  - showPlayerActions: boolean - 是否顯示玩家操作（登出/刪除帳號）預設 true
  - anchorElement: HTMLElement | null - 手機版 dropdown 的錨點元素（用於定位）

  Events:
  - close: 關閉選單
  - logout: 登出（僅當 showPlayerActions 為 true）
  - deleteAccount: 刪除帳號（僅當 showPlayerActions 為 true）
-->

<script setup lang="ts">
import { useResponsiveMenu } from '~/composables/useResponsiveMenu'
import { useCurrentPlayer } from '~/identity/adapter/composables/use-current-player'
import { Z_INDEX } from '~/constants'
import PlayerBadge from '~/components/PlayerBadge.vue'
import { type MenuItem, iconPaths } from './types'

interface Props {
  isOpen: boolean
  menuItems?: MenuItem[]
  showPlayerActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  menuItems: () => [],
  showPlayerActions: true,
})

const emit = defineEmits<{
  close: []
  logout: []
  deleteAccount: []
}>()

// 取得玩家資訊
const { displayName, isGuest } = useCurrentPlayer()

// 響應式偵測
const { isMobile } = useResponsiveMenu()

// 關閉選單
const closeMenu = () => {
  emit('close')
}

// 處理選單項目點擊
const handleItemClick = (item: MenuItem) => {
  if (item.disabled) return
  item.onClick()
  closeMenu()
}

// 處理登出
const handleLogout = () => {
  emit('logout')
  closeMenu()
}

// 處理刪除帳號
const handleDeleteAccount = () => {
  emit('deleteAccount')
  closeMenu()
}
</script>

<template>
  <!-- Mobile: Dropdown Menu (向下展開) -->
  <div
    v-if="isMobile"
    :class="[
      'absolute left-0 right-0 top-full overflow-hidden transition-all duration-300 shadow-lg',
      'bg-gray-900/95 backdrop-blur-md border-t border-gold-dark/20',
      isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
    ]"
    :style="{ zIndex: Z_INDEX.PANEL }"
  >
    <div class="py-4 space-y-2">
      <!-- Player Info Section -->
      <div v-if="displayName" class="px-4 py-3 mb-2 border-b border-gold-dark/15">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
            <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
          </div>
          <div>
            <div class="text-white font-medium">{{ displayName }}</div>
            <div class="text-xs text-gray-400">{{ isGuest ? 'Guest account' : 'Registered' }}</div>
          </div>
        </div>
        <!-- Action buttons (only if showPlayerActions is true) -->
        <div v-if="showPlayerActions" class="mt-3 flex gap-4">
          <button
            @click="handleLogout"
            class="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
          <button
            @click="handleDeleteAccount"
            class="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Account
          </button>
        </div>
      </div>

      <!-- Menu Items -->
      <template v-for="item in props.menuItems" :key="item.id">
        <button
          class="block w-full text-left px-4 py-3 text-sm font-medium rounded-md transition-colors flex items-center gap-3"
          :class="item.disabled
            ? 'cursor-not-allowed opacity-50 text-gray-500'
            : 'text-white hover:bg-white/10'"
          :disabled="item.disabled"
          @click="handleItemClick(item)"
        >
          <!-- SVG icon -->
          <svg
            v-if="item.icon && iconPaths[item.icon]"
            class="w-5 h-5 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="iconPaths[item.icon]"
            />
          </svg>
          <!-- Fallback: emoji -->
          <span v-else-if="item.icon" class="text-xl">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </template>
    </div>
  </div>

  <!-- Mobile: Backdrop (when dropdown is open) -->
  <div
    v-if="isMobile && isOpen"
    class="fixed inset-0"
    :style="{ zIndex: Z_INDEX.OVERLAY }"
    @click="closeMenu"
  />

  <!-- Desktop: Side Panel (右側滑出) -->
  <Teleport to="body">
    <!-- Backdrop (獨立 fade) -->
    <Transition name="fade">
      <div
        v-if="!isMobile && isOpen"
        class="fixed inset-0 bg-black/50"
        :style="{ zIndex: Z_INDEX.PANEL }"
        @click="closeMenu"
      />
    </Transition>

    <!-- Side Panel (獨立 slide) -->
    <Transition name="slide">
      <div
        v-if="!isMobile && isOpen"
        class="fixed right-0 top-0 h-full w-80 shadow-2xl flex flex-col bg-gray-900/95 backdrop-blur-md border-l border-gold-dark/20"
        :style="{ zIndex: Z_INDEX.PANEL + 1 }"
        role="dialog"
        aria-label="Menu"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gold-dark/15">
          <h2 class="text-lg font-semibold text-white">Menu</h2>
          <button
            aria-label="Close menu"
            class="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            @click="closeMenu"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Player Info -->
        <div v-if="displayName" class="p-4 border-b border-gold-dark/15">
          <div class="flex items-center gap-3 mb-3">
            <PlayerBadge
              :display-name="displayName"
              :is-guest="isGuest"
              :show-guest-label="true"
              size="lg"
            />
          </div>
          <!-- Action buttons (only if showPlayerActions is true) -->
          <div v-if="showPlayerActions" class="space-y-2">
            <button
              @click="handleLogout"
              class="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
            <button
              @click="handleDeleteAccount"
              class="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-3"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Account
            </button>
          </div>
        </div>

        <!-- Menu Items -->
        <nav v-if="props.menuItems.length > 0" class="flex-1 overflow-y-auto p-2">
          <ul class="space-y-1">
            <li v-for="item in props.menuItems" :key="item.id">
              <button
                class="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3"
                :class="item.disabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-white/10 cursor-pointer'"
                :disabled="item.disabled"
                @click="handleItemClick(item)"
              >
                <!-- SVG icon -->
                <svg
                  v-if="item.icon && iconPaths[item.icon]"
                  class="w-5 h-5 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    :d="iconPaths[item.icon]"
                  />
                </svg>
                <!-- Fallback: emoji -->
                <span v-else-if="item.icon" class="text-xl">{{ item.icon }}</span>
                <span class="text-base font-medium text-white">{{ item.label }}</span>
              </button>
            </li>
          </ul>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-gold-dark/15 text-xs text-gray-500 text-center">
          Hanafuda Koi-Koi
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active {
  transition: transform 0.3s ease-out;
}

.slide-leave-active {
  transition: transform 0.2s ease-in;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
