/**
 * 遊戲事件型別定義
 *
 * 參考: doc/shared/protocol.md#Events
 *
 * @description
 * 這些事件由伺服器通過 WebSocket 推送到客戶端，
 * 由對應的 Handle*UseCase 處理。
 */

// ============================================================================
// Event Type Constants (SSOT)
// ============================================================================

/**
 * 遊戲事件類型常數（Single Source of Truth）
 *
 * @description
 * 所有事件類型的唯一定義處。
 * 使用 `as const` 確保型別推導為字面量型別。
 *
 * 使用方式：
 * - 型別定義: `event_type: typeof EVENT_TYPES.GameStarted`
 * - 執行期比對: `if (event.event_type === EVENT_TYPES.GameStarted)`
 */
export const EVENT_TYPES = {
  // Game Lifecycle
  InitialState: 'InitialState',
  GameStarted: 'GameStarted',
  GameFinished: 'GameFinished',

  // Round Events
  RoundDealt: 'RoundDealt',
  RoundEnded: 'RoundEnded',

  // Turn Events
  TurnCompleted: 'TurnCompleted',
  SelectionRequired: 'SelectionRequired',
  TurnProgressAfterSelection: 'TurnProgressAfterSelection',
  DecisionRequired: 'DecisionRequired',
  DecisionMade: 'DecisionMade',

  // Error Events
  TurnError: 'TurnError',
  GameError: 'GameError',

  // Snapshot
  GameSnapshotRestore: 'GameSnapshotRestore',
} as const

/**
 * 事件類型的值型別（從常數推導）
 */
export type EventTypeValue = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

// ============================================================================
// Event Interfaces
// ============================================================================

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
  InitialStateResponseType,
  GameWaitingData,
  GameStartedData,
  GameFinishedInfo,
} from './shared'
import type { FlowState } from './flow-state'
import type { ErrorCode, GameErrorCode, SuggestedAction, RoundEndReason, GameEndedReason } from './errors'

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
 * total_rounds 已包含在 ruleset 中。
 */
export interface GameStartedEvent extends BaseEvent {
  readonly event_type: typeof EVENT_TYPES.GameStarted
  readonly game_id: string
  /** 房間類型 ID（用於 Rematch 功能） */
  readonly room_type_id: string
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
 * total_rounds 可從 GameStarted 事件的 ruleset 取得。
 *
 * 當特殊規則觸發（手四、喰付、場上手四）時：
 * - next_state 為 null（無需玩家操作）
 * - timeout_seconds 為 0
 */
export interface RoundDealtEvent extends BaseEvent {
  readonly event_type: typeof EVENT_TYPES.RoundDealt
  readonly current_round: number
  readonly dealer_id: string
  readonly field: ReadonlyArray<string>
  readonly hands: ReadonlyArray<PlayerHand>
  readonly deck_remaining: number
  /** 下一步狀態（特殊規則觸發時為 null） */
  readonly next_state: NextState | null
  readonly timeout_seconds: number
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
  readonly event_type: typeof EVENT_TYPES.TurnCompleted
  readonly player_id: string
  readonly hand_card_play: CardPlay
  readonly draw_card_play: CardPlay
  readonly deck_remaining: number
  readonly next_state: NextState
  readonly timeout_seconds: number
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
  readonly event_type: typeof EVENT_TYPES.SelectionRequired
  readonly player_id: string
  readonly hand_card_play: CardPlay
  readonly drawn_card: string
  readonly possible_targets: ReadonlyArray<string>
  readonly deck_remaining: number
  readonly timeout_seconds: number
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
  readonly event_type: typeof EVENT_TYPES.TurnProgressAfterSelection
  readonly player_id: string
  readonly selection: CardSelection
  readonly draw_card_play: CardPlay
  readonly yaku_update: YakuUpdate | null
  readonly deck_remaining: number
  readonly next_state: NextState
  readonly timeout_seconds: number
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
  readonly event_type: typeof EVENT_TYPES.DecisionRequired
  readonly player_id: string
  readonly hand_card_play: CardPlay | null
  readonly draw_card_play: CardPlay | null
  readonly yaku_update: YakuUpdate
  readonly current_multipliers: ScoreMultipliers
  readonly deck_remaining: number
  readonly timeout_seconds: number
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
  readonly event_type: typeof EVENT_TYPES.DecisionMade
  readonly player_id: string
  readonly decision: 'KOI_KOI' | 'END_ROUND'
  readonly updated_multipliers: ScoreMultipliers
  readonly next_state: NextState
  readonly timeout_seconds: number
}

// ============================================================================
// RoundEnded 統一事件
// ============================================================================

/**
 * 計分資料（僅當 reason === 'SCORED' 時有值）
 */
export interface RoundScoringData {
  readonly winner_id: string
  readonly yaku_list: ReadonlyArray<Yaku>
  readonly base_score: number
  readonly final_score: number
  readonly multipliers: ScoreMultipliers
}

/**
 * 特殊結束資料（僅當 reason 為 INSTANT_* 時有值）
 */
export interface RoundInstantEndData {
  readonly winner_id: string | null
  readonly awarded_points: number
}

/**
 * RoundEnded 統一事件
 *
 * @description
 * 統一的回合結束事件，取代 RoundScoredEvent、RoundDrawnEvent、RoundEndedInstantlyEvent。
 * 根據 reason 欄位區分不同的結束類型，並提供對應的資料。
 *
 * timeout_seconds:
 * - 有值時：後端會在此秒數後自動推進到下一局
 * - 無值時：這是最後一回合，玩家需手動關閉面板
 */
export interface RoundEndedEvent extends BaseEvent {
  readonly event_type: typeof EVENT_TYPES.RoundEnded
  /** 回合結束原因 */
  readonly reason: RoundEndReason
  /** 更新後的累積分數（所有情況都有） */
  readonly updated_total_scores: ReadonlyArray<PlayerScore>
  /** 計分資料（僅當 reason === 'SCORED' 時有值） */
  readonly scoring_data?: RoundScoringData
  /** 特殊結束資料（僅當 reason 為 INSTANT_* 時有值） */
  readonly instant_data?: RoundInstantEndData
  /** 後端倒數秒數（僅非最後回合時提供） */
  readonly timeout_seconds?: number
  /** 是否需要確認繼續遊戲（閒置超時後設為 true） */
  readonly require_continue_confirmation: boolean
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
  readonly event_type: typeof EVENT_TYPES.GameFinished
  /** 勝者 ID（平局時為 null） */
  readonly winner_id: string | null
  readonly final_scores: ReadonlyArray<PlayerScore>
  /** 遊戲結束原因 */
  readonly reason: GameEndedReason
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
  readonly event_type: typeof EVENT_TYPES.TurnError
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
  readonly event_type: typeof EVENT_TYPES.GameError

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
 * AWAITING_SELECTION 狀態的上下文
 *
 * @description
 * 重連時恢復選擇面板所需的資訊
 */
export interface SelectionContext {
  /** 翻出的卡片 */
  readonly drawn_card: string
  /** 可選配對目標 */
  readonly possible_targets: ReadonlyArray<string>
}

/**
 * AWAITING_DECISION 狀態的上下文
 *
 * @description
 * 重連時恢復決策面板所需的資訊
 */
export interface DecisionContext {
  /** 所有有效役種 */
  readonly all_active_yaku: ReadonlyArray<Yaku>
  /** 目前的分數倍率 */
  readonly current_multipliers: ScoreMultipliers
}

/**
 * 回合結束資訊（用於 ROUND_ENDED 狀態的快照恢復）
 *
 * @description
 * 當 current_flow_stage === 'ROUND_ENDED' 時，此資訊用於恢復 RoundEndedModal 的顯示。
 */
export interface RoundEndInfo {
  /** 結束原因 */
  readonly reason: RoundEndReason
  /** 獲勝者 ID（流局時為 null） */
  readonly winner_id: string | null
  /** 獲得分數 */
  readonly awarded_points: number
  /** 計分資料（僅當 reason === 'SCORED' 時有值） */
  readonly scoring_data?: RoundScoringData
  /** 特殊規則資料（僅當 reason 為 INSTANT_* 時有值） */
  readonly instant_data?: RoundInstantEndData
  /** 剩餘倒數秒數（用於恢復前端倒數計時器） */
  readonly timeout_remaining_seconds: number
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
  readonly event_type: typeof EVENT_TYPES.GameSnapshotRestore
  readonly game_id: string
  /** 房間類型 ID（用於 Rematch 功能） */
  readonly room_type_id: string
  readonly players: ReadonlyArray<PlayerInfo>
  readonly ruleset: Ruleset
  readonly field_cards: ReadonlyArray<string>
  readonly deck_remaining: number
  readonly player_hands: ReadonlyArray<PlayerHand>
  readonly player_depositories: ReadonlyArray<PlayerDepository>
  readonly player_scores: ReadonlyArray<PlayerScore>
  readonly current_flow_stage: FlowState
  readonly active_player_id: string
  /** 目前局數（從 1 開始） */
  readonly current_round: number
  /** 目前莊家 ID */
  readonly dealer_id: string
  readonly koi_statuses: ReadonlyArray<KoiStatus>
  readonly timeout_seconds: number
  /** AWAITING_SELECTION 時的選擇上下文（可選） */
  readonly selection_context?: SelectionContext
  /** AWAITING_DECISION 時的決策上下文（可選） */
  readonly decision_context?: DecisionContext
  /** ROUND_ENDED 時的結算資訊（可選） */
  readonly round_end_info?: RoundEndInfo
}

// ============================================================================
// InitialState 事件（Gateway 架構）
// ============================================================================

/**
 * InitialState 事件的資料型別（根據 response_type 不同）
 */
export type InitialStateData =
  | GameWaitingData
  | GameStartedData
  | GameSnapshotRestore
  | GameFinishedInfo
  | null

/**
 * InitialState 事件
 *
 * @description
 * WebSocket 連線後第一個推送的事件，包含完整的初始狀態。
 * 統一處理新遊戲加入和斷線重連的情境。
 *
 * 前端根據 response_type 決定處理方式：
 * - `game_waiting`: 顯示等待對手畫面
 * - `game_started`: 設定初始狀態，準備接收 RoundDealt
 * - `snapshot`: 恢復進行中的遊戲狀態（無動畫）
 * - `game_finished`: 顯示遊戲結果，導航回大廳
 * - `game_expired`: 顯示錯誤訊息，導航回大廳
 */
export interface InitialStateEvent extends BaseEvent {
  readonly event_type: typeof EVENT_TYPES.InitialState
  /** 回應類型，決定 data 的型別 */
  readonly response_type: InitialStateResponseType
  /** 遊戲 ID */
  readonly game_id: string
  /** 玩家 ID（發出此請求的玩家） */
  readonly player_id: string
  /**
   * 事件資料
   *
   * 根據 response_type 的不同：
   * - game_waiting: GameWaitingData
   * - game_started: GameStartedData
   * - snapshot: GameSnapshotRestore
   * - game_finished: GameFinishedInfo
   * - game_expired: null
   */
  readonly data: InitialStateData
}

/**
 * 所有遊戲事件的聯合型別
 */
export type GameEvent =
  | InitialStateEvent
  | GameStartedEvent
  | RoundDealtEvent
  | TurnCompletedEvent
  | SelectionRequiredEvent
  | TurnProgressAfterSelectionEvent
  | DecisionRequiredEvent
  | DecisionMadeEvent
  | RoundEndedEvent
  | GameFinishedEvent
  | TurnErrorEvent
  | GameErrorEvent
  | GameSnapshotRestore

/**
 * 遊戲事件類型常數陣列（從 EVENT_TYPES 推導）
 *
 * @description
 * 所有 WebSocket 推送事件的類型列表。
 * 用於客戶端註冊事件監聽器。
 */
export const GAME_EVENT_TYPES = [
  EVENT_TYPES.InitialState,
  EVENT_TYPES.GameStarted,
  EVENT_TYPES.RoundDealt,
  EVENT_TYPES.TurnCompleted,
  EVENT_TYPES.SelectionRequired,
  EVENT_TYPES.TurnProgressAfterSelection,
  EVENT_TYPES.DecisionRequired,
  EVENT_TYPES.DecisionMade,
  EVENT_TYPES.RoundEnded,
  EVENT_TYPES.GameFinished,
  EVENT_TYPES.TurnError,
  EVENT_TYPES.GameError,
  EVENT_TYPES.GameSnapshotRestore,
] as const

/**
 * 遊戲事件類型（從常數陣列衍生）
 */
export type GameEventType = (typeof GAME_EVENT_TYPES)[number]

/**
 * @deprecated 請使用 GAME_EVENT_TYPES
 */
export const SSE_EVENT_TYPES = GAME_EVENT_TYPES

/**
 * @deprecated 請使用 GameEventType
 */
export type SSEEventType = GameEventType
