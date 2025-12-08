/**
 * JoinGameInputPort - Input Port
 *
 * @description
 * Application Layer 定義的加入遊戲介面。
 * Use Case 實作此介面，Adapter Layer (Controllers) 依賴此介面。
 *
 * @module server/application/ports/input/joinGameInputPort
 */

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
}

/**
 * 加入遊戲輸出結果
 */
export interface JoinGameOutput {
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
