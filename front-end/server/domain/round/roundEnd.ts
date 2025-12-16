/**
 * Round End Logic - Domain Layer
 *
 * @description
 * 局結束計算邏輯。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/round/roundEnd
 */

import type { Yaku, YakuSetting } from '#shared/contracts'
import type { Round } from './round'
import { getPlayerDepository } from './roundQueries'
import { detectYaku } from '../services/yakuDetectionService'
import { calculateScoreFromYaku } from '../services/scoringService'
import type { SpecialRuleResult } from '../services/specialRulesService'

/**
 * 局結束結果
 */
export interface RoundEndResult {
  /** 勝者 ID（平局時為 null） */
  readonly winnerId: string | null
  /** 成立的役種列表 */
  readonly yakuList: readonly Yaku[]
  /** 基礎分數 */
  readonly baseScore: number
  /** 最終分數 */
  readonly finalScore: number
  /** Koi-Koi 倍率（1 或 2） */
  readonly koiMultiplier: number
  /** 是否有任一玩家宣告過 Koi-Koi（與 koiMultiplier 對應） */
  readonly koiKoiApplied: boolean
  /** 是否觸發 7 點翻倍 */
  readonly isDoubled: boolean
  /** 是否為平局 */
  readonly isDraw: boolean
  /** 觸發的特殊規則類型 */
  readonly specialRuleTriggered: 'TESHI' | 'FIELD_KUTTSUKI' | null
}

/**
 * 計算局結束結果（正常結束 - 玩家選擇 END_ROUND）
 *
 * @param round - 局狀態
 * @param winnerId - 勝者 ID（選擇 END_ROUND 的玩家）
 * @param yakuSettings - 役種設定
 * @returns 局結束結果
 */
export function calculateRoundEndResult(
  round: Round,
  winnerId: string,
  yakuSettings: readonly YakuSetting[]
): RoundEndResult {
  // 取得勝者的獲得區
  const depository = getPlayerDepository(round, winnerId)

  // 檢測役種
  const yakuList = detectYaku(depository, yakuSettings)

  // 計算分數（傳入所有玩家的 KoiStatus，判斷是否有人宣告過 Koi-Koi）
  const scoreResult = calculateScoreFromYaku(yakuList, round.koiStatuses)

  return {
    winnerId,
    yakuList,
    baseScore: scoreResult.baseScore,
    finalScore: scoreResult.finalScore,
    koiMultiplier: scoreResult.koiMultiplier,
    koiKoiApplied: scoreResult.koiKoiApplied,
    isDoubled: scoreResult.isDoubled,
    isDraw: false,
    specialRuleTriggered: null,
  }
}

/**
 * 計算局結束結果（平局 - 牌堆耗盡無役種）
 *
 * @returns 平局結果
 */
export function calculateRoundDrawResult(): RoundEndResult {
  return {
    winnerId: null,
    yakuList: [],
    baseScore: 0,
    finalScore: 0,
    koiMultiplier: 1,
    koiKoiApplied: false,
    isDoubled: false,
    isDraw: true,
    specialRuleTriggered: null,
  }
}

/**
 * 計算局結束結果（特殊規則觸發）
 *
 * @param specialRuleResult - 特殊規則檢測結果
 * @returns 局結束結果
 */
export function calculateSpecialRuleEndResult(
  specialRuleResult: SpecialRuleResult
): RoundEndResult {
  return {
    winnerId: specialRuleResult.winnerId,
    yakuList: [],
    baseScore: specialRuleResult.awardedPoints,
    finalScore: specialRuleResult.awardedPoints,
    koiMultiplier: 1,
    koiKoiApplied: false,
    isDoubled: false,
    isDraw: specialRuleResult.winnerId === null,
    specialRuleTriggered: specialRuleResult.type,
  }
}
