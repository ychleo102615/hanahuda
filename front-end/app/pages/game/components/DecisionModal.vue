<script setup lang="ts">
/**
 * DecisionModal - Koi-Koi Decision Modal
 *
 * @description
 * When player forms a yaku, display decision modal to let player choose:
 * - Koi-Koi (continue game, double multiplier)
 * - End Round (end this round, get score immediately)
 *
 * T072-T076 [US3]: Complete decision UI implementation
 * T019-T020 [US2]: Display countdown timer with warning color
 */

import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { Z_INDEX } from '~/constants'
import { useUIStateStore } from '~/game-client/adapter/stores/uiState'
import { useGameStateStore } from '~/game-client/adapter/stores/gameState'
import { resolveDependency } from '~/game-client/adapter/di/resolver'
import { TOKENS } from '~/game-client/adapter/di/tokens'
import type { MakeKoiKoiDecisionPort } from '~/game-client/application/ports/input'
import { getYakuInfo } from '~/game-client/domain/yaku-info'

const uiState = useUIStateStore()
const gameState = useGameStateStore()
const { decisionModalVisible, decisionModalData, countdownRemaining, countdownMode } = storeToRefs(uiState)

// 只有 DISPLAY 模式時才顯示倒數（DecisionModal 用於顯示倒數）
const displayTimeoutRemaining = computed(() => {
  if (countdownRemaining.value !== null && countdownMode.value === 'DISPLAY') {
    return countdownRemaining.value
  }
  return null
})
const { myDepository, myKoiKoiMultiplier } = storeToRefs(gameState)

// T074 [US3]: Inject MakeKoiKoiDecisionPort
const makeKoiKoiDecisionPort = resolveDependency<MakeKoiKoiDecisionPort>(TOKENS.MakeKoiKoiDecisionPort)

// T020 [US2]: Warning color logic (red when <= 5 seconds)
const countdownClass = computed(() => {
  if (displayTimeoutRemaining.value !== null && displayTimeoutRemaining.value <= 5) {
    return 'text-red-400'
  }
  return 'text-white'
})

// 將 yaku_type 轉換為可讀的名稱
interface DisplayYaku {
  yakuType: string
  name: string
  nameJa: string
  basePoints: number
}

const displayYakuList = computed<DisplayYaku[]>(() => {
  if (!decisionModalData.value) return []
  return decisionModalData.value.currentYaku.map((yaku) => {
    const info = getYakuInfo(yaku.yaku_type)
    return {
      yakuType: yaku.yaku_type,
      name: info?.name ?? yaku.yaku_type,
      nameJa: info?.nameJa ?? '',
      basePoints: yaku.base_points,
    }
  })
})

// T076 [US3]: Handle Koi-Koi decision
// Pattern B: 元件只調用 Use Case，倒數停止由 Use Case 控制
function handleKoiKoi() {
  if (decisionModalData.value) {
    makeKoiKoiDecisionPort.execute({
      currentYaku: decisionModalData.value.currentYaku,
      depositoryCards: myDepository.value,
      koiKoiMultiplier: myKoiKoiMultiplier.value,
      decision: 'KOI_KOI',
    })
  }
  uiState.hideDecisionModal()
}

// T076 [US3]: Handle End Round decision
// Pattern B: 元件只調用 Use Case，倒數停止由 Use Case 控制
function handleEndRound() {
  if (decisionModalData.value) {
    makeKoiKoiDecisionPort.execute({
      currentYaku: decisionModalData.value.currentYaku,
      depositoryCards: myDepository.value,
      koiKoiMultiplier: myKoiKoiMultiplier.value,
      decision: 'END_ROUND',
    })
  }
  uiState.hideDecisionModal()
}
</script>

<template>
  <!-- T072 [US3]: Decision Modal basic structure -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="decisionModalVisible && decisionModalData"
        class="fixed inset-0 flex items-center justify-center bg-black/60"
        :style="{ zIndex: Z_INDEX.MODAL }"
      >
        <!-- T073 [US3]: Modal content -->
        <div class="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg modal-panel p-6 mx-4">
          <!-- Title -->
          <h2 class="mb-4 text-center text-2xl font-bold text-amber-400">
            Yaku Achieved!
          </h2>

          <!-- T019 [US2]: Countdown Display -->
          <div
            v-if="displayTimeoutRemaining !== null"
            class="mb-4 text-center"
          >
            <div class="text-sm text-gray-400 mb-1">Time Remaining</div>
            <div
              data-testid="decision-countdown"
              class="text-3xl font-bold"
              :class="countdownClass"
            >
              {{ displayTimeoutRemaining }}
            </div>
          </div>

          <!-- T075 [US3]: Display yaku information -->
          <div class="mb-6 space-y-2">
            <div
              v-for="yaku in displayYakuList"
              :key="yaku.yakuType"
              class="flex items-center justify-between rounded-lg modal-section-highlight px-4 py-2"
            >
              <div class="flex flex-col">
                <span class="font-medium text-white">{{ yaku.name }}</span>
                <span v-if="yaku.nameJa" class="text-sm text-gray-400">{{ yaku.nameJa }}</span>
              </div>
              <span class="text-amber-400 font-semibold">{{ yaku.basePoints }} pts</span>
            </div>
          </div>

          <!-- Score information -->
          <div class="mb-6 rounded-lg modal-section p-4">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-gray-400">Current Score:</span>
              <span class="text-xl font-bold text-white">
                {{ decisionModalData.currentScore }} pts
              </span>
            </div>
            <div
              v-if="decisionModalData.potentialScore"
              class="flex items-center justify-between"
            >
              <span class="text-gray-400">Potential Score:</span>
              <span class="text-xl font-bold text-green-400">
                {{ decisionModalData.potentialScore }} pts
              </span>
            </div>
          </div>

          <!-- Decision explanation -->
          <p class="mb-6 text-center text-sm text-gray-400">
            Choose "Koi-Koi" to continue and increase multiplier, but opponent may catch up.
            <br />
            Choose "End Round" to get your current score immediately.
          </p>

          <!-- T076 [US3]: Decision buttons -->
          <div class="grid grid-cols-2 gap-4">
            <button
              class="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              @click="handleKoiKoi"
            >
              Koi-Koi
            </button>
            <button
              class="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              @click="handleEndRound"
            >
              End Round
            </button>
          </div>

          <!-- Risk warning -->
          <p class="mt-4 text-center text-xs text-gray-500">
            ⚠️ If you choose Koi-Koi and opponent scores first, you lose all points
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
