/**
 * UpdatePlayerRecordsInputPort
 *
 * @description
 * 更新玩家記錄的 Input Port 介面。
 * 統一處理 player_stats 和 daily_player_scores 的更新。
 *
 * @module server/leaderboard/application/ports/input/update-player-records-input-port
 */

/**
 * 更新玩家記錄請求
 */
export interface UpdatePlayerRecordsRequest {
  /** 遊戲 ID */
  readonly gameId: string
  /** 贏家 ID（若平局則為 null） */
  readonly winnerId: string | null
  /** 最終分數列表 */
  readonly finalScores: readonly {
    readonly playerId: string
    readonly score: number
    readonly achievedYaku: readonly string[]
    readonly koiKoiCalls: number
    readonly isMultiplierWin: boolean
  }[]
  /** 玩家列表（用於判斷是否為 AI） */
  readonly players: readonly {
    readonly id: string
    readonly isAi: boolean
  }[]
  /** 遊戲結束時間 */
  readonly finishedAt: Date
}

/**
 * 更新玩家記錄 Input Port
 */
export interface UpdatePlayerRecordsInputPort {
  /**
   * 執行更新玩家記錄
   *
   * @description
   * 處理 GAME_FINISHED 事件，更新 player_stats 和 daily_player_scores。
   * 只更新非 AI 玩家的統計資料。
   *
   * @param request - 請求參數
   */
  execute(request: UpdatePlayerRecordsRequest): Promise<void>
}
