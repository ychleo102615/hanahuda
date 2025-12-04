/**
 * MatchmakingStateStore - Pinia Store
 *
 * @description
 * 實作 MatchmakingStatePort 介面的 Pinia Store。
 * 負責管理配對階段的 UI 狀態（大廳畫面）。
 *
 * 與 gameState 的區別：
 * - matchmakingState: 遊戲會話建立前的配對狀態
 * - gameState: 遊戲會話建立後的遊戲狀態
 *
 * 生命週期：
 * - 建立: 進入 /lobby 路由時
 * - 銷毀: GameStarted 事件後（進入 /game）
 *
 * @location front-end/src/user-interface/adapter/stores/matchmakingState.ts
 */

import { defineStore } from 'pinia'
import type { MatchmakingStatus } from '~/user-interface/application/ports/output'

interface MatchmakingState {
  /** 配對狀態 */
  status: MatchmakingStatus

  /** 會話 Token（GameRequestJoin 成功後保存） */
  sessionToken: string | null

  /** 錯誤訊息 */
  errorMessage: string | null
}

export const useMatchmakingStateStore = defineStore('matchmakingState', {
  state: (): MatchmakingState => ({
    status: 'idle',
    sessionToken: null,
    errorMessage: null,
  }),

  getters: {
    /**
     * 是否正在配對中
     */
    isFinding: (state): boolean => state.status === 'finding',

    /**
     * 是否處於錯誤狀態
     */
    hasError: (state): boolean => state.status === 'error',

    /**
     * 是否可以開始新的配對
     */
    canStartMatchmaking: (state): boolean => state.status === 'idle',
  },

  actions: {
    // === MatchmakingStatePort 實作 ===

    setStatus(status: MatchmakingStatus): void {
      this.status = status
    },

    setSessionToken(token: string | null): void {
      this.sessionToken = token
    },

    setErrorMessage(message: string | null): void {
      this.errorMessage = message
    },

    clearSession(): void {
      this.status = 'idle'
      this.sessionToken = null
      this.errorMessage = null
    },
  },
})
