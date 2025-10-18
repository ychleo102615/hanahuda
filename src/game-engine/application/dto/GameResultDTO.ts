import type { GameState } from '@/game-engine/domain/entities/GameState'

/**
 * GameResultDTO - game-engine BC 內部使用的結果資料傳輸物件
 *
 * 這些 DTO 僅在 game-engine BC 內部使用,用於 UseCase 之間傳遞結果
 * 不會跨越 BC 邊界
 *
 * 注意: 跨 BC 通訊使用整合事件 (Integration Events),而非這些 DTO
 */

/**
 * 設置遊戲結果
 */
export interface SetUpGameResult {
  /**
   * 操作是否成功
   */
  success: boolean

  /**
   * 遊戲 ID (成功時)
   */
  gameId: string

  /**
   * 錯誤訊息 (失敗時)
   */
  error?: string
}

/**
 * 設置回合結果
 */
export interface SetUpRoundResult {
  /**
   * 操作是否成功
   */
  success: boolean

  /**
   * 遊戲狀態 (成功時,僅在 UseCase 之間傳遞)
   */
  gameState?: GameState

  /**
   * 錯誤訊息 (失敗時)
   */
  error?: string
}
