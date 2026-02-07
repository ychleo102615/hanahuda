/**
 * JoinPrivateRoom Input Port
 *
 * @module server/matchmaking/application/ports/input/joinPrivateRoomInputPort
 */

/**
 * JoinPrivateRoom Input
 */
export interface JoinPrivateRoomInput {
  readonly roomId: string
  readonly playerId: string
  readonly playerName: string
}

/**
 * JoinPrivateRoom Output - Success
 */
export interface JoinPrivateRoomSuccessOutput {
  readonly success: true
  readonly roomId: string
  readonly hostName: string
  readonly roomType: string
}

/**
 * JoinPrivateRoom Output - Error
 */
export interface JoinPrivateRoomErrorOutput {
  readonly success: false
  readonly errorCode:
    | 'ROOM_NOT_FOUND'
    | 'ROOM_EXPIRED'
    | 'ROOM_FULL'
    | 'CANNOT_JOIN_OWN_ROOM'
    | 'PLAYER_IN_GAME'
    | 'PLAYER_IN_MATCHMAKING'
    | 'PLAYER_IN_ROOM'
  readonly message: string
}

/**
 * JoinPrivateRoom Output
 */
export type JoinPrivateRoomOutput =
  | JoinPrivateRoomSuccessOutput
  | JoinPrivateRoomErrorOutput

/**
 * JoinPrivateRoom Input Port
 */
export abstract class JoinPrivateRoomInputPort {
  abstract execute(input: JoinPrivateRoomInput): Promise<JoinPrivateRoomOutput>
}
