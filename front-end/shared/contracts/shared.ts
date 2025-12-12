/**
 * 共用資料結構
 *
 * 參考: doc/shared/protocol.md 和 doc/shared/data-contracts.md
 *
 * @description
 * 這些資料結構在 SSE 事件和命令中共用，
 * 與後端的 Protocol 定義保持一致。
 */

import type { FlowState } from './flow-state'

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
  readonly total_rounds: number
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

// ============================================================================
// Snapshot API 回應類型
// ============================================================================

/**
 * Snapshot API 回應類型
 *
 * @description
 * 用於區分 Snapshot API 的不同回應情況：
 * - `snapshot`: 正常遊戲快照（記憶體中有進行中的遊戲）
 * - `game_finished`: 遊戲已結束（從資料庫恢復結果）
 * - `game_expired`: 遊戲已過期無法恢復（記憶體沒有，且 DB 記錄為進行中）
 */
export type SnapshotResponseType = 'snapshot' | 'game_finished' | 'game_expired'

/**
 * 遊戲已結束資訊
 *
 * @description
 * 當玩家離開太久，遊戲已從記憶體清除，但 DB 有結束記錄時返回。
 * 包含最終分數和勝者資訊，讓玩家可以查看結果。
 */
export interface GameFinishedInfo {
  readonly game_id: string
  readonly winner_id: string | null
  readonly final_scores: ReadonlyArray<PlayerScore>
  readonly rounds_played: number
  readonly total_rounds: number
}

/**
 * Snapshot API 回應（快照）
 */
export interface SnapshotApiResponseSnapshot {
  readonly response_type: 'snapshot'
  readonly data: import('./events').GameSnapshotRestore
}

/**
 * Snapshot API 回應（遊戲已結束）
 */
export interface SnapshotApiResponseFinished {
  readonly response_type: 'game_finished'
  readonly data: GameFinishedInfo
}

/**
 * Snapshot API 回應（遊戲已過期）
 */
export interface SnapshotApiResponseExpired {
  readonly response_type: 'game_expired'
  readonly data: null
}

/**
 * Snapshot API 統一回應類型
 *
 * @description
 * 前端根據 `response_type` 欄位決定處理方式：
 * - `snapshot`: 呼叫 HandleReconnectionUseCase 恢復遊戲狀態
 * - `game_finished`: 顯示遊戲結果畫面
 * - `game_expired`: 顯示「遊戲已過期」訊息並導航回大廳
 */
export type SnapshotApiResponse =
  | SnapshotApiResponseSnapshot
  | SnapshotApiResponseFinished
  | SnapshotApiResponseExpired
