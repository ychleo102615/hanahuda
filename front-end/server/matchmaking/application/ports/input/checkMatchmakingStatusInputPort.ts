/**
 * Check Matchmaking Status Input Port
 *
 * @description
 * Application Layer 定義的查詢配對狀態輸入介面。
 * 定義查詢配對狀態的 Use Case 契約。
 *
 * @module server/matchmaking/application/ports/input/checkMatchmakingStatusInputPort
 */

import type { MatchmakingStatusCode } from '../../../domain/matchmakingStatus'

/**
 * Check Matchmaking Status Input
 */
export interface CheckMatchmakingStatusInput {
  /** 配對條目 ID */
  readonly entryId: string
  /** 玩家 ID (用於驗證) */
  readonly playerId: string
}

/**
 * Check Matchmaking Status Output - Success
 */
export interface CheckMatchmakingStatusSuccessOutput {
  readonly success: true
  /** 狀態碼 */
  readonly status: MatchmakingStatusCode
  /** 狀態訊息 */
  readonly message: string
  /** 已等待秒數 */
  readonly elapsedSeconds: number
}

/**
 * Check Matchmaking Status Output - Error
 */
export interface CheckMatchmakingStatusErrorOutput {
  readonly success: false
  /** 錯誤碼 */
  readonly errorCode: 'ENTRY_NOT_FOUND' | 'UNAUTHORIZED'
  /** 錯誤訊息 */
  readonly message: string
}

/**
 * Check Matchmaking Status Output
 */
export type CheckMatchmakingStatusOutput =
  | CheckMatchmakingStatusSuccessOutput
  | CheckMatchmakingStatusErrorOutput

/**
 * Check Matchmaking Status Input Port
 *
 * @description
 * Use Case 介面定義。由 Application Layer 實作。
 */
export abstract class CheckMatchmakingStatusInputPort {
  abstract execute(input: CheckMatchmakingStatusInput): Promise<CheckMatchmakingStatusOutput>
}
