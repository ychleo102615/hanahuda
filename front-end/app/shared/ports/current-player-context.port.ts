/**
 * CurrentPlayerContextPort - Shared Kernel
 *
 * @description
 * 跨 BC 共用的當前玩家上下文介面。
 * 定義於 Shared Kernel，由 Identity BC 的 AuthStore 實作。
 *
 * 使用場景：
 * - Game Client BC 需要取得玩家 ID 進行遊戲初始化
 * - Game Client BC 需要檢查登入狀態決定是否重連
 */

/**
 * 當前玩家上下文
 */
export interface CurrentPlayerContext {
  /** 玩家 ID（未登入時為 null） */
  readonly playerId: string | null
  /** 是否已登入 */
  readonly isLoggedIn: boolean
}

/**
 * 當前玩家上下文 Port
 */
export interface CurrentPlayerContextPort {
  /**
   * 取得當前玩家上下文
   *
   * @returns 玩家上下文資訊
   */
  getContext(): CurrentPlayerContext
}
