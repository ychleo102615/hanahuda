/**
 * GameStatePortAdapter
 *
 * @description
 * 實作 GameStatePort 介面，包裝 GameStateStore 處理遊戲狀態。
 * 此 Adapter 是原 UIStatePort Adapter 的擴展版本。
 */

import type { GameStatePort } from '../../application/ports/output/game-state.port'
import type {
  FlowState,
  PlayerInfo,
  Ruleset,
  GameSnapshotRestore,
  YakuScore,
} from '../../application/types'
import { useGameStateStore } from './gameState'

/**
 * 建立 GameStatePort Adapter
 *
 * @returns GameStatePort 實作
 */
export function createGameStatePortAdapter(): GameStatePort {
  const store = useGameStateStore()

  return {
    // ===== 初始化 =====
    initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void {
      store.initializeGameContext(gameId, players, ruleset)
    },

    restoreGameState(snapshot: GameSnapshotRestore): void {
      store.restoreGameState(snapshot)
    },

    // ===== 狀態更新 =====
    setFlowStage(stage: FlowState): void {
      store.setFlowStage(stage)
    },

    setActivePlayer(playerId: string): void {
      store.activePlayerId = playerId
    },

    setDealerId(playerId: string): void {
      store.dealerId = playerId
    },

    updateFieldCards(cards: string[]): void {
      store.updateFieldCards(cards)
    },

    updateHandCards(cards: string[]): void {
      store.updateHandCards(cards)
    },

    updateOpponentHandCount(count: number): void {
      store.opponentHandCount = count
    },

    updateDepositoryCards(playerCards: string[], opponentCards: string[]): void {
      store.updateDepositoryCards(playerCards, opponentCards)
    },

    updateScores(playerScore: number, opponentScore: number): void {
      store.updateScores(playerScore, opponentScore)
    },

    updateDeckRemaining(count: number): void {
      store.updateDeckRemaining(count)
    },

    updateYaku(playerYaku: YakuScore[], opponentYaku: YakuScore[]): void {
      store.myYaku = [...playerYaku]
      store.opponentYaku = [...opponentYaku]
    },

    // ===== 查詢 =====
    getLocalPlayerId(): string {
      return store.getLocalPlayerId()
    },

    getFieldCards(): string[] {
      return [...store.fieldCards]
    },

    getDepositoryCards(playerId: string): string[] {
      if (playerId === store.localPlayerId) {
        return [...store.myDepository]
      } else {
        return [...store.opponentDepository]
      }
    },

    getDeckRemaining(): number {
      return store.deckRemaining
    },

    getDealerId(): string | null {
      return store.dealerId
    },
  }
}
