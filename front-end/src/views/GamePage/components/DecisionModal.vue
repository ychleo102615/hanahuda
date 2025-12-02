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
import { Z_INDEX } from '@/constants'
import { useUIStateStore } from '../../../user-interface/adapter/stores/uiState'
import { useGameStateStore } from '../../../user-interface/adapter/stores/gameState'
import { useDependency } from '../../../user-interface/adapter/composables/useDependency'
import { useCountdown } from '../../../user-interface/adapter/composables/useCountdown'
import { TOKENS } from '../../../user-interface/adapter/di/tokens'
import type { MakeKoiKoiDecisionPort } from '../../../user-interface/application/ports/input'

const uiState = useUIStateStore()
const gameState = useGameStateStore()
const countdown = useCountdown()
const { decisionModalVisible, decisionModalData, actionTimeoutRemaining } = storeToRefs(uiState)
const { myDepository, myKoiKoiMultiplier } = storeToRefs(gameState)

// T074 [US3]: Inject MakeKoiKoiDecisionPort
const makeKoiKoiDecisionPort = useDependency<MakeKoiKoiDecisionPort>(TOKENS.MakeKoiKoiDecisionPort)

// T020 [US2]: Warning color logic (red when <= 5 seconds)
const countdownClass = computed(() => {
  if (actionTimeoutRemaining.value !== null && actionTimeoutRemaining.value <= 5) {
    return 'text-red-500'
  }
  return 'text-gray-800'
})

// T076 [US3]: Handle Koi-Koi decision
function handleKoiKoi() {
  // T021 [US2]: Stop countdown when player makes decision
  countdown.stopActionCountdown()

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
function handleEndRound() {
  // T021 [US2]: Stop countdown when player makes decision
  countdown.stopActionCountdown()

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
        <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
          <!-- Title -->
          <h2 class="mb-4 text-center text-2xl font-bold text-yellow-600">
            Yaku Achieved!
          </h2>

          <!-- T019 [US2]: Countdown Display -->
          <div
            v-if="actionTimeoutRemaining !== null"
            class="mb-4 text-center"
          >
            <div class="text-sm text-gray-600 mb-1">Time Remaining</div>
            <div
              data-testid="decision-countdown"
              class="text-3xl font-bold"
              :class="countdownClass"
            >
              {{ actionTimeoutRemaining }}
            </div>
          </div>

          <!-- T075 [US3]: Display yaku information -->
          <div class="mb-6 space-y-2">
            <div
              v-for="yaku in decisionModalData.currentYaku"
              :key="yaku.yaku_type"
              class="flex items-center justify-between rounded bg-yellow-50 px-4 py-2"
            >
              <span class="font-medium text-gray-800">{{ yaku.yaku_type }}</span>
              <span class="text-yellow-700">{{ yaku.base_points }} pts</span>
            </div>
          </div>

          <!-- Score information -->
          <div class="mb-6 rounded bg-gray-50 p-4">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-gray-600">Current Score:</span>
              <span class="text-xl font-bold text-gray-800">
                {{ decisionModalData.currentScore }} pts
              </span>
            </div>
            <div
              v-if="decisionModalData.potentialScore"
              class="flex items-center justify-between"
            >
              <span class="text-gray-600">Potential Score:</span>
              <span class="text-xl font-bold text-green-600">
                {{ decisionModalData.potentialScore }} pts
              </span>
            </div>
          </div>

          <!-- Decision explanation -->
          <p class="mb-6 text-center text-sm text-gray-600">
            Choose "Koi-Koi" to continue and increase multiplier, but opponent may catch up.
            <br />
            Choose "End Round" to get your current score immediately.
          </p>

          <!-- T076 [US3]: Decision buttons -->
          <div class="grid grid-cols-2 gap-4">
            <button
              class="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              @click="handleKoiKoi"
            >
              Koi-Koi
            </button>
            <button
              class="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              @click="handleEndRound"
            >
              End Round
            </button>
          </div>

          <!-- Risk warning -->
          <p class="mt-4 text-center text-xs text-gray-600">
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
