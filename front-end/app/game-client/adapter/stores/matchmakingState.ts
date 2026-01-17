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
 * @location front-end/src/game-client/adapter/stores/matchmakingState.ts
 */

import { defineStore } from 'pinia'
import type { MatchmakingStatus } from '~/game-client/application/ports/output'

interface MatchmakingState {
  /** 配對狀態 */
  status: MatchmakingStatus

  /** 會話 Token（GameRequestJoin 成功後保存） */
  sessionToken: string | null

  /** 遊戲 ID（GameRequestJoin 成功後保存，用於建立 WebSocket 連線） */
  gameId: string | null

  /** 錯誤代碼（伺服器回傳） */
  errorCode: string | null

  /** 錯誤訊息 */
  errorMessage: string | null

  // === Online Matchmaking ===

  /** 配對經過秒數 */
  elapsedSeconds: number

  /** 狀態訊息 */
  statusMessage: string | null

  /** 對手名稱 */
  opponentName: string | null

  /** 是否為 Bot 對手 */
  isBot: boolean
}

export const useMatchmakingStateStore = defineStore('matchmakingState', {
  state: (): MatchmakingState => ({
    status: 'idle',
    sessionToken: null,
    gameId: null,
    errorCode: null,
    errorMessage: null,
    // Online Matchmaking
    elapsedSeconds: 0,
    statusMessage: null,
    opponentName: null,
    isBot: false,
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

    setGameId(gameId: string | null): void {
      this.gameId = gameId
    },

    setErrorCode(code: string | null): void {
      this.errorCode = code
    },

    setErrorMessage(message: string | null): void {
      this.errorMessage = message
    },

    setError(code: string, message: string): void {
      this.errorCode = code
      this.errorMessage = message
    },

    clearSession(): void {
      this.status = 'idle'
      this.sessionToken = null
      this.gameId = null
      this.errorCode = null
      this.errorMessage = null
      // Online Matchmaking
      this.elapsedSeconds = 0
      this.statusMessage = null
      this.opponentName = null
      this.isBot = false
    },

    // === Online Matchmaking ===

    setElapsedSeconds(seconds: number): void {
      this.elapsedSeconds = seconds
    },

    setStatusMessage(message: string | null): void {
      this.statusMessage = message
    },

    setOpponentInfo(name: string, isBot: boolean): void {
      this.opponentName = name
      this.isBot = isBot
    },

    /**
     * 批量設定配對成功狀態
     *
     * 使用 $patch 一次性更新多個屬性，只觸發一次響應式更新。
     */
    setMatchedState(payload: { opponentName: string; isBot: boolean; gameId: string }): void {
      this.$patch({
        status: 'matched' as const,
        opponentName: payload.opponentName,
        isBot: payload.isBot,
        gameId: payload.gameId,
      })
    },
  },
})
