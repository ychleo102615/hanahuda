/**
 * StartPrivateRoomGame Input Port
 *
 * @description
 * 當私人房間 FULL 且雙方 SSE 連線就位時，觸發遊戲開始。
 * 由 events.get.ts 在 SSE 連線建立時呼叫。
 *
 * @module server/matchmaking/application/ports/input/startPrivateRoomGameInputPort
 */

/**
 * StartPrivateRoomGame Input
 */
export interface StartPrivateRoomGameInput {
  readonly playerId: string
}

/**
 * StartPrivateRoomGame Output
 */
export interface StartPrivateRoomGameOutput {
  readonly started: boolean
}

/**
 * StartPrivateRoomGame Input Port
 */
export abstract class StartPrivateRoomGameInputPort {
  abstract execute(input: StartPrivateRoomGameInput): Promise<StartPrivateRoomGameOutput>
}
