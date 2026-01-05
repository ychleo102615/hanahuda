<!--
  UnifiedPlayerMenu.vue - 統一玩家選單組件

  @description
  響應式玩家選單容器，根據螢幕尺寸切換顯示模式：
  - 電腦模式：右側滑出面板（整合 ActionPanel）
  - 手機模式：上方彈出 Popover

  包含：
  - 玩家資訊（PlayerBadge）
  - Sign Out / Delete Account 操作按鈕
  - 自訂選單項目

  Props:
  - isOpen: boolean - 選單是否開啟
  - player: { displayName: string; isGuest: boolean } - 玩家資訊
  - items: ActionPanelItem[] - 選單項目列表

  Events:
  - @close - 關閉選單
  - @logout - 登出
  - @deleteAccount - 刪除帳號
-->

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { useMotion } from '@vueuse/motion'
import { Z_INDEX } from '~/constants'
import { useResponsiveMenu } from '~/composables/useResponsiveMenu'
import PlayerBadge from '~/components/PlayerBadge.vue'
import type { ActionPanelItem } from '~/components/ActionPanel.vue'

/**
 * SVG Path 映射表
 * 用於將 icon 名稱轉換為內嵌 SVG path
 */
const iconPaths: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  'door-exit': 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
}

interface PlayerInfo {
  displayName: string
  isGuest: boolean
}

interface Props {
  isOpen: boolean
  player: PlayerInfo
  items?: ActionPanelItem[]
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
})

const emit = defineEmits<{
  close: []
  logout: []
  deleteAccount: []
}>()

const { isMobile } = useResponsiveMenu()

// Template refs
const panelRef = shallowRef<HTMLElement | null>(null)
const popoverRef = shallowRef<HTMLElement | null>(null)

// 初始化桌面版動畫
const initDesktopMotion = () => {
  if (!panelRef.value) return

  useMotion(panelRef.value, {
    initial: { x: 320, opacity: 0 },
    enter: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
    leave: {
      x: 320,
      opacity: 0,
      transition: { duration: 200 },
    },
  })
}

// 初始化手機版動畫
const initMobileMotion = () => {
  if (!popoverRef.value) return

  useMotion(popoverRef.value, {
    initial: { y: -20, opacity: 0 },
    enter: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 25 },
    },
    leave: {
      y: -20,
      opacity: 0,
      transition: { duration: 150 },
    },
  })
}

// 監聽開啟狀態
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      if (isMobile.value) {
        setTimeout(initMobileMotion, 0)
      } else {
        setTimeout(initDesktopMotion, 0)
      }
    }
  },
  { immediate: true },
)

// 處理選單項目點擊
const handleItemClick = (item: ActionPanelItem) => {
  if (item.disabled) return
  item.onClick()
}

// 處理登出
const handleLogout = () => {
  emit('logout')
  emit('close')
}

// 處理刪除帳號
const handleDeleteAccount = () => {
  emit('deleteAccount')
  emit('close')
}

// 關閉選單
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0"
        :style="{ zIndex: Z_INDEX.OVERLAY }"
      >
        <!-- 遮罩背景 -->
        <div
          class="absolute inset-0 bg-black/50 transition-opacity"
          @click="handleClose"
        />

        <!-- 桌面版：右側滑出面板 -->
        <div
          v-if="!isMobile"
          ref="panelRef"
          class="absolute right-0 top-0 h-full w-80 bg-gray-800 shadow-2xl flex flex-col"
          :style="{ zIndex: Z_INDEX.PANEL }"
          role="dialog"
          aria-label="Player menu"
        >
          <!-- 標題與關閉按鈕 -->
          <div class="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 class="text-lg font-semibold text-white">Menu</h2>
            <button
              aria-label="Close menu"
              class="p-2 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
              @click="handleClose"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!-- 玩家資訊區塊 -->
          <div class="p-4 border-b border-gray-700">
            <div class="flex items-center gap-3 mb-3">
              <PlayerBadge
                :display-name="player.displayName"
                :is-guest="player.isGuest"
                :show-guest-label="true"
                size="lg"
              />
            </div>
            <!-- 玩家操作按鈕 -->
            <div class="space-y-2">
              <button
                @click="handleLogout"
                class="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3"
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

          <!-- 選單項目列表 -->
          <nav v-if="items.length > 0" class="flex-1 overflow-y-auto p-2">
            <ul class="space-y-1">
              <li v-for="item in items" :key="item.id">
                <button
                  class="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3"
                  :class="item.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-gray-700 cursor-pointer'"
                  :disabled="item.disabled"
                  @click="handleItemClick(item)"
                >
                  <!-- SVG icon (if icon name exists in iconPaths) -->
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
                  <!-- Fallback: emoji or text -->
                  <span v-else-if="item.icon" class="text-xl">{{ item.icon }}</span>
                  <span class="text-base font-medium text-white">{{ item.label }}</span>
                </button>
              </li>
            </ul>
          </nav>

          <!-- 底部 -->
          <div class="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
            Hanafuda Koi-Koi
          </div>
        </div>

        <!-- 手機版：上方彈出 Popover -->
        <div
          v-else
          ref="popoverRef"
          class="absolute right-4 top-4 w-72 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
          :style="{ zIndex: Z_INDEX.MODAL }"
          role="dialog"
          aria-label="Player menu"
        >
          <!-- 玩家資訊區塊 -->
          <div class="p-4 border-b border-gray-700">
            <div class="flex items-center gap-3">
              <PlayerBadge
                :display-name="player.displayName"
                :is-guest="player.isGuest"
                :show-guest-label="true"
                size="md"
              />
            </div>
          </div>

          <!-- 操作按鈕區 -->
          <div class="p-3 space-y-1 border-b border-gray-700">
            <button
              @click="handleLogout"
              class="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3"
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

          <!-- 選單項目列表（手機版） -->
          <div v-if="items.length > 0" class="p-2">
            <button
              v-for="item in items"
              :key="item.id"
              class="w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3"
              :class="item.disabled
                ? 'cursor-not-allowed opacity-50'
                : 'hover:bg-gray-700 cursor-pointer'"
              :disabled="item.disabled"
              @click="handleItemClick(item)"
            >
              <!-- SVG icon (if icon name exists in iconPaths) -->
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
              <!-- Fallback: emoji or text -->
              <span v-else-if="item.icon" class="text-xl">{{ item.icon }}</span>
              <span class="text-base font-medium text-white">{{ item.label }}</span>
            </button>
          </div>
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
</style>
