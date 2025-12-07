/**
 * Special Rules Service - Domain Layer
 *
 * @description
 * 處理特殊規則（手四 Teshi、喰付 Kuttsuki）的檢測與計分。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/services/specialRulesService
 */

import type { SpecialRules } from '#shared/contracts'
import type { Round } from '../round/round'
import { detectTeshi, detectKuttsuki, getPlayerHand } from '../round/round'

/**
 * 特殊規則觸發類型
 */
export type SpecialRuleType = 'TESHI' | 'FIELD_KUTTSUKI'

/**
 * 特殊規則檢測結果
 */
export interface SpecialRuleResult {
  /** 是否觸發特殊規則 */
  readonly triggered: boolean
  /** 觸發的規則類型 */
  readonly type: SpecialRuleType | null
  /** 受影響的玩家 ID（Teshi 時為觸發者，Kuttsuki 時為 null） */
  readonly affectedPlayerId: string | null
  /** 獎勵/懲罰分數（Teshi 為負，Kuttsuki 為 0） */
  readonly awardedPoints: number
  /** 勝者 ID（Teshi 時為對手，Kuttsuki 時為 null） */
  readonly winnerId: string | null
  /** 觸發的月份 */
  readonly month: number | null
}

/**
 * 預設 Teshi 懲罰分數
 *
 * 手四規則：持有 4 張同月份牌的玩家失分，對手獲得 6 分
 */
const TESHI_PENALTY_POINTS = 6

/**
 * 檢測並處理特殊規則
 *
 * 檢查順序：
 * 1. 先檢查所有玩家的 Teshi（手四）
 * 2. 再檢查場牌的 Kuttsuki（喰付）
 *
 * @param round - 目前局狀態
 * @param specialRulesConfig - 特殊規則設定
 * @returns 特殊規則檢測結果
 */
export function checkSpecialRules(
  round: Round,
  specialRulesConfig: SpecialRules
): SpecialRuleResult {
  // 1. 檢查 Teshi（手四）
  if (specialRulesConfig.teshi_enabled) {
    for (const playerState of round.playerStates) {
      const hand = getPlayerHand(round, playerState.playerId)
      const teshiResult = detectTeshi(hand)

      if (teshiResult.hasTeshi) {
        // 找出對手 ID
        const opponentId = round.playerStates.find(
          (ps) => ps.playerId !== playerState.playerId
        )?.playerId ?? null

        return {
          triggered: true,
          type: 'TESHI',
          affectedPlayerId: playerState.playerId,
          awardedPoints: TESHI_PENALTY_POINTS,
          winnerId: opponentId, // 對手獲勝
          month: teshiResult.month,
        }
      }
    }
  }

  // 2. 檢查 Kuttsuki（喰付）
  if (specialRulesConfig.field_kuttsuki_enabled) {
    const kuttsukiResult = detectKuttsuki(round.field)

    if (kuttsukiResult.hasKuttsuki) {
      return {
        triggered: true,
        type: 'FIELD_KUTTSUKI',
        affectedPlayerId: null,
        awardedPoints: 0, // 流局無得分
        winnerId: null, // 無勝者
        month: kuttsukiResult.month,
      }
    }
  }

  // 無特殊規則觸發
  return {
    triggered: false,
    type: null,
    affectedPlayerId: null,
    awardedPoints: 0,
    winnerId: null,
    month: null,
  }
}

/**
 * 取得 Teshi 懲罰分數
 *
 * @returns Teshi 懲罰分數常數
 */
export function getTeshiPenaltyPoints(): number {
  return TESHI_PENALTY_POINTS
}

/**
 * 判斷特殊規則結果是否為流局（無勝者）
 *
 * @param result - 特殊規則結果
 * @returns 是否為流局
 */
export function isSpecialRuleDraw(result: SpecialRuleResult): boolean {
  return result.triggered && result.winnerId === null
}

/**
 * 判斷特殊規則結果是否有明確勝者
 *
 * @param result - 特殊規則結果
 * @returns 是否有勝者
 */
export function hasSpecialRuleWinner(result: SpecialRuleResult): boolean {
  return result.triggered && result.winnerId !== null
}
