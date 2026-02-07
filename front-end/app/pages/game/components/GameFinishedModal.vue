<template>
  <Transition name="modal-fade">
    <div
      v-if="uiStateStore.gameFinishedModalVisible && uiStateStore.gameFinishedModalData"
      class="fixed inset-0 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-finished-title"
      :style="{ zIndex: Z_INDEX.MODAL }"
      @click.self="handleDismiss"
    >
      <div
        class="modal-panel rounded-lg max-w-md w-full mx-4 overflow-hidden transform transition-all"
      >
        <!-- Header -->
        <div
          :class="[
            'px-6 py-5 text-white modal-header',
            uiStateStore.gameFinishedModalData.isPlayerWinner
              ? 'bg-gradient-to-r from-game-felt/90 to-game-table/90 border-b border-gold-dark/30'
              : 'bg-gradient-to-r from-game-table-light/90 to-game-table/90',
          ]"
        >
          <h2 id="game-finished-title" class="text-2xl font-bold font-serif text-gold-light text-center">
            {{
              uiStateStore.gameFinishedModalData.isPlayerWinner
                ? 'Victory!'
                : 'Game Over'
            }}
          </h2>
        </div>

        <!-- Body -->
        <div class="px-6 py-6 space-y-4">
          <!-- Winner Announcement -->
          <p class="text-center text-lg font-medium text-white">
            {{
              uiStateStore.gameFinishedModalData.winnerId === null
                ? "It's a draw!"
                : uiStateStore.gameFinishedModalData.isPlayerWinner
                  ? 'Congratulations! You won the game!'
                  : `Player ${getPlayerName(uiStateStore.gameFinishedModalData.winnerId)} won the game.`
            }}
          </p>

          <!-- Final Scores -->
          <div class="modal-section rounded-lg p-4 space-y-2">
            <h3 class="text-sm font-semibold text-gray-300 mb-3">
              Final Scores
            </h3>
            <div
              v-for="score in uiStateStore.gameFinishedModalData.finalScores"
              :key="score.player_id"
              class="flex items-center justify-between py-2 border-b border-gray-600/50 last:border-0"
            >
              <span class="text-gray-200 font-medium">
                {{ getPlayerName(score.player_id) }}
                <span
                  v-if="
                    score.player_id ===
                    uiStateStore.gameFinishedModalData.winnerId
                  "
                  class="ml-2 text-xs text-amber-400 font-bold"
                >
                  👑 Winner
                </span>
              </span>
              <span
                :class="[
                  'text-xl font-bold',
                  score.player_id === uiStateStore.gameFinishedModalData.winnerId
                    ? 'text-amber-400'
                    : 'text-gray-300',
                ]"
              >
                {{ score.score }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 modal-footer flex gap-3 justify-end">
          <button
            type="button"
            class="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            @click="handleDismiss"
          >
            Close
          </button>
          <!-- 私房遊戲：Return to Lobby / 公開配對：Rematch -->
          <button
            v-if="matchmakingStateStore.isPrivateMatch"
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
            @click="handleReturnToLobby"
          >
            Return to Lobby
          </button>
          <button
            v-else
            type="button"
            :disabled="isRematching"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleRematch"
          >
            {{ isRematching ? 'Finding...' : 'Rematch' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * GameFinishedModal Component
 *
 * @description
 * 遊戲結束時顯示的 Modal，展示最終分數與勝者。
 * 整合 UIStateStore.gameFinishedData。
 *
 * Features:
 * - 顯示勝者
 * - 顯示最終分數
 * - 支援「關閉」和「Rematch」操作
 * - 淡入/淡出動畫
 * - 根據勝負顯示不同顏色主題
 */

import { inject } from 'vue'
import { Z_INDEX } from '~/constants'
import { useUIStateStore } from '~/game-client/adapter/stores/uiState'
import { useGameStateStore } from '~/game-client/adapter/stores/gameState'
import { useMatchmakingStateStore } from '~/game-client/adapter/stores/matchmakingState'
import { useLeaveGame } from '~/game-client/adapter/composables/useLeaveGame'
import type { useGatewayConnection } from '~/game-client/adapter/composables/useGatewayConnection'

const uiStateStore = useUIStateStore()
const gameStateStore = useGameStateStore()
const matchmakingStateStore = useMatchmakingStateStore()

// 從父元件注入 gatewayConnection（用於 Rematch 直接重連）
const gatewayConnection = inject<ReturnType<typeof useGatewayConnection> | null>('gatewayConnection', null)

// 使用 useLeaveGame 處理 Rematch / Return to Lobby 邏輯
const { handleRematch, handleReturnToLobby, isRematching } = useLeaveGame({ gatewayConnection })

/**
 * 取得玩家名稱
 */
function getPlayerName(playerId: string): string {
  if (playerId === gameStateStore.localPlayerId) {
    return 'You'
  } else if (playerId === gameStateStore.opponentPlayerId) {
    return 'Opponent'
  }
  return playerId
}

/**
 * 關閉 Modal（只關閉，不離開遊戲）
 * 用戶可透過 TopBar 選單的 "Leave Game" 離開遊戲
 */
function handleDismiss(): void {
  uiStateStore.hideGameFinishedModal()
}
</script>

<style scoped>
/* Modal 淡入/淡出動畫 */
.modal-fade-enter-active {
  transition: opacity 0.3s ease;
}

.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-panel {
  animation: modal-scale-up 0.3s ease;
}

.modal-fade-leave-active .modal-panel {
  animation: modal-scale-down 0.2s ease;
}

@keyframes modal-scale-up {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes modal-scale-down {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.9);
    opacity: 0;
  }
}
</style>
