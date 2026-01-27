<script setup lang="ts">
/**
 * AnimationLayer - 全域動畫層組件
 *
 * @description
 * 渲染正在執行動畫的卡片，使用 absolute positioning 相對於 game page。
 * 動畫層跟隨頁面滾動，座標需從 viewport 轉換為容器相對座標。
 *
 * 取消機制：
 * - 使用 OperationSessionManager 的 AbortSignal 實現統一取消
 * - 當 operationSession.abortAll() 被呼叫時，所有動畫會自動中斷
 * - 不再需要 cancel callback 機制
 */

import { ref, reactive, watch } from 'vue'
import { useAnimationLayerStore } from '~/game-client/adapter/stores'
import CardComponent from './CardComponent.vue'
import { Z_INDEX } from '~/constants'
import { useAbortableMotion } from '~/game-client/adapter/abort'
import { container, TOKENS } from '~/game-client/adapter/di'
import type { OperationSessionManager } from '~/game-client/adapter/abort'
import { AbortOperationError } from '~/game-client/application/types/abort'

const store = useAnimationLayerStore()

// 從 DI 獲取 OperationSessionManager
const operationSession = container.resolve(TOKENS.OperationSessionManager) as OperationSessionManager

// 動畫層容器引用
const layerRef = ref<HTMLElement | null>(null)

/**
 * 將 viewport 座標轉換為相對於動畫層容器的座標
 *
 * @description
 * getBoundingClientRect() 返回的是 viewport 座標，
 * 但 AnimationLayer 使用 absolute 定位，需要容器相對座標。
 *
 * 注意：不需要加 scrollTop/scrollLeft，因為 layerRect 已經反映了滾動效果。
 * absolute 定位的元素會隨父容器滾動移動，所以 layerRect 會即時更新。
 */
function viewportToContainer(viewportX: number, viewportY: number): { x: number; y: number } {
  if (!layerRef.value) return { x: viewportX, y: viewportY }

  const layerRect = layerRef.value.getBoundingClientRect()

  return {
    x: viewportX - layerRect.left,
    y: viewportY - layerRect.top,
  }
}

/**
 * 座標快照緩存
 *
 * @description
 * 在卡片首次出現時計算容器座標並緩存，避免每次渲染重新計算。
 * 這解決了「fromRect 是快照，layerRect 是即時值」導致的座標不一致問題。
 */
const cardPositionCache = reactive<Record<string, { x: number; y: number }>>({})
const groupPositionCache = reactive<Record<string, { x: number; y: number }>>({})

// 監聽卡片變化，為新卡片計算並緩存座標
watch(
  () => store.animatingCards.map(c => c.cardId),
  (cardIds) => {
    // 為新卡片計算座標
    for (const card of store.animatingCards) {
      if (!(card.cardId in cardPositionCache) && layerRef.value) {
        const pos = viewportToContainer(card.fromRect.x, card.fromRect.y)
        cardPositionCache[card.cardId] = pos
      }
    }
    // 清理已移除的卡片
    const currentIds = new Set(cardIds)
    for (const id of Object.keys(cardPositionCache)) {
      if (!currentIds.has(id)) {
        delete cardPositionCache[id]
      }
    }
  },
  { immediate: true }
)

// 監聽組變化，為新組計算並緩存座標
watch(
  () => store.animatingGroups.map(g => g.groupId),
  (groupIds) => {
    // 為新組計算座標
    for (const group of store.animatingGroups) {
      if (!(group.groupId in groupPositionCache) && layerRef.value) {
        const pos = viewportToContainer(group.boundingBox.x, group.boundingBox.y)
        groupPositionCache[group.groupId] = pos
      }
    }
    // 清理已移除的組
    const currentIds = new Set(groupIds)
    for (const id of Object.keys(groupPositionCache)) {
      if (!currentIds.has(id)) {
        delete groupPositionCache[id]
      }
    }
  },
  { immediate: true }
)

/**
 * 獲取卡片的緩存座標，如果沒有則即時計算
 */
function getCardPosition(card: typeof store.animatingCards[0]): { x: number; y: number } {
  const cached = cardPositionCache[card.cardId]
  if (cached) {
    return cached
  }
  // 備用：如果快取不存在，即時計算（理論上不應該發生）
  const pos = viewportToContainer(card.fromRect.x, card.fromRect.y)
  cardPositionCache[card.cardId] = pos
  return pos
}

/**
 * 獲取組的緩存座標，如果沒有則即時計算
 */
function getGroupPosition(group: typeof store.animatingGroups[0]): { x: number; y: number } {
  const cached = groupPositionCache[group.groupId]
  if (cached) {
    return cached
  }
  // 備用：如果快取不存在，即時計算（理論上不應該發生）
  const pos = viewportToContainer(group.boundingBox.x, group.boundingBox.y)
  groupPositionCache[group.groupId] = pos
  return pos
}

// 追蹤已經開始動畫的卡片 ID
const animatedCardIds = ref<Set<string>>(new Set())

// 追蹤每張卡片的 DOM 元素（不需要響應式）
const cardRefs = new Map<string, HTMLElement>()

// 追蹤已經開始動畫的組 ID
const animatedGroupIds = ref<Set<string>>(new Set())

// 追蹤每個組容器的 DOM 元素（不需要響應式）
const groupRefs = new Map<string, HTMLElement>()

// 設置卡片 ref
function setCardRef(cardId: string, el: HTMLElement | null) {
  if (el) {
    cardRefs.set(cardId, el)
    // 當元素掛載時，立即檢查是否需要開始動畫
    startAnimationIfNeeded(cardId)
  } else {
    cardRefs.delete(cardId)
  }
}

// 為指定卡片開始動畫
async function startAnimationIfNeeded(cardId: string) {
  // 如果已經在動畫中，跳過
  if (animatedCardIds.value.has(cardId)) return

  const card = store.animatingCards.find(c => c.cardId === cardId)
  if (!card) return

  const el = cardRefs.get(cardId)
  if (!el) return

  // 標記為已開始動畫
  animatedCardIds.value.add(cardId)

  const effectType = card.cardEffectType || 'deal'

  // 設置 transform-origin 為左上角
  el.style.transformOrigin = '0 0'

  // 根據效果類型執行不同動畫
  type MotionConfig = Parameters<typeof useAbortableMotion>[1]
  let motionConfig: MotionConfig

  if (effectType === 'pulse') {
    // 脈衝效果：原地縮放
    motionConfig = {
      initial: {
        scale: 1,
        opacity: 1,
      },
      enter: {
        scale: [1, 1.15, 1],
        opacity: 1,
        transition: {
          duration: 300,
          ease: 'easeInOut',
        },
      },
    }
  } else if (effectType === 'fadeOut') {
    // 淡出效果
    motionConfig = {
      initial: {
        opacity: 1,
      },
      enter: {
        opacity: 0,
        transition: {
          duration: 250,
          ease: 'easeOut',
        },
      },
    }
  } else if (effectType === 'fadeIn') {
    // 淡入效果
    motionConfig = {
      initial: {
        opacity: 0,
      },
      enter: {
        opacity: 1,
        transition: {
          duration: 250,
          ease: 'easeIn',
        },
      },
    }
  } else {
    // deal 或 move：移動動畫
    const scaleRatio = card.toRect.width / card.fromRect.width
    const deltaX = card.toRect.x - card.fromRect.x
    const deltaY = card.toRect.y - card.fromRect.y
    const initialOpacity = effectType === 'move' ? 1 : 0

    motionConfig = {
      initial: {
        x: 0,
        y: 0,
        scale: 1,
        opacity: initialOpacity,
      },
      enter: {
        x: deltaX,
        y: deltaY,
        scale: scaleRatio,
        opacity: 1,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 25,
        },
      },
    }
  }

  // 使用 useAbortableMotion 支援 AbortSignal 取消
  const signal = operationSession.getSignal()
  const { apply } = useAbortableMotion(el, motionConfig, signal)

  try {
    // 執行動畫並等待完成
    await apply('enter')
    // 動畫正常完成
    card.onComplete()
    store.removeCard(card.cardId)
    animatedCardIds.value.delete(cardId)
  } catch (error) {
    // 如果是 AbortOperationError，靜默忽略（動畫已被取消）
    if (error instanceof AbortOperationError) {
      animatedCardIds.value.delete(cardId)
      return
    }
    // 其他錯誤重新拋出
    throw error
  }
}

// 設置組容器 ref
function setGroupRef(groupId: string, el: HTMLElement | null) {
  if (el) {
    groupRefs.set(groupId, el)
    // 當元素掛載時，立即檢查是否需要開始動畫
    startGroupAnimation(groupId)
  } else {
    groupRefs.delete(groupId)
  }
}

// 為指定組開始動畫
async function startGroupAnimation(groupId: string) {
  // 如果已經在動畫中，跳過
  if (animatedGroupIds.value.has(groupId)) return

  const group = store.animatingGroups.find(g => g.groupId === groupId)
  if (!group) return

  const el = groupRefs.get(groupId)
  if (!el) return

  // 標記為已開始動畫
  animatedGroupIds.value.add(groupId)

  const effectType = group.groupEffectType

  // 使用 useAbortableMotion 支援 AbortSignal 取消
  const signal = operationSession.getSignal()

  try {
    // pulseToFadeOut 需要特殊處理：先 pulse 後 fadeOut，無縫銜接
    if (effectType === 'pulseToFadeOut') {
      await executePulseToFadeOut(el, signal, group.onPulseComplete)
    } else {
      await executeSimpleGroupAnimation(el, effectType, signal)
    }

    // 動畫正常完成
    group.onComplete()
    store.removeGroup(group.groupId)
    animatedGroupIds.value.delete(groupId)
  } catch (error) {
    // 如果是 AbortOperationError，靜默忽略（動畫已被取消）
    if (error instanceof AbortOperationError) {
      animatedGroupIds.value.delete(groupId)
      return
    }
    // 其他錯誤重新拋出
    throw error
  }
}

/**
 * 執行 pulse → fadeOut 連續動畫（無縫銜接）
 *
 * @description
 * 解決配對動畫閃爍問題：pulse 完成後直接過渡到 fadeOut，
 * 不移除 group 再創建新 group，完全避免空窗期。
 *
 * @param onPulseComplete - pulse 完成後、fadeOut 開始前的回調，
 *                          用於同步更新獲得區 DOM 並啟動 fadeIn 動畫
 */
async function executePulseToFadeOut(
  el: HTMLElement,
  signal: AbortSignal,
  onPulseComplete?: () => void
) {
  type MotionConfig = Parameters<typeof useAbortableMotion>[1]

  // Phase 1: Pulse 動畫
  const pulseConfig: MotionConfig = {
    initial: {
      scale: 1,
      opacity: 1,
    },
    enter: {
      scale: [1, 1.15, 1],
      opacity: 1,
      transition: {
        duration: 300,
        ease: 'easeInOut',
      },
    },
  }

  const { apply: applyPulse } = useAbortableMotion(el, pulseConfig, signal)
  await applyPulse('enter')

  // Pulse 完成，通知調用者（此時開始更新獲得區並啟動 fadeIn）
  onPulseComplete?.()

  // Phase 2: FadeOut 動畫（與獲得區 fadeIn 同步）
  const fadeOutConfig: MotionConfig = {
    initial: {
      scale: 1,
      opacity: 1,
    },
    enter: {
      scale: 1,
      opacity: 0,
      transition: {
        duration: 250,
        ease: 'easeOut',
      },
    },
  }

  const { apply: applyFadeOut } = useAbortableMotion(el, fadeOutConfig, signal)
  await applyFadeOut('enter')
}

/**
 * 執行簡單的組動畫（單一效果）
 */
async function executeSimpleGroupAnimation(
  el: HTMLElement,
  effectType: 'pulse' | 'fadeOut' | 'fadeIn',
  signal: AbortSignal
) {
  type MotionConfig = Parameters<typeof useAbortableMotion>[1]
  let motionConfig: MotionConfig

  if (effectType === 'pulse') {
    // 脈衝效果：原地縮放
    motionConfig = {
      initial: {
        scale: 1,
        opacity: 1,
      },
      enter: {
        scale: [1, 1.15, 1],
        opacity: 1,
        transition: {
          duration: 300,
          ease: 'easeInOut',
        },
      },
    }
  } else if (effectType === 'fadeOut') {
    // 淡出效果
    motionConfig = {
      initial: {
        opacity: 1,
      },
      enter: {
        opacity: 0,
        transition: {
          duration: 250,
          ease: 'easeOut',
        },
      },
    }
  } else if (effectType === 'fadeIn') {
    // 淡入效果
    motionConfig = {
      initial: {
        opacity: 0,
      },
      enter: {
        opacity: 1,
        transition: {
          duration: 250,
          ease: 'easeIn',
        },
      },
    }
  } else {
    // 預設：無動畫
    motionConfig = {
      initial: { opacity: 1 },
      enter: { opacity: 1 },
    }
  }

  const { apply } = useAbortableMotion(el, motionConfig, signal)
  await apply('enter')
}

</script>

<template>
  <!-- 動畫層相對於 game page 定位，跟隨頁面滾動 -->
  <div
    ref="layerRef"
    class="absolute inset-0 pointer-events-none"
    :style="{ zIndex: Z_INDEX.ANIMATION }"
  >
    <!-- 單獨卡片動畫 -->
    <div
      v-for="card in store.animatingCards"
      :key="card.cardId"
      :ref="(el) => setCardRef(card.cardId, el as HTMLElement)"
      class="absolute"
      :style="{
        left: `${getCardPosition(card).x}px`,
        top: `${getCardPosition(card).y}px`,
        width: `${card.fromRect.width}px`,
        height: `${card.fromRect.height}px`,
        willChange: 'transform, opacity',
      }"
    >
      <CardComponent
        :card-id="card.renderCardId || card.cardId"
        :is-animation-clone="true"
        :is-face-down="card.isFaceDown"
      />
    </div>

    <!-- 卡片組動畫（容器控制 opacity/scale，卡片使用相對座標） -->
    <div
      v-for="group in store.animatingGroups"
      :key="group.groupId"
      :ref="(el) => setGroupRef(group.groupId, el as HTMLElement)"
      class="absolute"
      :style="{
        left: `${getGroupPosition(group).x}px`,
        top: `${getGroupPosition(group).y}px`,
        width: `${group.boundingBox.width}px`,
        height: `${group.boundingBox.height}px`,
        willChange: 'transform, opacity',
      }"
    >
      <div
        v-for="card in group.cards"
        :key="card.cardId"
        class="absolute"
        :style="{
          left: `${card.fromRect.x - group.boundingBox.x}px`,
          top: `${card.fromRect.y - group.boundingBox.y}px`,
          width: `${card.fromRect.width}px`,
          height: `${card.fromRect.height}px`,
        }"
      >
        <CardComponent
          :card-id="card.renderCardId || card.cardId"
          :is-animation-clone="true"
          :is-face-down="card.isFaceDown"
        />
      </div>
    </div>
  </div>
</template>
