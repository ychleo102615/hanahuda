/**
 * PrivateRoomStateStore - Pinia Store
 *
 * @description
 * 實作 PrivateRoomStatePort 介面的 Pinia Store。
 * 負責管理私人房間的 UI 狀態。
 *
 * shareUrl 由前端從 roomId + window.location.origin 衍生，
 * 不從後端取得（Adapter 層職責）。
 *
 * @module game-client/adapter/stores/privateRoomState
 */

import { defineStore } from 'pinia'
import type { PrivateRoomUiStatus, PrivateRoomInfoPayload } from '~/game-client/application/ports/output'

interface PrivateRoomState {
  /** 房間 ID */
  roomId: string | null

  /** 房間類型 */
  roomType: string | null

  /** 房主名稱 */
  hostName: string | null

  /** 房間狀態 */
  roomStatus: PrivateRoomUiStatus | null
}

export const usePrivateRoomStateStore = defineStore('privateRoomState', {
  state: (): PrivateRoomState => ({
    roomId: null,
    roomType: null,
    hostName: null,
    roomStatus: null,
  }),

  getters: {
    /**
     * 是否有活躍的私人房間
     */
    hasActiveRoom: (state): boolean => state.roomId !== null,

    /**
     * 分享連結（由前端從 roomId 衍生）
     */
    shareUrl: (state): string | null => {
      if (!state.roomId) return null
      return `${window.location.origin}/room/${state.roomId}`
    },
  },

  actions: {
    // === PrivateRoomStatePort 實作 ===

    setRoomInfo(payload: PrivateRoomInfoPayload): void {
      this.$patch({
        roomId: payload.roomId,
        roomType: payload.roomType,
        hostName: payload.hostName,
        roomStatus: payload.roomStatus,
      })
    },

    clearRoom(): void {
      this.$patch({
        roomId: null,
        roomType: null,
        hostName: null,
        roomStatus: null,
      })
    },
  },
})
