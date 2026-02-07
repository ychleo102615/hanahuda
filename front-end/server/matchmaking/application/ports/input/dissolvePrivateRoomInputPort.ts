/**
 * DissolvePrivateRoom Input Port
 *
 * @module server/matchmaking/application/ports/input/dissolvePrivateRoomInputPort
 */

/**
 * DissolvePrivateRoom Input
 */
export interface DissolvePrivateRoomInput {
  readonly roomId: string
  readonly playerId: string
}

/**
 * DissolvePrivateRoom Output - Success
 */
export interface DissolvePrivateRoomSuccessOutput {
  readonly success: true
  readonly guestId: string | null
}

/**
 * DissolvePrivateRoom Output - Error
 */
export interface DissolvePrivateRoomErrorOutput {
  readonly success: false
  readonly errorCode: 'ROOM_NOT_FOUND' | 'NOT_HOST' | 'ROOM_IN_GAME'
  readonly message: string
}

/**
 * DissolvePrivateRoom Output
 */
export type DissolvePrivateRoomOutput =
  | DissolvePrivateRoomSuccessOutput
  | DissolvePrivateRoomErrorOutput

/**
 * DissolvePrivateRoom Input Port
 */
export abstract class DissolvePrivateRoomInputPort {
  abstract execute(input: DissolvePrivateRoomInput): Promise<DissolvePrivateRoomOutput>
}
