/**
 * CreatePrivateRoom Input Port
 *
 * @description
 * 建立私人房間的 Use Case 介面。
 *
 * @module server/matchmaking/application/ports/input/createPrivateRoomInputPort
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'

/**
 * 建立私房輸入
 */
export interface CreatePrivateRoomInput {
  readonly playerId: string
  readonly playerName: string
  readonly roomType: RoomTypeId
}

/**
 * 建立私房成功輸出
 */
export interface CreatePrivateRoomSuccessOutput {
  readonly success: true
  readonly roomId: string
  readonly expiresAt: Date
}

/**
 * 建立私房錯誤輸出
 */
export interface CreatePrivateRoomErrorOutput {
  readonly success: false
  readonly errorCode: 'PLAYER_IN_GAME' | 'PLAYER_IN_MATCHMAKING' | 'PLAYER_IN_ROOM'
  readonly message: string
}

/**
 * 建立私房輸出
 */
export type CreatePrivateRoomOutput =
  | CreatePrivateRoomSuccessOutput
  | CreatePrivateRoomErrorOutput

/**
 * CreatePrivateRoom Input Port
 */
export abstract class CreatePrivateRoomInputPort {
  abstract execute(input: CreatePrivateRoomInput): Promise<CreatePrivateRoomOutput>
}
