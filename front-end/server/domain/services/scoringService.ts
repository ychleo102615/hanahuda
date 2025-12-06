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
  /** Koi-Koi 倍率 */
  readonly koiMultiplier: number
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
 * 2. 套用 Koi-Koi 倍率（每次喊 Koi-Koi 倍率 +1）
 * 3. 若基礎分數 >= 7，最終分數再翻倍
 *
 * @param baseScore - 基礎分數
 * @param koiMultiplier - Koi-Koi 倍率（預設 1）
 * @returns 計分結果
 */
export function calculateFinalScore(
  baseScore: number,
  koiMultiplier: number = 1
): ScoreCalculationResult {
  const isDoubled = baseScore >= DOUBLE_SCORE_THRESHOLD
  const doubleMultiplier = isDoubled ? 2 : 1
  const finalScore = baseScore * koiMultiplier * doubleMultiplier

  return Object.freeze({
    baseScore,
    koiMultiplier,
    isDoubled,
    finalScore,
  })
}

/**
 * 從 KoiStatus 計算最終分數
 *
 * 便利方法，整合 KoiStatus 取得倍率。
 *
 * @param yakuList - 成立的役種列表
 * @param koiStatus - 玩家的 Koi-Koi 狀態（可選）
 * @returns 計分結果
 */
export function calculateScoreFromYaku(
  yakuList: readonly Yaku[],
  koiStatus: KoiStatus | null | undefined
): ScoreCalculationResult {
  const baseScore = calculateBaseScore(yakuList)
  const koiMultiplier = koiStatus?.koi_multiplier ?? 1
  return calculateFinalScore(baseScore, koiMultiplier)
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
