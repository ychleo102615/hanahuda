/**
 * RecordGameStatsInputPort - Input Port
 *
 * @description
 * Application Layer 定義的遊戲統計記錄介面。
 * Use Case 實作此介面，其他 Use Cases 透過此介面記錄統計。
 *
 * @module server/application/ports/input/recordGameStatsInputPort
 */

import type { PlayerScore, Yaku } from '#shared/contracts'
import type { Player } from '~~/server/domain/game/player'

// ============================================================
// DTOs
// ============================================================

/**
 * 記錄遊戲統計輸入參數
 */
export interface RecordGameStatsInput {
  /** 遊戲 ID */
  readonly gameId: string

  /** 勝者 ID (null 表示平局) */
  readonly winnerId: string | null

  /** 最終分數 */
  readonly finalScores: readonly PlayerScore[]

  /** 勝者的役種列表 (投降等情況下為空陣列) */
  readonly winnerYakuList: readonly Yaku[]

  /** 勝者的 Koi-Koi 倍率 (預設 1) */
  readonly winnerKoiMultiplier: number

  /** 遊戲中的所有玩家 (用於識別 AI) */
  readonly players: readonly Player[]

  /**
   * 是否僅記錄局結束統計（不更新遊戲勝負場次）
   *
   * - true: 只記錄役種/Koi-Koi/倍率，不更新 gamesPlayed/gamesWon/gamesLost
   * - false/undefined: 完整記錄（遊戲結束時使用）
   */
  readonly isRoundEndOnly?: boolean
}

/**
 * 記錄遊戲統計輸出結果
 */
export interface RecordGameStatsOutput {
  /** 是否成功 */
  readonly success: boolean
}

// ============================================================
// Error
// ============================================================

/**
 * 記錄遊戲統計錯誤代碼
 */
export type RecordGameStatsErrorCode =
  | 'INVALID_INPUT'
  | 'REPOSITORY_ERROR'

/**
 * 記錄遊戲統計錯誤
 */
export class RecordGameStatsError extends Error {
  constructor(
    public readonly code: RecordGameStatsErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'RecordGameStatsError'
  }
}

// ============================================================
// Input Port
// ============================================================

/**
 * 記錄遊戲統計 Input Port
 *
 * Application Layer 定義的介面，由 RecordGameStatsUseCase 實作。
 * 其他 Use Cases (MakeDecisionUseCase, LeaveGameUseCase) 透過此介面記錄統計。
 */
export interface RecordGameStatsInputPort {
  /**
   * 執行記錄遊戲統計用例
   *
   * @param input - 遊戲統計參數
   * @returns 結果
   */
  execute(input: RecordGameStatsInput): Promise<RecordGameStatsOutput>
}
