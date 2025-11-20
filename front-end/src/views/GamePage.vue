<script setup lang="ts">
/**
 * GamePage - 遊戲主頁面
 *
 * @description
 * 遊戲介面固定 Viewport 設計（100vh × 100vw，無垂直滾動）。
 * 整合所有遊戲區域組件。
 */

import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStateStore } from '../user-interface/adapter/stores/gameState'
import { useUIStateStore } from '../user-interface/adapter/stores/uiState'
import TopInfoBar from './GamePage/components/TopInfoBar.vue'
import FieldZone from './GamePage/components/FieldZone.vue'
import PlayerHandZone from './GamePage/components/PlayerHandZone.vue'
import CardComponent from './GamePage/components/CardComponent.vue'

const gameState = useGameStateStore()
const uiState = useUIStateStore()

const { opponentDepository, myDepository, opponentHandCount } = storeToRefs(gameState)
const { errorMessage, infoMessage, reconnecting } = storeToRefs(uiState)

const playerHandZoneRef = ref<InstanceType<typeof PlayerHandZone> | null>(null)

// 處理手牌選擇
function handleHandCardSelect(cardId: string) {
  console.info('[GamePage] 選擇手牌:', cardId)
  // TODO: 呼叫 PlayHandCardUseCase
}

// 處理場牌點擊（配對選擇）
function handleFieldCardClick(cardId: string) {
  console.info('[GamePage] 選擇場牌配對:', cardId)
  // TODO: 呼叫 SelectMatchTargetUseCase
  playerHandZoneRef.value?.clearSelection()
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-green-900 overflow-hidden">
    <!-- 頂部資訊列 (~10% viewport) -->
    <header class="h-[10%] min-h-12">
      <TopInfoBar />
    </header>

    <!-- 對手已獲得牌區 (~15% viewport) -->
    <section class="h-[15%] bg-gray-700/50 overflow-x-auto">
      <div class="h-full flex items-center justify-center p-2 gap-1">
        <CardComponent
          v-for="cardId in opponentDepository"
          :key="cardId"
          :card-id="cardId"
          size="sm"
        />
        <div v-if="opponentDepository.length === 0" class="text-gray-400 text-sm">
          對手獲得區
        </div>
      </div>
    </section>

    <!-- 場中央牌區 (~30% viewport) -->
    <section class="h-[30%] bg-green-800/50">
      <FieldZone @card-click="handleFieldCardClick" />
    </section>

    <!-- 玩家已獲得牌區 (~15% viewport) -->
    <section class="h-[15%] bg-gray-700/50 overflow-x-auto">
      <div class="h-full flex items-center justify-center p-2 gap-1">
        <CardComponent
          v-for="cardId in myDepository"
          :key="cardId"
          :card-id="cardId"
          size="sm"
        />
        <div v-if="myDepository.length === 0" class="text-gray-400 text-sm">
          你的獲得區
        </div>
      </div>
    </section>

    <!-- 玩家手牌區 (~30% viewport) -->
    <section class="h-[30%] bg-gray-800/50">
      <PlayerHandZone ref="playerHandZoneRef" @card-select="handleHandCardSelect" />
    </section>

    <!-- 對手手牌數量指示（浮動顯示） -->
    <div class="fixed top-20 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
      對手手牌: {{ opponentHandCount }}
    </div>

    <!-- 錯誤訊息 Toast -->
    <Transition name="fade">
      <div
        v-if="errorMessage"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg"
      >
        {{ errorMessage }}
      </div>
    </Transition>

    <!-- 資訊訊息 Toast -->
    <Transition name="fade">
      <div
        v-if="infoMessage"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg"
      >
        {{ infoMessage }}
      </div>
    </Transition>

    <!-- 重連遮罩 -->
    <Transition name="fade">
      <div
        v-if="reconnecting"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div class="bg-white rounded-lg p-6 text-center">
          <div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p class="text-gray-700">連線中斷，正在嘗試重連...</p>
        </div>
      </div>
    </Transition>
  </div>
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
