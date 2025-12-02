<!--
  ActionPanel.vue - 可重用的操作面板組件

  @description
  從右側滑出的選單面板，可用於大廳和遊戲頁面。

  功能:
  - 從右側滑出動畫
  - 點擊遮罩或關閉按鈕關閉
  - 顯示選單項目列表
  - 可重用於不同 context（lobby, game）

  Props:
  - isOpen: boolean - 面板是否開啟
  - items: ActionPanelItem[] - 選單項目列表

  Events:
  - @close - 關閉面板時觸發
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMotion } from '@vueuse/motion'
import { Z_INDEX } from '@/constants'

// Props 定義
export interface ActionPanelItem {
  id: string
  label: string
  icon?: string
  onClick: () => void
}

interface Props {
  isOpen: boolean
  items: ActionPanelItem[]
}

const props = defineProps<Props>()

// Events 定義
const emit = defineEmits<{
  close: []
}>()

// Template refs
const panelRef = ref<HTMLElement | null>(null)

// 初始化動畫
const initMotion = () => {
  if (!panelRef.value) return

  useMotion(panelRef.value, {
    initial: {
      x: 320, // 從右側 320px 外開始
      opacity: 0,
    },
    enter: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    leave: {
      x: 320,
      opacity: 0,
      transition: {
        duration: 200,
      },
    },
  })
}

// 監聽 isOpen 變化來初始化動畫
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue && panelRef.value) {
      initMotion()
    }
  },
  { immediate: true }
)

// 關閉面板
const handleClose = () => {
  emit('close')
}

// 點擊選單項目
const handleItemClick = (item: ActionPanelItem) => {
  item.onClick()
}
</script>

<template>
  <!-- 只在 isOpen 時渲染 -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 flex items-center justify-end"
        :style="{ zIndex: Z_INDEX.OVERLAY }"
      >
        <!-- 遮罩背景 -->
        <div
          data-testid="panel-overlay"
          class="absolute inset-0 bg-black/50 transition-opacity"
          @click="handleClose"
        />

        <!-- 面板內容 -->
        <div
          ref="panelRef"
          data-testid="action-panel"
          role="dialog"
          aria-label="Action menu"
          class="relative right-0 h-full w-80 bg-white shadow-2xl flex flex-col"
          :style="{ zIndex: Z_INDEX.PANEL }"
        >
          <!-- 面板標題與關閉按鈕 -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              data-testid="close-button"
              aria-label="Close menu"
              class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              @click="handleClose"
            >
              <!-- Close Icon (X) -->
              <svg
                class="h-5 w-5 text-gray-600"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>

          <!-- 選單項目列表 -->
          <nav class="flex-1 overflow-y-auto p-2">
            <ul class="space-y-1">
              <li v-for="item in items" :key="item.id">
                <button
                  data-testid="menu-item"
                  class="w-full text-left px-4 py-3 rounded-lg hover:bg-primary-50 transition-colors flex items-center space-x-3"
                  @click="handleItemClick(item)"
                >
                  <!-- Icon (如果有) -->
                  <span v-if="item.icon" class="text-xl">{{ item.icon }}</span>

                  <!-- Label -->
                  <span class="text-base font-medium text-gray-900">{{ item.label }}</span>
                </button>
              </li>
            </ul>

            <!-- 空狀態 (沒有選單項目時) -->
            <div v-if="items.length === 0" class="text-center py-8 text-gray-500">
              No options available
            </div>
          </nav>

          <!-- 面板底部 (可選) -->
          <div class="p-4 border-t border-gray-200 text-xs text-gray-500 text-center">
            Hanafuda Koi-Koi
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Fade 過渡效果 (用於遮罩) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
