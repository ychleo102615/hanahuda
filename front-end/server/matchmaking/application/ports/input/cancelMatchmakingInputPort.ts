/**
 * Cancel Matchmaking Input Port
 *
 * @description
 * Application Layer 定義的取消配對輸入介面。
 * 定義取消配對的 Use Case 契約。
 *
 * @module server/matchmaking/application/ports/input/cancelMatchmakingInputPort
 */

/**
 * Cancel Matchmaking Input
 */
export interface CancelMatchmakingInput {
  /** 配對條目 ID */
  readonly entryId: string
  /** 玩家 ID (用於驗證) */
  readonly playerId: string
}

/**
 * Cancel Matchmaking Output - Success
 */
export interface CancelMatchmakingSuccessOutput {
  readonly success: true
  /** 狀態訊息 */
  readonly message: string
}

/**
 * Cancel Matchmaking Output - Error
 */
export interface CancelMatchmakingErrorOutput {
  readonly success: false
  /** 錯誤碼 */
  readonly errorCode: 'NOT_IN_QUEUE' | 'ENTRY_NOT_FOUND' | 'UNAUTHORIZED'
  /** 錯誤訊息 */
  readonly message: string
}

/**
 * Cancel Matchmaking Output
 */
export type CancelMatchmakingOutput = CancelMatchmakingSuccessOutput | CancelMatchmakingErrorOutput

/**
 * Cancel Matchmaking Input Port
 *
 * @description
 * Use Case 介面定義。由 Application Layer 實作。
 */
export abstract class CancelMatchmakingInputPort {
  abstract execute(input: CancelMatchmakingInput): Promise<CancelMatchmakingOutput>
}
