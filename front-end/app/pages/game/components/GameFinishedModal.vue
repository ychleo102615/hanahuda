<template>
  <Transition name="modal-fade">
    <div
      v-if="uiStateStore.gameFinishedModalVisible && uiStateStore.gameFinishedModalData"
      class="fixed inset-0 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-finished-title"
      :style="{ zIndex: Z_INDEX.MODAL }"
      @click.self="handleClose"
    >
      <div
        class="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all"
      >
        <!-- Header -->
        <div
          :class="[
            'px-6 py-5 text-white',
            uiStateStore.gameFinishedModalData.isPlayerWinner
              ? 'bg-gradient-to-r from-green-500 to-green-600'
              : 'bg-gradient-to-r from-blue-500 to-blue-600',
          ]"
        >
          <h2 id="game-finished-title" class="text-2xl font-bold text-center">
            {{
              uiStateStore.gameFinishedModalData.isPlayerWinner
                ? '🎉 Victory!'
                : 'Game Over'
            }}
          </h2>
        </div>

        <!-- Body -->
        <div class="px-6 py-6 space-y-4">
          <!-- Winner Announcement -->
          <p class="text-center text-lg font-medium text-gray-800">
            {{
              uiStateStore.gameFinishedModalData.winnerId === null
                ? "It's a draw!"
                : uiStateStore.gameFinishedModalData.isPlayerWinner
                  ? 'Congratulations! You won the game!'
                  : `Player ${getPlayerName(uiStateStore.gameFinishedModalData.winnerId)} won the game.`
            }}
          </p>

          <!-- Final Scores -->
          <div class="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">
              Final Scores
            </h3>
            <div
              v-for="score in uiStateStore.gameFinishedModalData.finalScores"
              :key="score.player_id"
              class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
            >
              <span class="text-gray-700 font-medium">
                {{ getPlayerName(score.player_id) }}
                <span
                  v-if="
                    score.player_id ===
                    uiStateStore.gameFinishedModalData.winnerId
                  "
                  class="ml-2 text-xs text-green-600 font-bold"
                >
                  👑 Winner
                </span>
              </span>
              <span
                :class="[
                  'text-xl font-bold',
                  score.player_id === uiStateStore.gameFinishedModalData.winnerId
                    ? 'text-green-600'
                    : 'text-gray-600',
                ]"
              >
                {{ score.score }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
          <button
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            @click="handleClose"
          >
            Close
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            @click="handleNewGame"
          >
            New Game
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
 * - 支援「關閉」和「新遊戲」操作
 * - 淡入/淡出動畫
 * - 根據勝負顯示不同顏色主題
 */

import { Z_INDEX } from '~/constants'
import { useUIStateStore } from '~/user-interface/adapter/stores/uiState'
import { useGameStateStore } from '~/user-interface/adapter/stores/gameState'
import { useDependency } from '~/user-interface/adapter/composables/useDependency'
import type { StartGamePort } from '~/user-interface/application/ports/input'
import { TOKENS } from '~/user-interface/adapter/di/tokens'

const uiStateStore = useUIStateStore()
const gameStateStore = useGameStateStore()

// DI 注入
const startGameUseCase = useDependency<StartGamePort>(TOKENS.StartGamePort)

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
 * 關閉 Modal
 */
function handleClose(): void {
  uiStateStore.hideGameFinishedModal()
}

/**
 * 開始新遊戲
 *
 * 使用 StartGameUseCase 重置狀態並重新建立 SSE 連線。
 */
function handleNewGame(): void {
  uiStateStore.hideGameFinishedModal()
  startGameUseCase.execute({ isNewGame: true })
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

.modal-fade-enter-active .bg-white {
  animation: modal-scale-up 0.3s ease;
}

.modal-fade-leave-active .bg-white {
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
