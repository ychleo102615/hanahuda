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
import type { ErrorCode, GameErrorCode, SuggestedAction, RoundEndReason } from './errors'

/**
 * 基礎事件介面
 */
export interface BaseEvent {
  readonly event_type: string
  readonly event_id: string
  readonly timestamp: string
}

/**
 * GameStarted 事件
 *
 * 參考: doc/shared/protocol.md#GameStarted
 *
 * @description
 * 遊戲初始化完成，包含玩家資訊和遊戲規則集。
 */
export interface GameStartedEvent extends BaseEvent {
  readonly event_type: 'GameStarted'
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
export interface RoundDealtEvent extends BaseEvent {
  readonly event_type: 'RoundDealt'
  readonly dealer_id: string
  readonly field: ReadonlyArray<string>
  readonly hands: ReadonlyArray<PlayerHand>
  readonly deck_remaining: number
  readonly next_state: NextState
  readonly action_timeout_seconds: number
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
export interface TurnCompletedEvent extends BaseEvent {
  readonly event_type: 'TurnCompleted'
  readonly player_id: string
  readonly hand_card_play: CardPlay
  readonly draw_card_play: CardPlay
  readonly deck_remaining: number
  readonly next_state: NextState
  readonly action_timeout_seconds: number
}

/**
 * SelectionRequired 事件
 *
 * 參考: doc/shared/protocol.md#SelectionRequired
 *
 * @description
 * 翻牌時出現雙重配對，需要玩家選擇配對目標。
 */
export interface SelectionRequiredEvent extends BaseEvent {
  readonly event_type: 'SelectionRequired'
  readonly player_id: string
  readonly hand_card_play: CardPlay
  readonly drawn_card: string
  readonly possible_targets: ReadonlyArray<string>
  readonly deck_remaining: number
  readonly action_timeout_seconds: number
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
export interface TurnProgressAfterSelectionEvent extends BaseEvent {
  readonly event_type: 'TurnProgressAfterSelection'
  readonly player_id: string
  readonly selection: CardSelection
  readonly draw_card_play: CardPlay
  readonly yaku_update: YakuUpdate | null
  readonly deck_remaining: number
  readonly next_state: NextState
  readonly action_timeout_seconds: number
}

/**
 * DecisionRequired 事件
 *
 * 參考: doc/shared/protocol.md#DecisionRequired
 *
 * @description
 * 玩家形成役種，需要決策是否 Koi-Koi。
 */
export interface DecisionRequiredEvent extends BaseEvent {
  readonly event_type: 'DecisionRequired'
  readonly player_id: string
  readonly hand_card_play: CardPlay | null
  readonly draw_card_play: CardPlay | null
  readonly yaku_update: YakuUpdate
  readonly current_multipliers: ScoreMultipliers
  readonly deck_remaining: number
  readonly action_timeout_seconds: number
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
export interface DecisionMadeEvent extends BaseEvent {
  readonly event_type: 'DecisionMade'
  readonly player_id: string
  readonly decision: 'KOI_KOI' | 'END_ROUND'
  readonly updated_multipliers: ScoreMultipliers
  readonly next_state: NextState
  readonly action_timeout_seconds: number
}

/**
 * RoundScored 事件
 *
 * 參考: doc/shared/protocol.md#RoundScored
 *
 * @description
 * 局結束計分，包含勝者、役種列表、倍率和最終得分。
 */
export interface RoundScoredEvent extends BaseEvent {
  readonly event_type: 'RoundScored'
  readonly winner_id: string
  readonly yaku_list: ReadonlyArray<Yaku>
  readonly base_score: number
  readonly final_score: number
  readonly multipliers: ScoreMultipliers
  readonly updated_total_scores: ReadonlyArray<PlayerScore>
  readonly display_timeout_seconds: number
}

/**
 * RoundDrawn 事件
 *
 * 參考: doc/shared/protocol.md#RoundDrawn
 *
 * @description
 * 平局（牌堆耗盡，無人形成役種）。
 */
export interface RoundDrawnEvent extends BaseEvent {
  readonly event_type: 'RoundDrawn'
  readonly current_total_scores: ReadonlyArray<PlayerScore>
  readonly display_timeout_seconds: number
}

/**
 * RoundEndedInstantly 事件
 *
 * 參考: doc/shared/protocol.md#RoundEndedInstantly
 *
 * @description
 * 局立即結束（Teshi 或場牌流局）。
 */
export interface RoundEndedInstantlyEvent extends BaseEvent {
  readonly event_type: 'RoundEndedInstantly'
  readonly reason: RoundEndReason
  readonly winner_id: string | null
  readonly awarded_points: number
  readonly updated_total_scores: ReadonlyArray<PlayerScore>
  readonly display_timeout_seconds: number
}

/**
 * GameFinished 事件
 *
 * 參考: doc/shared/protocol.md#GameFinished
 *
 * @description
 * 遊戲結束，包含最終分數和勝者。
 */
export interface GameFinishedEvent extends BaseEvent {
  readonly event_type: 'GameFinished'
  /** 勝者 ID（平局時為 null） */
  readonly winner_id: string | null
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
export interface TurnErrorEvent extends BaseEvent {
  readonly event_type: 'TurnError'
  readonly player_id: string
  readonly error_code: ErrorCode
  readonly error_message: string
  readonly retry_allowed: boolean
}

/**
 * GameError 事件
 *
 * 參考: specs/007-lobby-settings-panel/contracts/game-error-event.md
 *
 * @description
 * 遊戲層級錯誤事件，用於處理配對超時、遊戲過期等非回合操作錯誤。
 * 與 TurnErrorEvent 的區別：
 * - TurnErrorEvent: 回合操作錯誤（如打牌無效）
 * - GameErrorEvent: 遊戲會話錯誤（如配對超時、遊戲過期）
 */
export interface GameErrorEvent extends BaseEvent {
  /** 事件類型（固定為 'GameError'） */
  readonly event_type: 'GameError'

  /**
   * 錯誤代碼
   *
   * @example
   * - MATCHMAKING_TIMEOUT: 配對超時（30 秒無配對成功）
   * - GAME_EXPIRED: 遊戲會話過期（長時間無操作）
   * - SESSION_INVALID: 會話 Token 無效
   * - OPPONENT_DISCONNECTED: 對手永久斷線
   */
  readonly error_code: GameErrorCode

  /**
   * 錯誤訊息（人類可讀）
   *
   * @example
   * 'Matchmaking timeout, please retry'
   */
  readonly message: string

  /**
   * 錯誤是否可恢復
   *
   * @description
   * - true: 使用者可重試（如配對超時）
   * - false: 不可恢復，需返回首頁（如會話無效）
   */
  readonly recoverable: boolean

  /**
   * 建議的使用者操作（可選）
   *
   * @example
   * - RETRY_MATCHMAKING: 重試配對
   * - RETURN_HOME: 返回首頁
   * - RECONNECT: 嘗試重連
   */
  readonly suggested_action?: SuggestedAction
}

/**
 * GameSnapshotRestore 快照
 *
 * 參考: doc/shared/protocol.md#GameSnapshotRestore
 *
 * @description
 * 斷線重連時的完整遊戲狀態快照。
 */
export interface GameSnapshotRestore extends BaseEvent {
  readonly event_type: 'GameSnapshotRestore'
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
  readonly action_timeout_seconds: number
}

/**
 * 所有遊戲事件的聯合型別
 */
export type GameEvent =
  | GameStartedEvent
  | RoundDealtEvent
  | TurnCompletedEvent
  | SelectionRequiredEvent
  | TurnProgressAfterSelectionEvent
  | DecisionRequiredEvent
  | DecisionMadeEvent
  | RoundScoredEvent
  | RoundDrawnEvent
  | RoundEndedInstantlyEvent
  | GameFinishedEvent
  | TurnErrorEvent
  | GameErrorEvent
  | GameSnapshotRestore
