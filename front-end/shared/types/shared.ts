/**
 * 共用資料結構
 *
 * 參考: doc/shared/protocol.md 和 doc/shared/data-contracts.md
 *
 * @description
 * 這些資料結構在 SSE 事件和命令中共用，
 * 與後端的 Protocol 定義保持一致。
 */

import type { FlowState } from '#shared/types/flow-state'

/**
 * 玩家資訊
 */
export interface PlayerInfo {
  readonly player_id: string
  readonly player_name: string
  readonly is_ai: boolean
}

/**
 * 玩家手牌
 */
export interface PlayerHand {
  readonly player_id: string
  readonly cards: ReadonlyArray<string>
}

/**
 * 玩家獲得區
 */
export interface PlayerDepository {
  readonly player_id: string
  readonly cards: ReadonlyArray<string>
}

/**
 * 玩家分數
 */
export interface PlayerScore {
  readonly player_id: string
  readonly score: number
}

/**
 * 下一狀態（FlowState + 當前玩家）
 */
export interface NextState {
  readonly state_type: FlowState
  readonly active_player_id: string
}

/**
 * 卡片操作（打牌/翻牌的結果）
 */
export interface CardPlay {
  readonly played_card: string
  readonly matched_card: string | null
  readonly captured_cards: ReadonlyArray<string>
}

/**
 * 卡片選擇（雙重配對時的選擇結果）
 */
export interface CardSelection {
  readonly source_card: string
  readonly selected_target: string
  readonly captured_cards: ReadonlyArray<string>
}

/**
 * 役種
 */
export interface Yaku {
  readonly yaku_type: string
  readonly base_points: number
  readonly contributing_cards: ReadonlyArray<string>
}

/**
 * 役種更新
 */
export interface YakuUpdate {
  readonly newly_formed_yaku: ReadonlyArray<Yaku>
  readonly all_active_yaku: ReadonlyArray<Yaku>
}

/**
 * 分數倍率（Koi-Koi 倍率）
 */
export interface ScoreMultipliers {
  readonly player_multipliers: Record<string, number>
}

/**
 * Koi-Koi 狀態
 */
export interface KoiStatus {
  readonly player_id: string
  readonly koi_multiplier: number
  readonly times_continued: number
}

/**
 * 遊戲規則集
 */
export interface Ruleset {
  readonly target_score: number
  readonly yaku_settings: ReadonlyArray<YakuSetting>
  readonly special_rules: SpecialRules
}

/**
 * 役種設定
 */
export interface YakuSetting {
  readonly yaku_type: string
  readonly base_points: number
  readonly enabled: boolean
}

/**
 * 特殊規則
 */
export interface SpecialRules {
  readonly teshi_enabled: boolean
  readonly field_kuttsuki_enabled: boolean
}

/**
 * 役種分數（來自 Domain Layer）
 *
 * @description
 * 用於 MakeKoiKoiDecisionUseCase 和 HandleDecisionRequiredUseCase
 * 計算當前分數時使用
 */
export interface YakuScore {
  readonly yaku_type: string
  readonly base_points: number
}
