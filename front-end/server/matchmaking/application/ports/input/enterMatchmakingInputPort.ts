/**
 * Enter Matchmaking Input Port
 *
 * @description
 * Application Layer 定義的進入配對輸入介面。
 * 定義進入配對佇列的 Use Case 契約。
 *
 * @module server/matchmaking/application/ports/input/enterMatchmakingInputPort
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'

/**
 * Enter Matchmaking Input
 */
export interface EnterMatchmakingInput {
  /** 玩家 ID */
  readonly playerId: string
  /** 玩家名稱 */
  readonly playerName: string
  /** 房間類型 */
  readonly roomType: RoomTypeId
}

/**
 * Enter Matchmaking Output - Success
 */
export interface EnterMatchmakingSuccessOutput {
  readonly success: true
  /** 配對條目 ID */
  readonly entryId: string
  /** 狀態訊息 */
  readonly message: string
}

/**
 * Enter Matchmaking Output - Error
 */
export interface EnterMatchmakingErrorOutput {
  readonly success: false
  /** 錯誤碼 */
  readonly errorCode: 'ALREADY_IN_QUEUE' | 'ALREADY_IN_GAME' | 'INVALID_ROOM_TYPE'
  /** 錯誤訊息 */
  readonly message: string
}

/**
 * Enter Matchmaking Output
 */
export type EnterMatchmakingOutput = EnterMatchmakingSuccessOutput | EnterMatchmakingErrorOutput

/**
 * Enter Matchmaking Input Port
 *
 * @description
 * Use Case 介面定義。由 Application Layer 實作。
 */
export abstract class EnterMatchmakingInputPort {
  abstract execute(input: EnterMatchmakingInput): Promise<EnterMatchmakingOutput>
}
