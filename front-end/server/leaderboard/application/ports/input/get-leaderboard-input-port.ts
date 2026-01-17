/**
 * GetLeaderboardInputPort
 *
 * @description
 * 取得排行榜的 Input Port 介面。
 * 定義 Use Case 的輸入參數和輸出結果。
 *
 * @module server/leaderboard/application/ports/input/get-leaderboard-input-port
 */

import type { LeaderboardEntry } from '~~/server/leaderboard/domain/leaderboard/leaderboard-entry'
import type { LeaderboardType } from '~~/server/leaderboard/domain/leaderboard/leaderboard-type'

/**
 * 取得排行榜請求
 */
export interface GetLeaderboardRequest {
  /** 排行榜類型 */
  readonly type: LeaderboardType
  /** 限制數量 (1-100) */
  readonly limit: number
  /** 當前玩家 ID（可選，用於取得玩家自身排名） */
  readonly currentPlayerId?: string
}

/**
 * 取得排行榜回應
 */
export interface GetLeaderboardResponse {
  /** 排行榜條目 */
  readonly entries: LeaderboardEntry[]
  /** 當前玩家排名（若有提供 currentPlayerId 且不在前 N 名內） */
  readonly currentPlayerRank?: number
  /** 排行榜類型 */
  readonly type: LeaderboardType
}

/**
 * 取得排行榜 Input Port
 */
export interface GetLeaderboardInputPort {
  /**
   * 執行取得排行榜
   *
   * @param request - 請求參數
   * @returns 排行榜回應
   */
  execute(request: GetLeaderboardRequest): Promise<GetLeaderboardResponse>
}
