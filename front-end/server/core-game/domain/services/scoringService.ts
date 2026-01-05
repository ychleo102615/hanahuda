/**
 * ScoringService - Domain Service
 *
 * @description
 * 計分服務：封裝 Koi-Koi 計分業務規則。
 * 包含倍率計算、7 點門檻翻倍等核心計分邏輯。
 * 純函數，無外部依賴。
 *
 * @module server/domain/services/scoringService
 */

import type { Yaku } from '#shared/contracts'
import type { KoiStatus } from '../round/koiStatus'

/**
 * 7 點以上翻倍門檻
 *
 * 根據標準 Koi-Koi 規則，基礎分數達到 7 點以上時，最終分數額外翻倍。
 * 這鼓勵玩家追求高分組合而非快速結束。
 */
const DOUBLE_SCORE_THRESHOLD = 7

/**
 * 計分結果
 */
export interface ScoreCalculationResult {
  /** 基礎分數（役種點數總和） */
  readonly baseScore: number
  /** Koi-Koi 倍率（1 或 2，取決於是否有人宣告過 Koi-Koi） */
  readonly koiMultiplier: number
  /** 是否有任一玩家宣告過 Koi-Koi */
  readonly koiKoiApplied: boolean
  /** 是否觸發 7 點翻倍 */
  readonly isDoubled: boolean
  /** 最終分數 */
  readonly finalScore: number
}

/**
 * 計算役種基礎分數
 *
 * @param yakuList - 成立的役種列表
 * @returns 基礎分數總和
 */
export function calculateBaseScore(yakuList: readonly Yaku[]): number {
  return yakuList.reduce((sum, yaku) => sum + yaku.base_points, 0)
}

/**
 * 計算最終分數
 *
 * 套用 Koi-Koi 計分規則：
 * 1. 基礎分數 = 所有役種點數總和
 * 2. 若有任一方宣告過 Koi-Koi，分數 ×2（全局共享，無論宣告幾次都只加倍一次）
 * 3. 若基礎分數 >= 7，最終分數再翻倍
 *
 * @param baseScore - 基礎分數
 * @param anyoneCalledKoiKoi - 是否有任一玩家宣告過 Koi-Koi
 * @returns 計分結果
 */
export function calculateFinalScore(
  baseScore: number,
  anyoneCalledKoiKoi: boolean = false
): ScoreCalculationResult {
  const koiKoiMultiplier = anyoneCalledKoiKoi ? 2 : 1
  const isDoubled = baseScore >= DOUBLE_SCORE_THRESHOLD
  const doubleMultiplier = isDoubled ? 2 : 1
  const finalScore = baseScore * koiKoiMultiplier * doubleMultiplier

  return Object.freeze({
    baseScore,
    koiMultiplier: koiKoiMultiplier,
    koiKoiApplied: anyoneCalledKoiKoi,
    isDoubled,
    finalScore,
  })
}

/**
 * 從 KoiStatuses 計算最終分數
 *
 * 便利方法，整合所有玩家的 KoiStatus 判斷是否有人宣告過 Koi-Koi。
 *
 * @param yakuList - 成立的役種列表
 * @param koiStatuses - 所有玩家的 Koi-Koi 狀態列表
 * @returns 計分結果
 */
export function calculateScoreFromYaku(
  yakuList: readonly Yaku[],
  koiStatuses: readonly KoiStatus[]
): ScoreCalculationResult {
  const baseScore = calculateBaseScore(yakuList)
  const anyoneCalled = koiStatuses.some(status => status.times_continued > 0)
  return calculateFinalScore(baseScore, anyoneCalled)
}

/**
 * 取得 7 點門檻值
 *
 * 供外部參考或規則說明使用。
 *
 * @returns 7 點門檻常數
 */
export function getDoubleScoreThreshold(): number {
  return DOUBLE_SCORE_THRESHOLD
}
