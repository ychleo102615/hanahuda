/**
 * PrivateRoomStatePort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責管理私人房間的 UI 狀態。
 *
 * 生命週期：
 * - 建立: 進入 /lobby 路由時
 * - 銷毀: 遊戲開始或房間解散時
 *
 * @module game-client/application/ports/output/private-room-state.port
 */

/**
 * 私人房間狀態
 */
export type PrivateRoomUiStatus = 'WAITING' | 'FULL' | 'IN_GAME' | 'EXPIRED' | 'DISSOLVED'

/**
 * PrivateRoomStatePort
 */
export interface PrivateRoomStatePort {
  /**
   * 設定房間資訊（Gateway 連線恢復時使用）
   */
  setRoomInfo(payload: PrivateRoomInfoPayload): void

  /**
   * 清除房間狀態
   */
  clearRoom(): void
}

/**
 * 私人房間資訊 Payload
 */
export interface PrivateRoomInfoPayload {
  readonly roomId: string
  readonly roomType: string
  readonly hostName: string
  readonly roomStatus: PrivateRoomUiStatus
}
