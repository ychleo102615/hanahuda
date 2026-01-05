<script setup lang="ts">
/**
 * PlayerInfoCard Component
 *
 * @description
 * 玩家資訊展示小卡（純資訊展示，無操作按鈕）。
 * 僅顯示玩家名稱和帳號類型。
 * 用於大廳和遊戲頁面，點擊帳號圖示時顯示。
 *
 * 定位策略：
 * - 若提供 anchorRef，則相對於錨點元素定位（出現在正下方）
 * - 若未提供 anchorRef，則使用預設位置（右上角）
 *
 * 參考: specs/010-player-account/spec.md FR-030
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
}>()

const cardRef = ref<HTMLElement | null>(null)

// 動態計算 Card 位置
const cardPosition = ref({ top: '64px', right: '16px' })

function updatePosition() {
  if (!props.anchorRef) {
    // 無錨點時使用預設位置
    cardPosition.value = { top: '64px', right: '16px' }
    return
  }

  const rect = props.anchorRef.getBoundingClientRect()
  // Card 出現在錨點正下方，右邊對齊
  const top = rect.bottom + 8 // 錨點下方 8px
  const right = window.innerWidth - rect.right // 右邊對齊

  cardPosition.value = {
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
  if (cardRef.value && !cardRef.value.contains(target)) {
    emit('close')
  }
}

// ESC 關閉
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.isOpen) {
    emit('close')
  }
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
    <Transition name="card-fade">
      <div
        v-if="isOpen"
        ref="cardRef"
        class="fixed w-52 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
        :style="{
          zIndex: Z_INDEX.MODAL,
          top: cardPosition.top,
          right: cardPosition.right,
        }"
        role="tooltip"
        aria-label="Player info"
      >
        <!-- 玩家資訊區 -->
        <div class="p-4">
          <div class="flex items-center gap-3">
            <!-- 頭像 -->
            <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
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
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.card-fade-enter-active,
.card-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.card-fade-enter-from,
.card-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
