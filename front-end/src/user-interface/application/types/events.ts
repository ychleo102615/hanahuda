/**
 * SSE 事件型別定義
 *
 * 參考: doc/shared/protocol.md#Events
 *
 * @description
 * 這些事件由伺服器通過 SSE 推送到客戶端，
 * 由對應的 Handle*UseCase 處理。
 */

import type {
  PlayerInfo,
  PlayerHand,
  PlayerDepository,
  PlayerScore,
  NextState,
  CardPlay,
  CardSelection,
  Yaku,
  YakuUpdate,
  ScoreMultipliers,
  KoiStatus,
  Ruleset,
} from './shared'
import type { FlowState } from './flow-state'
import type { ErrorCode, RoundEndReason } from './errors'

/**
 * GameStarted 事件
 *
 * 參考: doc/shared/protocol.md#GameStarted
 *
 * @description
 * 遊戲初始化完成，包含玩家資訊和遊戲規則集。
 */
export interface GameStartedEvent {
  readonly event_type: 'GameStarted'
  readonly event_id: string
  readonly timestamp: string
  readonly game_id: string
  readonly players: ReadonlyArray<PlayerInfo>
  readonly ruleset: Ruleset
  readonly starting_player_id: string
}

/**
 * RoundDealt 事件
 *
 * 參考: doc/shared/protocol.md#RoundDealt
 *
 * @description
 * 發牌完成，包含場牌、手牌和牌堆剩餘數量。
 */
export interface RoundDealtEvent {
  readonly event_type: 'RoundDealt'
  readonly event_id: string
  readonly timestamp: string
  readonly dealer_id: string
  readonly field: ReadonlyArray<string>
  readonly hands: ReadonlyArray<PlayerHand>
  readonly deck_remaining: number
  readonly next_state: NextState
}

/**
 * TurnCompleted 事件
 *
 * 參考: doc/shared/protocol.md#TurnCompleted
 *
 * @description
 * 回合完成（無中斷、無役種形成），
 * 包含手牌操作和翻牌操作的結果。
 *
 * 注意：此事件中手牌和翻牌操作都必須存在，不會是 null。
 * 如果役種在中途形成，會觸發 DecisionRequiredEvent 而非此事件。
 */
export interface TurnCompletedEvent {
  readonly event_type: 'TurnCompleted'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly hand_card_play: CardPlay
  readonly draw_card_play: CardPlay
  readonly deck_remaining: number
  readonly next_state: NextState
}

/**
 * SelectionRequired 事件
 *
 * 參考: doc/shared/protocol.md#SelectionRequired
 *
 * @description
 * 翻牌時出現雙重配對，需要玩家選擇配對目標。
 */
export interface SelectionRequiredEvent {
  readonly event_type: 'SelectionRequired'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly hand_card_play: CardPlay
  readonly drawn_card: string
  readonly possible_targets: ReadonlyArray<string>
  readonly deck_remaining: number
}

/**
 * TurnProgressAfterSelection 事件
 *
 * 參考: doc/shared/protocol.md#TurnProgressAfterSelection
 *
 * @description
 * 玩家選擇配對目標後，回合繼續執行。
 * 可能包含新形成的役種（yaku_update）。
 */
export interface TurnProgressAfterSelectionEvent {
  readonly event_type: 'TurnProgressAfterSelection'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly selection: CardSelection
  readonly draw_card_play: CardPlay
  readonly yaku_update: YakuUpdate | null
  readonly deck_remaining: number
  readonly next_state: NextState
}

/**
 * DecisionRequired 事件
 *
 * 參考: doc/shared/protocol.md#DecisionRequired
 *
 * @description
 * 玩家形成役種，需要決策是否 Koi-Koi。
 */
export interface DecisionRequiredEvent {
  readonly event_type: 'DecisionRequired'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly hand_card_play: CardPlay | null
  readonly draw_card_play: CardPlay | null
  readonly yaku_update: YakuUpdate
  readonly current_multipliers: ScoreMultipliers
  readonly deck_remaining: number
}

/**
 * DecisionMade 事件
 *
 * 參考: doc/shared/protocol.md#DecisionMade
 *
 * @description
 * 玩家選擇 Koi-Koi（繼續遊戲），倍率增加。
 * 若選擇 END_ROUND，則會觸發 RoundScored 事件。
 */
export interface DecisionMadeEvent {
  readonly event_type: 'DecisionMade'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly decision: 'KOI_KOI' | 'END_ROUND'
  readonly updated_multipliers: ScoreMultipliers
  readonly next_state: NextState
}

/**
 * RoundScored 事件
 *
 * 參考: doc/shared/protocol.md#RoundScored
 *
 * @description
 * 局結束計分，包含勝者、役種列表、倍率和最終得分。
 */
export interface RoundScoredEvent {
  readonly event_type: 'RoundScored'
  readonly event_id: string
  readonly timestamp: string
  readonly winner_id: string
  readonly yaku_list: ReadonlyArray<Yaku>
  readonly base_score: number
  readonly final_score: number
  readonly multipliers: ScoreMultipliers
  readonly updated_total_scores: ReadonlyArray<PlayerScore>
}

/**
 * RoundDrawn 事件
 *
 * 參考: doc/shared/protocol.md#RoundDrawn
 *
 * @description
 * 平局（牌堆耗盡，無人形成役種）。
 */
export interface RoundDrawnEvent {
  readonly event_type: 'RoundDrawn'
  readonly event_id: string
  readonly timestamp: string
  readonly current_total_scores: ReadonlyArray<PlayerScore>
}

/**
 * RoundEndedInstantly 事件
 *
 * 參考: doc/shared/protocol.md#RoundEndedInstantly
 *
 * @description
 * 局立即結束（Teshi 或場牌流局）。
 */
export interface RoundEndedInstantlyEvent {
  readonly event_type: 'RoundEndedInstantly'
  readonly event_id: string
  readonly timestamp: string
  readonly reason: RoundEndReason
  readonly winner_id: string | null
  readonly awarded_points: number
  readonly updated_total_scores: ReadonlyArray<PlayerScore>
}

/**
 * GameFinished 事件
 *
 * 參考: doc/shared/protocol.md#GameFinished
 *
 * @description
 * 遊戲結束，包含最終分數和勝者。
 */
export interface GameFinishedEvent {
  readonly event_type: 'GameFinished'
  readonly event_id: string
  readonly timestamp: string
  readonly winner_id: string
  readonly final_scores: ReadonlyArray<PlayerScore>
}

/**
 * TurnError 事件
 *
 * 參考: doc/shared/protocol.md#TurnError
 *
 * @description
 * 操作錯誤，包含錯誤代碼和是否允許重試。
 */
export interface TurnErrorEvent {
  readonly event_type: 'TurnError'
  readonly event_id: string
  readonly timestamp: string
  readonly player_id: string
  readonly error_code: ErrorCode
  readonly error_message: string
  readonly retry_allowed: boolean
}

/**
 * GameSnapshotRestore 快照
 *
 * 參考: doc/shared/protocol.md#GameSnapshotRestore
 *
 * @description
 * 斷線重連時的完整遊戲狀態快照。
 */
export interface GameSnapshotRestore {
  readonly game_id: string
  readonly players: ReadonlyArray<PlayerInfo>
  readonly ruleset: Ruleset
  readonly field_cards: ReadonlyArray<string>
  readonly deck_remaining: number
  readonly player_hands: ReadonlyArray<PlayerHand>
  readonly player_depositories: ReadonlyArray<PlayerDepository>
  readonly player_scores: ReadonlyArray<PlayerScore>
  readonly current_flow_stage: FlowState
  readonly active_player_id: string
  readonly koi_statuses: ReadonlyArray<KoiStatus>
}
