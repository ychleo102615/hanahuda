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
  /** 玩家 ID (UUID v4) */
  readonly playerId: string
  /** 玩家名稱 */
  readonly playerName: string
  /** 會話 Token（用於重連） */
  readonly sessionToken?: string
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
 * 加入遊戲成功輸出
 */
export interface JoinGameSuccessOutput {
  /** 結果類型 */
  readonly status: 'success'
  /** 遊戲 ID */
  readonly gameId: string
  /** 會話 Token（該玩家的獨立 Token） */
  readonly sessionToken: string
  /** 玩家 ID */
  readonly playerId: string
  /** SSE 端點路徑 */
  readonly sseEndpoint: string
  /** 是否為重連 */
  readonly reconnected: boolean
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
 */
export type JoinGameOutput =
  | JoinGameSuccessOutput
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
