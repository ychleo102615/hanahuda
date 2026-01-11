<script setup lang="ts">
/**
 * ConfirmationHint - 底部提示文字組件
 *
 * @description
 * 在手牌確認模式時，根據配對數量顯示不同的提示文字。
 * 固定在畫面底部中央，提供清晰的操作引導。
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIStateStore } from '~/game-client/adapter/stores/uiState'

const uiState = useUIStateStore()
const { handCardConfirmationMode, matchCount } = storeToRefs(uiState)

// 根據配對數量計算提示文字
const hintText = computed(() => {
  if (!handCardConfirmationMode.value) {
    return ''
  }

  switch (matchCount.value) {
    case 0:
      return 'Click to play card'
    case 1:
      return 'Click card again or click field card to play'
    default:
      return 'Click highlighted field card to select match'
  }
})

// 是否顯示提示
const isVisible = computed(() => {
  return handCardConfirmationMode.value && hintText.value !== ''
})
</script>

<template>
  <Transition name="hint">
    <div
      v-if="isVisible"
      class="fixed bottom-[26%] left-1/2 -translate-x-1/2 z-50"
    >
      <div
        class="px-6 py-3 bg-gray-800 bg-opacity-90 text-white text-sm font-medium rounded-lg shadow-lg"
      >
        {{ hintText }}
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 淡入淡出動畫 */
.hint-enter-active,
.hint-leave-active {
  transition: opacity 200ms ease;
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
}
</style>
