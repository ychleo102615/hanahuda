<script setup lang="ts">
/**
 * PlayerProfilePopover Component
 *
 * @description
 * 玩家資訊彈出卡片。
 * 顯示玩家名稱、帳號類型，並提供登出功能。
 * 訪客玩家會顯示註冊提示。
 *
 * 定位策略：
 * - 若提供 anchorRef，則相對於錨點元素定位（出現在正下方）
 * - 若未提供 anchorRef，則使用預設位置（右上角）
 *
 * 參考: specs/010-player-account/spec.md FR-027, FR-027a, FR-027b
 */

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Z_INDEX } from '~/constants/z-index'

interface Props {
  /** 是否顯示 */
  isOpen: boolean
  /** 玩家顯示名稱 */
  displayName: string
  /** 是否為訪客 */
  isGuest: boolean
  /** 錨點元素（可選，用於相對定位） */
  anchorRef?: HTMLElement | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  logout: []
  deleteAccount: []
}>()

const popoverRef = ref<HTMLElement | null>(null)

// 動態計算 Popover 位置
const popoverPosition = ref({ top: '64px', right: '16px' })

function updatePosition() {
  if (!props.anchorRef) {
    // 無錨點時使用預設位置
    popoverPosition.value = { top: '64px', right: '16px' }
    return
  }

  const rect = props.anchorRef.getBoundingClientRect()
  // Popover 出現在錨點正下方，右邊對齊
  const top = rect.bottom + 8 // 錨點下方 8px
  const right = window.innerWidth - rect.right // 右邊對齊

  popoverPosition.value = {
    top: `${top}px`,
    right: `${right}px`,
  }
}

// 監聽開啟狀態，更新位置
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    updatePosition()
  }
})

// 點擊外部關閉
function handleClickOutside(event: MouseEvent) {
  if (!props.isOpen) return
  const target = event.target as Node
  // 排除錨點元素的點擊
  if (props.anchorRef && props.anchorRef.contains(target)) {
    return
  }
  if (popoverRef.value && !popoverRef.value.contains(target)) {
    emit('close')
  }
}

// ESC 關閉
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

function handleLogout() {
  emit('logout')
  emit('close')
}

function handleDeleteAccount() {
  emit('deleteAccount')
  emit('close')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', updatePosition)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', updatePosition)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="popover-fade">
      <div
        v-if="isOpen"
        ref="popoverRef"
        class="fixed w-72 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
        :style="{
          zIndex: Z_INDEX.MODAL,
          top: popoverPosition.top,
          right: popoverPosition.right,
        }"
        role="dialog"
        aria-label="Player profile"
      >
        <!-- 玩家資訊區 -->
        <div class="p-4 border-b border-gray-700">
          <div class="flex items-center gap-3">
            <!-- 大頭像 -->
            <div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
              </svg>
            </div>
            <!-- 名稱與標籤 -->
            <div class="flex-1 min-w-0">
              <div class="text-white font-semibold truncate">{{ displayName }}</div>
              <div v-if="isGuest" class="text-xs text-gray-400 mt-0.5">
                Guest account
              </div>
              <div v-else class="text-xs text-green-400 mt-0.5">
                Registered player
              </div>
            </div>
          </div>
        </div>

        <!-- 訪客提示區（僅訪客顯示） -->
        <div v-if="isGuest" class="px-4 py-3 bg-amber-900/20 border-b border-gray-700">
          <p class="text-xs text-amber-300">
            Register to save your progress across devices
          </p>
          <NuxtLink
            to="/register"
            class="mt-2 inline-block text-xs text-primary-400 hover:text-primary-300"
            @click="emit('close')"
          >
            Create account →
          </NuxtLink>
        </div>

        <!-- 操作按鈕區 -->
        <div class="p-2 space-y-1">
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
    </Transition>
  </Teleport>
</template>

<style scoped>
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
