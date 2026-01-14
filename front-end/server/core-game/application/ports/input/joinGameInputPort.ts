/**
 * JoinGameInputPort - Input Port
 *
 * @description
 * Application Layer 定義的加入遊戲介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/joinGameInputPort
 */

import type { RoomTypeId } from '#shared/constants/roomTypes'

// ============================================================
// DTOs
// ============================================================

/**
 * 加入遊戲輸入參數
 */
export interface JoinGameInput {
  /** 玩家 ID (UUID v4) - 來自 Identity BC 的 playerId */
  readonly playerId: string
  /** 玩家名稱 */
  readonly playerName: string
  /** 遊戲 ID（用於重連模式） - 若提供則為重連模式，會返回遊戲狀態 */
  readonly gameId?: string
  /** 房間類型（用於建立新遊戲） */
  readonly roomType?: RoomTypeId
}

/**
 * 玩家分數
 */
export interface JoinGamePlayerScore {
  readonly playerId: string
  readonly score: number
}

/**
 * 加入遊戲成功輸出 - 等待對手
 *
 * @description
 * 建立新遊戲，等待對手加入。
 * 前端顯示等待畫面。
 */
export interface JoinGameWaitingOutput {
  /** 結果類型 */
  readonly status: 'game_waiting'
  /** 遊戲 ID */
  readonly gameId: string
  /** 玩家 ID */
  readonly playerId: string
  /** 玩家名稱 */
  readonly playerName: string
  /** 配對超時秒數 */
  readonly timeoutSeconds: number
}

/**
 * 加入遊戲成功輸出 - 遊戲開始
 *
 * @description
 * 加入現有遊戲，遊戲開始。
 * 包含完整的 GameStarted 資訊。
 */
export interface JoinGameStartedOutput {
  /** 結果類型 */
  readonly status: 'game_started'
  /** 遊戲 ID */
  readonly gameId: string
  /** 玩家 ID */
  readonly playerId: string
  /** 玩家列表 */
  readonly players: ReadonlyArray<{
    playerId: string
    playerName: string
    isAi: boolean
  }>
  /** 遊戲規則集 */
  readonly ruleset: {
    totalRounds: number
  }
  /** 先手玩家 ID */
  readonly startingPlayerId: string
}

/**
 * 加入遊戲成功輸出 - 快照恢復
 *
 * @description
 * 重連進行中的遊戲，返回完整快照。
 */
export interface JoinGameSnapshotOutput {
  /** 結果類型 */
  readonly status: 'snapshot'
  /** 遊戲 ID */
  readonly gameId: string
  /** 玩家 ID */
  readonly playerId: string
  /** 遊戲快照（由 EventMapper 轉換） */
  readonly snapshot: unknown
}

/**
 * 加入遊戲失敗 - 遊戲已結束
 */
export interface JoinGameFinishedOutput {
  /** 結果類型 */
  readonly status: 'game_finished'
  /** 遊戲 ID */
  readonly gameId: string
  /** 勝者 ID（平局時為 null） */
  readonly winnerId: string | null
  /** 最終分數 */
  readonly finalScores: readonly JoinGamePlayerScore[]
  /** 已玩回合數 */
  readonly roundsPlayed: number
  /** 總回合數 */
  readonly totalRounds: number
}

/**
 * 加入遊戲失敗 - 遊戲已過期
 */
export interface JoinGameExpiredOutput {
  /** 結果類型 */
  readonly status: 'game_expired'
  /** 遊戲 ID */
  readonly gameId: string
}

/**
 * 加入遊戲輸出結果（聯合類型）
 *
 * Gateway 架構支援的狀態：
 * - game_waiting: 等待對手加入
 * - game_started: 遊戲開始
 * - snapshot: 重連快照恢復
 * - game_finished: 遊戲已結束
 * - game_expired: 遊戲已過期
 */
export type JoinGameOutput =
  | JoinGameWaitingOutput
  | JoinGameStartedOutput
  | JoinGameSnapshotOutput
  | JoinGameFinishedOutput
  | JoinGameExpiredOutput

// ============================================================
// Input Port
// ============================================================

/**
 * 加入遊戲 Input Port
 *
 * Application Layer 定義的介面，由 JoinGameUseCase 實作。
 * Adapter Layer (REST Controller, OpponentService) 依賴此介面。
 */
export interface JoinGameInputPort {
  /**
   * 執行加入遊戲用例
   *
   * @param input - 加入遊戲參數
   * @returns 遊戲資訊
   */
  execute(input: JoinGameInput): Promise<JoinGameOutput>
}
