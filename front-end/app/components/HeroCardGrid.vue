<script setup lang="ts">
/**
 * HeroCardGrid - Hero 區塊卡牌網格背景組件
 *
 * @description
 * 在 Hero Section 背景顯示花牌網格，支援 hover 懸浮效果。
 * 使用視覺豐富的光札與種札，營造日式傳統氛圍。
 */

import { computed, ref, shallowRef, onMounted } from 'vue'
import SvgIcon from '~/components/SvgIcon.vue'
import { ALL_CARD_IDS } from '../../shared/constants/cardConstants'
import { getCardIconName } from '~/utils/cardMapping'

interface Props {
  parallaxOffset?: number
}

withDefaults(defineProps<Props>(), {
  parallaxOffset: 0,
})

/**
 * Fisher-Yates 洗牌演算法（使用種子確保 SSR 一致性）
 *
 * 演算法說明：
 * 1. 複製輸入陣列
 * 2. 從最後一個元素開始，向前遍歷
 * 3. 對每個位置，隨機選擇一個前面的位置（含自己）
 * 4. 交換這兩個位置的元素
 * 5. 結果是完全隨機且不重複的排列
 */
const shuffleWithSeed = <T>(array: readonly T[], seed: number): T[] => {
  const result = [...array]
  let currentSeed = seed

  // 簡單的偽隨機數生成器
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280
    return currentSeed / 233280
  }

  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temp = result[i]
    const swap = result[j]
    if (temp !== undefined && swap !== undefined) {
      result[i] = swap
      result[j] = temp
    }
  }

  return result
}

/**
 * 生成顯示卡片列表
 *
 * 使用 SSOT（ALL_CARD_IDS）作為卡片來源，
 * 打亂後取用所需張數，再轉換為 SVG 圖示名稱
 */
const displayCards = computed(() => {
  // 9列 x 6行 = 54張
  const targetCount = 54

  // 打亂 48 張牌（使用動態種子）
  const shuffled = shuffleWithSeed(ALL_CARD_IDS, seed.value)

  // 取用所需張數（超過 48 張則循環）
  const cardIds: string[] = []
  for (let i = 0; i < targetCount; i++) {
    const cardId = shuffled[i % shuffled.length]
    if (cardId !== undefined) {
      cardIds.push(cardId)
    }
  }

  // 轉換為 SVG 圖示名稱
  return cardIds.map(id => getCardIconName(id))
})

// 檢測是否支援真正的 hover（非觸控設備）
// 使用 ref 並在 onMounted 設定，避免 SSR hydration 不一致
const supportsHover = ref(true)

onMounted(() => {
  supportsHover.value = window.matchMedia('(hover: hover)').matches
})

// 動態種子（SSR 用固定值，CSR 重新洗牌）
const seed = ref(42)

onMounted(() => {
  // 客戶端載入時使用時間戳重新洗牌
  seed.value = Date.now()
})

// hover 狀態追蹤（每張卡片獨立）
const hoveredIndex = ref<number | null>(null)

// 卡片 refs 用於動畫
const cardRefs = shallowRef<Map<number, HTMLElement>>(new Map())

// 設定卡片 ref
const setCardRef = (index: number, el: HTMLElement | null) => {
  if (el) {
    cardRefs.value.set(index, el)
  } else {
    cardRefs.value.delete(index)
  }
}

// 處理滑鼠進入
const handleMouseEnter = (index: number) => {
  if (!supportsHover.value) return
  hoveredIndex.value = index
}

// 處理滑鼠離開
const handleMouseLeave = () => {
  hoveredIndex.value = null
}

// 計算卡片樣式（hover 狀態）
const getCardStyle = (index: number) => {
  const isHovered = hoveredIndex.value === index
  if (!isHovered) {
    return {
      transform: 'translateY(0) scale(1)',
      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
    }
  }
  return {
    transform: 'scale(1.04)',
    filter: `
      drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15))
      drop-shadow(0 8px 12px rgba(0, 0, 0, 0.10))
    `.trim(),
  }
}
</script>

<template>
  <div
    class="hero-card-grid absolute inset-0 overflow-hidden"
    :style="{ transform: `translateY(${parallaxOffset * 0.2}px)` }"
    aria-hidden="true"
  >
    <!-- 網格容器 - 置中顯示，自動行高 -->
    <div class="grid-container absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        class="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-9 auto-rows-auto w-full"
      >
        <div
          v-for="(card, index) in displayCards"
          :key="index"
          :ref="(el) => setCardRef(index, el as HTMLElement)"
          class="hero-card transition-all duration-300 ease-out"
          :class="{ 'z-20': hoveredIndex === index, 'z-10': hoveredIndex !== index }"
          :style="getCardStyle(index)"
          @mouseenter="handleMouseEnter(index)"
          @mouseleave="handleMouseLeave"
        >
          <SvgIcon
            :name="card"
            class-name="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 卡片填滿網格單元，保持比例 */
.hero-card {
  width: 100%;
  aspect-ratio: 976 / 1600; /* 花牌標準比例 */
  overflow: visible; /* 允許 hover 效果溢出 */
  margin: -1px; /* 防止子像素渲染造成的背景穿透 */
}

</style>
