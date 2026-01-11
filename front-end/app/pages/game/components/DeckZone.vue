<script setup lang="ts">
/**
 * DeckZone - 牌堆組件
 *
 * @description
 * 顯示牌堆和剩餘牌數，作為發牌動畫的視覺起點。
 * 支援視覺堆疊效果（3-4 層偏移）。
 *
 * 響應式設計：
 * - 大螢幕 (>=640px)：正常顯示在 FieldZone 右側
 * - 小螢幕 (<640px)：absolute 定位在畫面右側（跟隨頁面滾動）
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '~/game-client/adapter/stores/gameState'
import { useZoneRegistration } from '~/game-client/adapter/composables/useZoneRegistration'
import SvgIcon from '~/components/SvgIcon.vue'
import { CARD_BACK_ICON_NAME } from '~/utils/cardMapping'

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
  <!--
    響應式定位：
    - 小螢幕：absolute 定位在畫面右側中央（跟隨頁面滾動）
    - 大螢幕：正常定位在 FieldZone 右側
  -->
  <div class="
    absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-auto
    sm:static sm:translate-y-0 sm:z-auto sm:w-24 sm:h-full
    flex flex-col items-center justify-center p-2
  ">
    <!-- 牌堆視覺堆疊（ref 用於動畫定位） -->
    <div ref="deckRef" class="relative w-16 h-24 flex justify-center">
      <!-- 大螢幕：顯示牌堆 -->
      <div
        v-for="(style, index) in layerStyles"
        :key="index"
        :data-card-id="'deck' + index"
        :style="style"
        :data-testid="'deck-layer'"
        class="absolute items-center justify-center rounded-md hidden sm:inline-flex"
      >
        <SvgIcon
          :name="CARD_BACK_ICON_NAME"
          class-name="h-24 w-auto"
          aria-label="Card back"
        />
      </div>
    </div>

    <!-- 剩餘牌數顯示：小螢幕隱藏 -->
    <div class="hidden sm:block mt-2 text-white text-sm font-medium bg-black/60 px-2 py-0.5 rounded">
      {{ deckRemaining }}
    </div>
  </div>
</template>

