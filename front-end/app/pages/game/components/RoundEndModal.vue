<template>
  <!--
    RoundEndModal - 回合結束彈窗

    @description
    顯示回合結束資訊（RoundScored / RoundEndedInstantly / RoundDrawn）並自動倒數關閉。

    需求：
    - 顯示回合結束資訊
    - 底部顯示「下一回合倒數：X 秒」
    - 倒數歸零時自動關閉
    - 不允許提前跳過（無關閉按鈕，攔截背景點擊和 ESC 鍵）
  -->
  <Transition name="modal-fade">
    <div
      v-if="shouldShowPanel"
      class="fixed inset-0 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-end-title"
      :style="{ zIndex: Z_INDEX.MODAL }"
      @click.self="handleClose"
    >
      <div
        class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all"
        @click.stop
      >
        <!-- Header -->
        <div
          :class="[
            'px-6 py-5 text-white',
            headerClass,
          ]"
        >
          <h2 id="round-end-title" class="text-2xl font-bold text-center">
            {{ headerTitle }}
          </h2>
        </div>

        <!-- Body -->
        <div class="px-6 py-6 space-y-4">
          <!-- RoundDrawn Content -->
          <div v-if="panelType === 'roundDrawn'" class="text-center">
            <p class="text-lg font-medium text-gray-800 mb-4">
              引き分け (Draw)
            </p>
            <div class="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">
                Current Scores
              </h3>
              <div
                v-for="score in uiState.roundDrawnModalScores"
                :key="score.player_id"
                class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
              >
                <span class="text-gray-700 font-medium">
                  {{ getPlayerName(score.player_id) }}
                </span>
                <span class="text-xl font-bold text-gray-600">
                  {{ score.score }}
                </span>
              </div>
            </div>
          </div>

          <!-- RoundScored Content -->
          <div v-else-if="panelType === 'roundScored' && roundScoredModalData" class="text-center">
            <!-- Winner -->
            <p class="text-lg font-medium text-gray-800 mb-4">
              {{ getPlayerName(roundScoredModalData.winnerId) }} won this round!
            </p>

            <!-- Yaku List -->
            <div class="bg-yellow-50 rounded-lg p-4 mb-4">
              <h3 class="text-sm font-semibold text-yellow-800 mb-3">Yaku Achieved</h3>
              <div class="space-y-2">
                <div
                  v-for="yaku in roundScoredModalData.yakuList"
                  :key="yaku.yaku_type"
                  class="flex items-center justify-between py-2 border-b border-yellow-200 last:border-0"
                >
                  <span class="text-gray-700 font-medium">{{ getYakuName(yaku.yaku_type) }}</span>
                  <span class="text-lg font-bold text-yellow-700">{{ yaku.base_points }} pts</span>
                </div>
              </div>
            </div>

            <!-- Score Summary -->
            <div class="bg-gray-50 rounded-lg p-4 space-y-2">
              <div class="flex items-center justify-between py-1">
                <span class="text-sm text-gray-600">Base Score:</span>
                <span class="text-lg font-semibold text-gray-700">{{ roundScoredModalData.baseScore }}</span>
              </div>
              <div class="flex items-center justify-between py-1">
                <span class="text-sm text-gray-600">Multiplier:</span>
                <span class="text-lg font-semibold text-gray-700">×{{ roundScoredModalData.multipliers.player_multipliers[roundScoredModalData.winnerId] }}</span>
              </div>
              <div class="flex items-center justify-between py-2 border-t-2 border-gray-300">
                <span class="text-base font-bold text-gray-800">Final Score:</span>
                <span class="text-2xl font-bold text-yellow-600">{{ roundScoredModalData.finalScore }}</span>
              </div>
            </div>

            <!-- Total Scores -->
            <div class="bg-gray-50 rounded-lg p-4 mt-4">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Total Scores</h3>
              <div
                v-for="score in roundScoredModalData.updatedTotalScores"
                :key="score.player_id"
                class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
              >
                <span class="text-gray-700 font-medium">{{ getPlayerName(score.player_id) }}</span>
                <span class="text-xl font-bold text-gray-600">{{ score.score }}</span>
              </div>
            </div>
          </div>

          <!-- RoundEndedInstantly Content -->
          <div v-else-if="panelType === 'roundEndedInstantly' && roundEndedInstantlyModalData" class="text-center">
            <!-- Reason -->
            <p class="text-lg font-medium text-gray-800 mb-4">
              {{ getRoundEndReasonText(roundEndedInstantlyModalData.reason) }}
            </p>

            <!-- Winner and Points (if any) -->
            <div v-if="roundEndedInstantlyModalData.winnerId" class="bg-blue-50 rounded-lg p-4 mb-4">
              <p class="text-base text-gray-700 mb-2">
                <span class="font-bold text-blue-700">{{ getPlayerName(roundEndedInstantlyModalData.winnerId) }}</span>
                received
                <span class="font-bold text-blue-700">{{ roundEndedInstantlyModalData.awardedPoints }} points</span>
              </p>
            </div>

            <!-- Total Scores -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Total Scores</h3>
              <div
                v-for="score in roundEndedInstantlyModalData.updatedTotalScores"
                :key="score.player_id"
                class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
              >
                <span class="text-gray-700 font-medium">{{ getPlayerName(score.player_id) }}</span>
                <span class="text-xl font-bold text-gray-600">{{ score.score }}</span>
              </div>
            </div>
          </div>

          <!-- Fallback -->
          <div v-else class="text-center text-gray-600">
            <p>Round ended</p>
          </div>
        </div>

        <!-- Footer: Countdown Display or Continue Button -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <!-- 有倒數時顯示倒數 -->
          <template v-if="displayTimeoutRemaining !== null">
            <div class="flex items-center justify-center gap-2 text-gray-700">
              <span class="text-sm font-medium">Next round in:</span>
              <span
                :class="[
                  'text-2xl font-bold tabular-nums',
                  countdownWarningClass,
                ]"
              >
                {{ displayCountdown }}
              </span>
              <span class="text-sm">s</span>
            </div>
            <p class="text-xs text-gray-500 text-center mt-2">
              Please wait for the countdown to finish
            </p>
          </template>
          <!-- 有待處理的遊戲結束資料時顯示 Continue 按鈕 -->
          <template v-else-if="pendingGameFinishedData">
            <div class="flex flex-col items-center gap-2">
              <button
                type="button"
                class="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                @click="handleContinue"
              >
                Continue
              </button>
              <p class="text-xs text-gray-500 text-center">
                Click to view game results
              </p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Z_INDEX } from '~/constants'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'
import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'

const uiState = useUIStateStore()
const gameState = useGameStateStore()

const {
  displayTimeoutRemaining,
  roundDrawnModalVisible,
  roundScoredModalVisible,
  roundEndedInstantlyModalVisible,
  roundScoredModalData,
  roundEndedInstantlyModalData,
  pendingGameFinishedData,
} = storeToRefs(uiState)

/**
 * 判斷彈窗類型
 */
const panelType = computed<'roundScored' | 'roundEndedInstantly' | 'roundDrawn' | null>(() => {
  if (roundDrawnModalVisible.value) return 'roundDrawn'
  if (roundScoredModalVisible.value) return 'roundScored'
  if (roundEndedInstantlyModalVisible.value) return 'roundEndedInstantly'
  return null
})

/**
 * 是否應該顯示彈窗
 * 有倒數或有待處理的遊戲結束資料時都顯示
 */
const shouldShowPanel = computed(() => {
  return panelType.value !== null && (
    displayTimeoutRemaining.value !== null ||
    pendingGameFinishedData.value !== null
  )
})

/**
 * 顯示的倒數秒數
 */
const displayCountdown = computed(() => {
  return displayTimeoutRemaining.value ?? 0
})

/**
 * Header 樣式類別
 */
const headerClass = computed(() => {
  switch (panelType.value) {
    case 'roundScored':
      return 'bg-gradient-to-r from-yellow-500 to-yellow-600'
    case 'roundEndedInstantly':
      return 'bg-gradient-to-r from-blue-500 to-blue-600'
    case 'roundDrawn':
      return 'bg-gradient-to-r from-gray-500 to-gray-600'
    default:
      return 'bg-gradient-to-r from-gray-500 to-gray-600'
  }
})

/**
 * Header 標題
 */
const headerTitle = computed(() => {
  switch (panelType.value) {
    case 'roundScored':
      return 'Round Complete'
    case 'roundEndedInstantly':
      return 'Round Ended'
    case 'roundDrawn':
      return 'Round Draw'
    default:
      return 'Round End'
  }
})

/**
 * 倒數警示樣式（低於 5 秒時顯示紅色）
 */
const countdownWarningClass = computed(() => {
  const remaining = displayTimeoutRemaining.value ?? 0
  return remaining < 5 ? 'text-red-500' : 'text-gray-800'
})

/**
 * 取得役種名稱
 */
function getYakuName(yakuType: string): string {
  const yakuNames: Record<string, string> = {
    INOU_SHIKO: 'Boar-Deer-Butterfly',
    KASU: 'Plain Cards',
    TANZAKU: 'Ribbons',
    TANE: 'Animals',
    AKATAN: 'Red Ribbons',
    AOTAN: 'Blue Ribbons',
    SANKO: 'Three Brights',
    SHIKOU: 'Four Brights',
    GOKOU: 'Five Brights',
    TSUKIMI_ZAKE: 'Moon Viewing',
    HANAMI_ZAKE: 'Flower Viewing',
  }
  return yakuNames[yakuType] || yakuType
}

/**
 * 取得結束原因文字
 */
function getRoundEndReasonText(reason: string): string {
  const reasonTexts: Record<string, string> = {
    TESHI: 'Hand Yaku (Teshi)',
    FIELD_KUTTSUKI: 'Field Four-of-a-Kind',
    NO_YAKU: 'No Yaku Formed',
  }
  return reasonTexts[reason] || reason
}

/**
 * 取得玩家名稱
 */
function getPlayerName(playerId: string): string {
  const localPlayerId = gameState.getLocalPlayerId()
  return playerId === localPlayerId ? 'You' : 'Opponent'
}

/**
 * 繼續按鈕處理（最後一回合關閉回合面板後顯示遊戲結果）
 */
function handleContinue(): void {
  // 1. 關閉回合面板
  uiState.hideModal()

  // 2. 顯示緩存的 GameFinishedModal
  if (pendingGameFinishedData.value) {
    const data = pendingGameFinishedData.value
    uiState.showGameFinishedModal(
      data.winnerId,
      data.finalScores,
      data.isPlayerWinner,
    )
    uiState.clearPendingGameFinished()
  }
}

/**
 * 關閉 Modal（點擊外部時觸發）
 */
function handleClose(): void {
  // 如果有待處理的遊戲結束資料，使用 handleContinue 處理
  if (pendingGameFinishedData.value) {
    handleContinue()
  } else {
    uiState.hideModal()
  }
}
</script>

<style scoped>
/* Modal fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .bg-white,
.modal-fade-leave-active .bg-white {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .bg-white,
.modal-fade-leave-to .bg-white {
  transform: scale(0.9);
}

/* Tabular numbers for consistent countdown width */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
