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
 * 玩家連線狀態
 *
 * @description
 * - CONNECTED: 正常連線
 * - DISCONNECTED: 斷線中（仍在遊戲中，由 AI 代行）
 * - LEFT: 已離開（主動離開，由 AI 代行）
 */
export type PlayerConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'LEFT'

/**
 * 玩家連線資訊
 */
export interface PlayerConnectionInfo {
  readonly player_id: string
  readonly status: PlayerConnectionStatus
}

/**
 * 玩家手牌
 *
 * @description
 * 設計規範（doc/shared/protocol.md）：
 * - 自己的手牌：cards 包含完整卡片 ID 陣列
 * - 對手的手牌：cards 為空陣列，card_count 包含數量
 */
export interface PlayerHand {
  readonly player_id: string
  readonly cards: ReadonlyArray<string>
  /** 手牌數量（對手時使用，自己時可省略） */
  readonly card_count?: number
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
 *
 * @description
 * - matched_cards 空陣列 = 無配對（牌留在場上）
 * - matched_cards 1 元素 = 單配對或雙配對選擇後
 * - matched_cards 3 元素 = 三重配對（場上 3 張同月份，打出第 4 張）
 */
export interface CardPlay {
  readonly played_card: string
  readonly matched_cards: ReadonlyArray<string>
}

/**
 * 卡片選擇（雙重配對時的選擇結果）
 */
export interface CardSelection {
  readonly source_card: string
  readonly selected_target: string
}

// ============================================================================
// CardPlay Helper Functions
// ============================================================================

/**
 * 從 CardPlay 推導 captured_cards
 *
 * @description
 * - 無配對（matchedCards 為空）: 返回空陣列
 * - 有配對: 返回 [playedCard, ...matchedCards]
 *
 * @param playedCard - 打出或翻出的卡片
 * @param matchedCards - 配對的場牌
 * @returns 進入獲得區的卡片清單
 */
export function deriveCapturedCards(
  playedCard: string,
  matchedCards: readonly string[]
): readonly string[] {
  return matchedCards.length > 0 ? [playedCard, ...matchedCards] : []
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
 * 分數倍率（Koi-Koi 倍率 + 7 點翻倍）
 *
 * @description
 * 計分規則：
 * 1. Koi-Koi 倍率：只要有任一方宣告過 Koi-Koi，分數就 ×2（全局共享），無論宣告幾次都只加倍一次
 * 2. 7 點翻倍：基礎分數 ≥ 7 時，最終分數再 ×2
 *
 * 最終分數 = 基礎分數 × Koi-Koi 倍率 × 7 點翻倍
 *
 * 倍率推導：koi_koi_applied ? 2 : 1
 */
export interface ScoreMultipliers {
  /** 是否有任一玩家宣告過 Koi-Koi（true = 倍率 2，false = 倍率 1） */
  readonly koi_koi_applied: boolean
  /** 是否觸發 7 點翻倍（基礎分數 ≥ 7） */
  readonly is_score_doubled: boolean
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
  readonly yaku_settings: ReadonlyArray<YakuSetting>
  readonly special_rules: SpecialRules
  /** 牌堆總數量（標準花札為 48）*/
  readonly total_deck_cards: number
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
 *
 * @description
 * - teshi: 手四（手牌有 4 張同月份） - 觸發者獲 6 分
 * - kuttsuki: 喰付（手牌有 4 對同月份，即 8 張都成對） - 觸發者獲 6 分
 * - field_teshi: 場上手四（場牌有 4 張同月份） - 流局重發
 */
export interface SpecialRules {
  readonly teshi_enabled: boolean
  readonly kuttsuki_enabled: boolean
  readonly field_teshi_enabled: boolean
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

// ============================================================================
// InitialState 相關類型（SSE-First 架構）
// ============================================================================

/**
 * InitialState 回應類型
 *
 * @description
 * SSE 連線後第一個事件的類型，用於區分不同情境：
 * - `game_waiting`: 新遊戲，等待對手加入
 * - `game_started`: 新遊戲，對手已加入，遊戲開始
 * - `snapshot`: 重連，恢復進行中的遊戲狀態
 * - `game_finished`: 重連，遊戲已結束
 * - `game_expired`: 重連，遊戲已過期
 */
export type InitialStateResponseType =
  | 'game_waiting'
  | 'game_started'
  | 'snapshot'
  | 'game_finished'
  | 'game_expired'

/**
 * 等待對手加入的資料
 *
 * @description
 * 當玩家加入新遊戲但對手尚未加入時返回。
 * 前端顯示等待畫面，等待後續 GameStarted 事件。
 */
export interface GameWaitingData {
  /** 遊戲 ID */
  readonly game_id: string
  /** 玩家 ID */
  readonly player_id: string
  /** 玩家名稱 */
  readonly player_name: string
  /** 配對超時秒數 */
  readonly timeout_seconds: number
}

/**
 * 遊戲開始的資料
 *
 * @description
 * 當雙方玩家都加入後，遊戲開始。
 * 此資料結構與 GameStartedEvent 保持一致（不含 event_id, timestamp）。
 */
export interface GameStartedData {
  /** 遊戲 ID */
  readonly game_id: string
  /** 房間類型 ID（用於 Rematch 功能） */
  readonly room_type_id: string
  /** 玩家列表 */
  readonly players: ReadonlyArray<PlayerInfo>
  /** 遊戲規則集 */
  readonly ruleset: Ruleset
  /** 先手玩家 ID */
  readonly starting_player_id: string
}
