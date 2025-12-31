/**
 * Special Rules Service - Domain Layer
 *
 * @description
 * 處理特殊規則（手四 Teshi、喰付 Kuttsuki、場上手四 Field Teshi）的檢測與計分。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/services/specialRulesService
 */

import type { SpecialRules } from '#shared/contracts'
import type { Round } from '../round'
import { detectTeshi, detectKuttsuki, detectFieldTeshi, getPlayerHand } from '../round'

/**
 * 特殊規則觸發類型
 *
 * @description
 * - TESHI: 手四（手牌 4 張同月份） - 觸發者獲 6 分
 * - KUTTSUKI: 喰付（手牌 4 對同月份） - 觸發者獲 6 分
 * - FIELD_TESHI: 場上手四（場牌 4 張同月份） - 流局重發
 */
export type SpecialRuleType = 'TESHI' | 'KUTTSUKI' | 'FIELD_TESHI'

/**
 * 特殊規則檢測結果
 */
export interface SpecialRuleResult {
  /** 是否觸發特殊規則 */
  readonly triggered: boolean
  /** 觸發的規則類型 */
  readonly type: SpecialRuleType | null
  /** 觸發者玩家 ID */
  readonly triggeredPlayerId: string | null
  /** 獲得分數（手四/喰付為 6 分，場上手四為 0） */
  readonly awardedPoints: number
  /** 勝者 ID（手四/喰付為觸發者，場上手四為 null） */
  readonly winnerId: string | null
  /** 觸發的月份（手四/場上手四為單一月份，喰付為 null） */
  readonly month: number | null
  /** 觸發的月份列表（僅喰付使用，4 個月份） */
  readonly months: readonly number[] | null
}

/**
 * 特殊規則獲得分數
 *
 * @description
 * 手四和喰付觸發者獲得 6 分
 */
const SPECIAL_RULE_POINTS = 6

/**
 * 檢測並處理特殊規則
 *
 * 檢查順序：
 * 1. 先檢查所有玩家的 Teshi（手四）
 * 2. 再檢查所有玩家的 Kuttsuki（喰付）
 * 3. 最後檢查場牌的 Field Teshi（場上手四）
 *
 * @param round - 目前局狀態
 * @param specialRulesConfig - 特殊規則設定
 * @returns 特殊規則檢測結果
 */
export function checkSpecialRules(
  round: Round,
  specialRulesConfig: SpecialRules
): SpecialRuleResult {
  // 1. 檢查 Teshi（手四）- 觸發者獲 6 分
  if (specialRulesConfig.teshi_enabled) {
    for (const playerState of round.playerStates) {
      const hand = getPlayerHand(round, playerState.playerId)
      const teshiResult = detectTeshi(hand)

      if (teshiResult.hasTeshi) {
        return {
          triggered: true,
          type: 'TESHI',
          triggeredPlayerId: playerState.playerId,
          awardedPoints: SPECIAL_RULE_POINTS,
          winnerId: playerState.playerId, // 觸發者獲勝
          month: teshiResult.month,
          months: null,
        }
      }
    }
  }

  // 2. 檢查 Kuttsuki（喰付）- 觸發者獲 6 分
  if (specialRulesConfig.kuttsuki_enabled) {
    for (const playerState of round.playerStates) {
      const hand = getPlayerHand(round, playerState.playerId)
      const kuttsukiResult = detectKuttsuki(hand)

      if (kuttsukiResult.hasKuttsuki) {
        return {
          triggered: true,
          type: 'KUTTSUKI',
          triggeredPlayerId: playerState.playerId,
          awardedPoints: SPECIAL_RULE_POINTS,
          winnerId: playerState.playerId, // 觸發者獲勝
          month: null,
          months: kuttsukiResult.months,
        }
      }
    }
  }

  // 3. 檢查 Field Teshi（場上手四）- 流局
  if (specialRulesConfig.field_teshi_enabled) {
    const fieldTeshiResult = detectFieldTeshi(round.field)

    if (fieldTeshiResult.hasFieldTeshi) {
      return {
        triggered: true,
        type: 'FIELD_TESHI',
        triggeredPlayerId: null,
        awardedPoints: 0, // 流局無得分
        winnerId: null, // 無勝者
        month: fieldTeshiResult.month,
        months: null,
      }
    }
  }

  // 無特殊規則觸發
  return {
    triggered: false,
    type: null,
    triggeredPlayerId: null,
    awardedPoints: 0,
    winnerId: null,
    month: null,
    months: null,
  }
}

/**
 * 取得特殊規則獲得分數
 *
 * @returns 特殊規則分數常數
 */
export function getSpecialRulePoints(): number {
  return SPECIAL_RULE_POINTS
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
