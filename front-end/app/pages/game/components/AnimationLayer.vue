<script setup lang="ts">
/**
 * AnimationLayer - 全域動畫層組件
 *
 * @description
 * 渲染正在執行動畫的卡片，使用 fixed positioning 避免 overflow 裁切。
 * 透過 Teleport 將動畫層放到 body，確保在最上層。
 *
 * 取消機制：
 * - 使用 OperationSessionManager 的 AbortSignal 實現統一取消
 * - 當 operationSession.abortAll() 被呼叫時，所有動畫會自動中斷
 * - 不再需要 cancel callback 機制
 */

import { ref } from 'vue'
import { useAnimationLayerStore } from '~/user-interface/adapter/stores'
import CardComponent from './CardComponent.vue'
import { Z_INDEX } from '~/constants'
import { useAbortableMotion } from '~/user-interface/adapter/abort'
import { container, TOKENS } from '~/user-interface/adapter/di'
import type { OperationSessionManager } from '~/user-interface/adapter/abort'
import { AbortOperationError } from '~/user-interface/application/types/abort'

const store = useAnimationLayerStore()

// 從 DI 獲取 OperationSessionManager
const operationSession = container.resolve(TOKENS.OperationSessionManager) as OperationSessionManager

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
      console.info(`[AnimationLayer] Card animation aborted: ${cardId}`)
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
      console.info(`[AnimationLayer] Group animation aborted: ${groupId}`)
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
  <Teleport to="body">
    <div class="fixed inset-0 pointer-events-none" :style="{ zIndex: Z_INDEX.ANIMATION }">
      <!-- 單獨卡片動畫 -->
      <div
        v-for="card in store.animatingCards"
        :key="card.cardId"
        :ref="(el) => setCardRef(card.cardId, el as HTMLElement)"
        class="absolute"
        :style="{
          left: `${card.fromRect.x}px`,
          top: `${card.fromRect.y}px`,
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

      <!-- 卡片組動畫（容器控制 opacity/scale，卡片使用相對座標） -->
      <div
        v-for="group in store.animatingGroups"
        :key="group.groupId"
        :ref="(el) => setGroupRef(group.groupId, el as HTMLElement)"
        class="absolute"
        :style="{
          left: `${group.boundingBox.x}px`,
          top: `${group.boundingBox.y}px`,
          width: `${group.boundingBox.width}px`,
          height: `${group.boundingBox.height}px`,
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
  </Teleport>
</template>
