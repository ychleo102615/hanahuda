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
 */

import { storeToRefs } from 'pinia'
import { useUIStateStore } from '../../../user-interface/adapter/stores/uiState'
import { useGameStateStore } from '../../../user-interface/adapter/stores/gameState'
import { inject } from 'vue'
import { TOKENS } from '../../../user-interface/adapter/di/tokens'
import type { MakeKoiKoiDecisionPort } from '../../../user-interface/application/ports/input'

const uiState = useUIStateStore()
const gameState = useGameStateStore()
const { decisionModalVisible, decisionModalData } = storeToRefs(uiState)
const { myDepository, myKoiKoiMultiplier } = storeToRefs(gameState)

// T074 [US3]: Inject MakeKoiKoiDecisionPort
const makeKoiKoiDecisionPort = inject<MakeKoiKoiDecisionPort>(
  TOKENS.MakeKoiKoiDecisionPort.toString()
)

// T076 [US3]: Handle Koi-Koi decision
function handleKoiKoi() {
  if (makeKoiKoiDecisionPort && decisionModalData.value) {
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
  if (makeKoiKoiDecisionPort && decisionModalData.value) {
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
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      >
        <!-- T073 [US3]: Modal content -->
        <div class="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-2xl">
          <!-- Title -->
          <h2 class="mb-4 text-center text-2xl font-bold text-yellow-400">
            Yaku Achieved!
          </h2>

          <!-- T075 [US3]: Display yaku information -->
          <div class="mb-6 space-y-2">
            <div
              v-for="yaku in decisionModalData.currentYaku"
              :key="yaku.yaku_type"
              class="flex items-center justify-between rounded bg-gray-800 px-4 py-2"
            >
              <span class="font-medium text-white">{{ yaku.yaku_type }}</span>
              <span class="text-yellow-400">{{ yaku.base_points }} pts</span>
            </div>
          </div>

          <!-- Score information -->
          <div class="mb-6 rounded bg-gray-800 p-4">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-gray-300">Current Score:</span>
              <span class="text-xl font-bold text-white">
                {{ decisionModalData.currentScore }} pts
              </span>
            </div>
            <div
              v-if="decisionModalData.potentialScore"
              class="flex items-center justify-between"
            >
              <span class="text-gray-300">Potential Score:</span>
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
