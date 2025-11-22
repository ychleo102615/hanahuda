<script setup lang="ts">
/**
 * DeckZone - 牌堆組件
 *
 * @description
 * 顯示牌堆和剩餘牌數，作為發牌動畫的視覺起點。
 * 支援視覺堆疊效果（3-4 層偏移）。
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../../../user-interface/adapter/stores/gameState'
import { useZoneRegistration } from '../../../user-interface/adapter/composables/useZoneRegistration'
import SvgIcon from '@/components/SvgIcon.vue'
import { CARD_BACK_ICON_NAME } from '@/utils/cardMapping'

const gameState = useGameStateStore()
const { deckRemaining, visualLayers } = storeToRefs(gameState)

// 註冊區域位置
const { elementRef: deckRef } = useZoneRegistration('deck')

// 產生堆疊層的偏移樣式
const layerStyles = computed(() => {
  const layers = []
  for (let i = 0; i < visualLayers.value; i++) {
    layers.push({
      transform: `translate(0px, ${i * -2}px)`,
      zIndex: i,
    })
  }
  return layers
})
</script>

<template>
  <div ref="deckRef" class="relative flex flex-col items-center justify-center h-full p-2">
    <!-- 牌堆視覺堆疊 -->
    <div class="relative w-16 h-24">
      <div
        v-for="(style, index) in layerStyles"
        :key="index"
        :style="style"
        :data-testid="'deck-layer'"
        class="absolute inset-0"
      >
        <SvgIcon
          :name="CARD_BACK_ICON_NAME"
          class-name="h-24 w-auto"
          aria-label="Card back"
        />
      </div>
    </div>

    <!-- 剩餘牌數顯示 -->
    <div class="mt-2 text-white text-sm font-medium bg-black/60 px-2 py-0.5 rounded">
      {{ deckRemaining }}
    </div>
  </div>
</template>
