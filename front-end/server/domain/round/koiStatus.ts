/**
 * KoiStatus Value Object - Domain Layer
 *
 * @description
 * 追蹤玩家的 Koi-Koi 倍率狀態。
 * 純 TypeScript，無框架依賴。
 *
 * 注意：此定義與 #shared/contracts 的 KoiStatus 結構一致，
 * 但在 Domain Layer 獨立定義，避免 Domain 依賴 Adapter 層。
 *
 * @module server/domain/round/koiStatus
 */

/**
 * KoiStatus Value Object
 *
 * 追蹤玩家的 Koi-Koi 宣告狀態，用於計算最終分數倍率。
 */
export interface KoiStatus {
  /** 玩家 ID */
  readonly player_id: string
  /** 當前倍率 (初始為 1，每次 Koi-Koi 加倍) */
  readonly koi_multiplier: number
  /** Koi-Koi 宣告次數 */
  readonly times_continued: number
}

/**
 * 建立初始 KoiStatus
 *
 * @param playerId - 玩家 ID
 * @returns 初始 KoiStatus（倍率 1，宣告次數 0）
 */
export function createInitialKoiStatus(playerId: string): KoiStatus {
  return Object.freeze({
    player_id: playerId,
    koi_multiplier: 1,
    times_continued: 0,
  })
}

/**
 * 套用 Koi-Koi 決策
 *
 * 當玩家選擇繼續（KOI_KOI）時，倍率加倍並增加宣告次數。
 *
 * @param status - 目前的 KoiStatus
 * @returns 更新後的 KoiStatus（倍率加倍，次數+1）
 */
export function applyKoiKoi(status: KoiStatus): KoiStatus {
  return Object.freeze({
    player_id: status.player_id,
    koi_multiplier: status.koi_multiplier * 2,
    times_continued: status.times_continued + 1,
  })
}

/**
 * 取得玩家的目前倍率
 *
 * @param status - KoiStatus 物件
 * @returns 目前的倍率數值
 */
export function getMultiplier(status: KoiStatus): number {
  return status.koi_multiplier
}

/**
 * 檢查玩家是否曾宣告 Koi-Koi
 *
 * @param status - KoiStatus 物件
 * @returns 是否曾宣告 Koi-Koi
 */
export function hasCalledKoiKoi(status: KoiStatus): boolean {
  return status.times_continued > 0
}
