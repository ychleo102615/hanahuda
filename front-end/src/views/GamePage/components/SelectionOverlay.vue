<script setup lang="ts">
/**
 * SelectionOverlay - 配對選擇覆蓋層
 *
 * @description
 * 當翻牌出現雙重配對時，顯示可選目標列表供玩家選擇。
 * 覆蓋在遊戲畫面上方，高亮可選卡片。
 */

import { storeToRefs } from 'pinia'
import { useUIStateStore } from '../../../user-interface/adapter/stores/uiState'
import { inject } from 'vue'
import { TOKENS } from '../../../user-interface/adapter/di/tokens'
import type { SelectMatchTargetPort } from '../../../user-interface/application/ports/input'

const uiState = useUIStateStore()
const { selectionMode, selectionPossibleTargets } = storeToRefs(uiState)

// T059 [US2]: 注入 SelectMatchTargetPort
const selectMatchTargetPort = inject<SelectMatchTargetPort>(
  TOKENS.SelectMatchTargetPort.toString()
)

const emit = defineEmits<{
  targetSelected: [targetCardId: string]
}>()

// 處理目標選擇
function handleTargetSelect(targetCardId: string) {
  if (selectMatchTargetPort) {
    selectMatchTargetPort.execute({
      sourceCardId: uiState.selectionSourceCard || '',
      targetCardId,
      possibleTargets: [...selectionPossibleTargets.value],
    })
  }

  emit('targetSelected', targetCardId)
  uiState.hideSelectionUI()
}

// 取消選擇
function handleCancel() {
  uiState.hideSelectionUI()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="selectionMode"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="handleCancel"
      >
        <div class="rounded-lg bg-gray-900 p-6 shadow-xl">
          <h3 class="mb-4 text-center text-lg font-semibold text-white">
            Select a matching card
          </h3>

          <p class="mb-4 text-center text-sm text-gray-400">
            Choose one of the highlighted cards to match
          </p>

          <div class="mb-4 flex flex-wrap justify-center gap-2">
            <button
              v-for="cardId in selectionPossibleTargets"
              :key="cardId"
              class="rounded border-2 border-yellow-400 bg-gray-800 px-4 py-2 text-white hover:bg-yellow-600"
              @click="handleTargetSelect(cardId)"
            >
              {{ cardId }}
            </button>
          </div>

          <div class="text-center">
            <button
              class="rounded bg-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
              @click="handleCancel"
            >
              Cancel
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
