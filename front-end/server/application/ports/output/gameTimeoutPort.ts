/**
 * Game Timeout Port - Application Layer
 *
 * @description
 * 遊戲計時器的 Output Port 介面。
 * 統一管理 CoreGame BC 的所有計時器需求，滿足 SSOT 原則。
 *
 * 設計理念：
 * - 遊戲計時器（原 ActionTimeout + DisplayTimeout）：同一遊戲同一時間只會有一個
 * - 斷線計時器：每個玩家獨立，一個遊戲可能有多個
 *
 * @module server/application/ports/output/gameTimeoutPort
 */

/**
 * 遊戲計時器 Port
 *
 * @description
 * 定義遊戲計時器的介面，由 Adapter Layer 實作。
 */
export abstract class GameTimeoutPort {
  // ============================================================
  // 遊戲計時器（Action 和 Display 統一）
  // ============================================================

  /**
   * 啟動遊戲計時器
   *
   * @description
   * 每個遊戲同一時間只會有一個計時器（回合制）。
   * 用於等待玩家操作（原 ActionTimeout）或等待動畫播放（原 DisplayTimeout）。
   * 伺服器端會自動加入緩衝時間，確保前端先觸發。
   *
   * @param gameId - 遊戲 ID
   * @param seconds - 超時秒數（面向客戶端的秒數，不含緩衝）
   * @param onTimeout - 超時回調函數
   */
  abstract startTimeout(gameId: string, seconds: number, onTimeout: () => void): void

  /**
   * 清除遊戲計時器
   *
   * @param gameId - 遊戲 ID
   */
  abstract clearTimeout(gameId: string): void

  /**
   * 取得遊戲計時器的剩餘秒數
   *
   * @description
   * 用於斷線重連時計算操作的剩餘時間。
   * 回傳的是面向客戶端的剩餘秒數（不含伺服器緩衝）。
   *
   * @param gameId - 遊戲 ID
   * @returns 剩餘秒數（無計時器或已過期回傳 null）
   */
  abstract getRemainingSeconds(gameId: string): number | null

  // ============================================================
  // 斷線計時器
  // ============================================================

  /**
   * 啟動斷線計時器
   *
   * @description
   * 每個玩家獨立的斷線計時器。
   * 一個遊戲可能同時有多個斷線計時器（雙方都可能斷線）。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param onTimeout - 超時回調函數
   */
  abstract startDisconnectTimeout(gameId: string, playerId: string, onTimeout: () => void): void

  /**
   * 清除指定玩家的斷線計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  abstract clearDisconnectTimeout(gameId: string, playerId: string): void

  /**
   * 清除遊戲的所有斷線計時器
   *
   * @param gameId - 遊戲 ID
   */
  abstract clearAllDisconnectTimeouts(gameId: string): void

  /**
   * 檢查指定玩家是否有斷線計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @returns 是否有斷線計時器
   */
  abstract hasDisconnectTimeout(gameId: string, playerId: string): boolean

  // ============================================================
  // 閒置計時器（Idle Timeout）
  // ============================================================

  /**
   * 啟動閒置計時器
   *
   * @description
   * 追蹤玩家的整體活躍度。
   * 若玩家持續超過 60 秒沒有主動操作（被代行不算主動操作），則視為閒置。
   * 每個玩家獨立的閒置計時器。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param onTimeout - 超時回調函數
   */
  abstract startIdleTimeout(gameId: string, playerId: string, onTimeout: () => void): void

  /**
   * 重置閒置計時器
   *
   * @description
   * 玩家有主動操作時呼叫，重新開始 60 秒倒數。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  abstract resetIdleTimeout(gameId: string, playerId: string): void

  /**
   * 清除指定玩家的閒置計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  abstract clearIdleTimeout(gameId: string, playerId: string): void

  /**
   * 清除遊戲的所有閒置計時器
   *
   * @param gameId - 遊戲 ID
   */
  abstract clearAllIdleTimeouts(gameId: string): void

  /**
   * 檢查指定玩家是否有閒置計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @returns 是否有閒置計時器
   */
  abstract hasIdleTimeout(gameId: string, playerId: string): boolean

  // ============================================================
  // 確認繼續計時器（Continue Confirmation Timeout）
  // ============================================================

  /**
   * 啟動確認繼續計時器
   *
   * @description
   * 當玩家閒置超過 60 秒後，回合結束時需要確認繼續遊戲。
   * 若玩家在指定時間內未確認，則視為放棄，結束遊戲。
   * 每個玩家獨立的確認計時器。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param totalSeconds - 總超時秒數（= displayTimeout + confirmTimeout）
   * @param onTimeout - 超時回調函數
   */
  abstract startContinueConfirmationTimeout(
    gameId: string,
    playerId: string,
    totalSeconds: number,
    onTimeout: () => void
  ): void

  /**
   * 清除指定玩家的確認繼續計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  abstract clearContinueConfirmationTimeout(gameId: string, playerId: string): void

  /**
   * 清除遊戲的所有確認繼續計時器
   *
   * @param gameId - 遊戲 ID
   */
  abstract clearAllContinueConfirmationTimeouts(gameId: string): void

  /**
   * 檢查指定玩家是否有確認繼續計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @returns 是否有確認繼續計時器
   */
  abstract hasContinueConfirmationTimeout(gameId: string, playerId: string): boolean

  // ============================================================
  // 加速代行計時器（斷線/離開玩家專用）
  // ============================================================

  /**
   * 啟動加速代行計時器
   *
   * @description
   * 斷線或離開玩家專用的加速計時器（3秒）。
   * 與操作計時器獨立，用於確保遊戲在玩家斷線時仍能流暢進行。
   * 當玩家重連時應清除此計時器，讓操作計時器繼續倒數。
   *
   * 語意分離：
   * - 操作計時器（15秒）：代表玩家標準操作時間
   * - 加速代行計時器（3秒）：斷線玩家的快速處理，會搶先觸發
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param onTimeout - 超時回調函數
   */
  abstract startAcceleratedTimeout(
    gameId: string,
    playerId: string,
    onTimeout: () => void
  ): void

  /**
   * 清除指定玩家的加速代行計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  abstract clearAcceleratedTimeout(gameId: string, playerId: string): void

  /**
   * 清除遊戲的所有加速代行計時器
   *
   * @param gameId - 遊戲 ID
   */
  abstract clearAllAcceleratedTimeouts(gameId: string): void

  /**
   * 檢查指定玩家是否有加速代行計時器
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @returns 是否有加速代行計時器
   */
  abstract hasAcceleratedTimeout(gameId: string, playerId: string): boolean

  // ============================================================
  // 遊戲層級清理
  // ============================================================

  /**
   * 清除指定遊戲的所有計時器
   *
   * @description
   * 包含遊戲計時器、斷線計時器、閒置計時器、確認繼續計時器和加速代行計時器。
   * 用於遊戲結束時的資源清理。
   *
   * @param gameId - 遊戲 ID
   */
  abstract clearAllForGame(gameId: string): void
}
