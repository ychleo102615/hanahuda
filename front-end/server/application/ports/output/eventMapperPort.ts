/**
 * EventMapperPort - Output Port
 *
 * @description
 * 事件映射器介面。
 * 負責將 Domain entities 轉換為 SSE events。
 *
 * Adapter 實作：eventMapper
 *
 * @module server/application/ports/output/eventMapperPort
 */

import type { Game } from '~~/server/domain/game/game'
import type {
  GameStartedEvent,
  RoundDealtEvent,
  RoundDrawnEvent,
  GameSnapshotRestore,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  RoundScoredEvent,
  RoundEndedEvent,
  RoundScoringData,
  RoundInstantEndData,
  GameFinishedEvent,
  CardPlay,
  CardSelection,
  YakuUpdate,
  ScoreMultipliers,
  Yaku,
  PlayerScore,
} from '#shared/contracts'
import type { RoundEndReason, GameEndedReason } from '#shared/contracts/errors'

// ============================================================
// Base EventMapperPort
// ============================================================

/**
 * 基礎事件映射器介面
 *
 * @description
 * 將 Domain entities 轉換為 SSE events。
 * 用於 JoinGameUseCase。
 */
export interface EventMapperPort {
  /**
   * 轉換為 GameStarted 事件
   */
  toGameStartedEvent(game: Game): GameStartedEvent

  /**
   * 轉換為 RoundDealt 事件
   */
  toRoundDealtEvent(game: Game): RoundDealtEvent

  /**
   * 轉換為 GameSnapshotRestore 事件
   *
   * @param game - 遊戲聚合根
   * @param remainingSeconds - 操作剩餘秒數（可選，預設使用 config 值）
   */
  toGameSnapshotRestoreEvent(game: Game, remainingSeconds?: number): GameSnapshotRestore
}

// ============================================================
// Turn Event Mapper Port (PlayHandCardUseCase)
// ============================================================

/**
 * 回合事件映射器介面
 *
 * @description
 * 擴展 EventMapperPort 以支援回合事件。
 * 用於 PlayHandCardUseCase。
 */
export interface TurnEventMapperPort extends EventMapperPort {
  /**
   * 轉換為 TurnCompleted 事件
   */
  toTurnCompletedEvent(
    game: Game,
    playerId: string,
    handCardPlay: CardPlay,
    drawCardPlay: CardPlay
  ): TurnCompletedEvent

  /**
   * 轉換為 SelectionRequired 事件
   */
  toSelectionRequiredEvent(
    game: Game,
    playerId: string,
    handCardPlay: CardPlay,
    drawnCard: string,
    possibleTargets: readonly string[]
  ): SelectionRequiredEvent

  /**
   * 轉換為 DecisionRequired 事件
   */
  toDecisionRequiredEvent(
    game: Game,
    playerId: string,
    handCardPlay: CardPlay | null,
    drawCardPlay: CardPlay | null,
    yakuUpdate: YakuUpdate
  ): DecisionRequiredEvent

  /**
   * 轉換為 RoundDrawn 事件（流局）
   *
   * @param currentScores - 目前累積分數
   * @param displayTimeoutSeconds - 後端倒數秒數（無值時表示不自動推進）
   */
  toRoundDrawnEvent(
    currentScores: readonly PlayerScore[],
    displayTimeoutSeconds?: number
  ): RoundDrawnEvent

  /**
   * 轉換為 RoundScored 事件
   *
   * @description
   * 當最後一手牌形成役種時，直接結算（無 Koi-Koi 選擇）。
   *
   * @param displayTimeoutSeconds - 後端倒數秒數（無值時表示不自動推進）
   * @deprecated 使用 toRoundEndedEvent 替代
   */
  toRoundScoredEvent(
    game: Game,
    winnerId: string,
    yakuList: readonly Yaku[],
    baseScore: number,
    finalScore: number,
    multipliers: ScoreMultipliers,
    updatedScores: readonly PlayerScore[],
    displayTimeoutSeconds?: number
  ): RoundScoredEvent

  /**
   * 轉換為 RoundEnded 統一事件
   *
   * @description
   * 統一的回合結束事件，取代 RoundScoredEvent、RoundDrawnEvent、RoundEndedInstantlyEvent。
   *
   * @param reason - 回合結束原因
   * @param updatedScores - 更新後的累積分數
   * @param scoringData - 計分資料（僅當 reason === 'SCORED' 時需要）
   * @param instantData - 特殊結束資料（僅當 reason 為 INSTANT_* 時需要）
   * @param displayTimeoutSeconds - 後端倒數秒數（無值時表示不自動推進）
   * @param requireContinueConfirmation - 是否需要確認繼續遊戲
   */
  toRoundEndedEvent(
    reason: RoundEndReason,
    updatedScores: readonly PlayerScore[],
    scoringData?: RoundScoringData,
    instantData?: RoundInstantEndData,
    displayTimeoutSeconds?: number,
    requireContinueConfirmation?: boolean
  ): RoundEndedEvent

  /**
   * 轉換為 GameFinished 事件
   *
   * @param winnerId - 勝者 ID（平局時為 null）
   * @param finalScores - 最終分數
   * @param reason - 遊戲結束原因
   */
  toGameFinishedEvent(
    winnerId: string | null,
    finalScores: readonly PlayerScore[],
    reason: GameEndedReason
  ): GameFinishedEvent
}

// ============================================================
// Selection Event Mapper Port (SelectTargetUseCase)
// ============================================================

/**
 * 選擇事件映射器介面
 *
 * @description
 * 擴展 TurnEventMapperPort 以支援選擇完成事件。
 * 用於 SelectTargetUseCase。
 */
export interface SelectionEventMapperPort extends TurnEventMapperPort {
  /**
   * 轉換為 TurnProgressAfterSelection 事件
   */
  toTurnProgressAfterSelectionEvent(
    game: Game,
    playerId: string,
    selection: CardSelection,
    drawCardPlay: CardPlay,
    yakuUpdate: YakuUpdate | null
  ): TurnProgressAfterSelectionEvent
}

// ============================================================
// Decision Event Mapper Port (MakeDecisionUseCase)
// ============================================================

/**
 * 決策事件映射器介面
 *
 * @description
 * 擴展 EventMapperPort 以支援決策事件。
 * 用於 MakeDecisionUseCase。
 */
export interface DecisionEventMapperPort extends EventMapperPort {
  /**
   * 轉換為 DecisionMade 事件
   */
  toDecisionMadeEvent(
    game: Game,
    playerId: string,
    decision: 'KOI_KOI' | 'END_ROUND',
    multipliers: ScoreMultipliers
  ): DecisionMadeEvent

  /**
   * 轉換為 RoundScored 事件
   *
   * @param displayTimeoutSeconds - 後端倒數秒數（無值時表示不自動推進）
   * @deprecated 使用 toRoundEndedEvent 替代
   */
  toRoundScoredEvent(
    game: Game,
    winnerId: string,
    yakuList: readonly Yaku[],
    baseScore: number,
    finalScore: number,
    multipliers: ScoreMultipliers,
    updatedScores: readonly PlayerScore[],
    displayTimeoutSeconds?: number
  ): RoundScoredEvent

  /**
   * 轉換為 RoundDrawn 事件（流局）
   *
   * @description
   * 當玩家選擇 KOI_KOI 但雙方手牌都空了，需要發送流局事件。
   *
   * @param currentScores - 目前累積分數
   * @param displayTimeoutSeconds - 後端倒數秒數（無值時表示不自動推進）
   * @deprecated 使用 toRoundEndedEvent 替代
   */
  toRoundDrawnEvent(
    currentScores: readonly PlayerScore[],
    displayTimeoutSeconds?: number
  ): RoundDrawnEvent

  /**
   * 轉換為 RoundEnded 統一事件
   *
   * @description
   * 統一的回合結束事件，取代 RoundScoredEvent、RoundDrawnEvent、RoundEndedInstantlyEvent。
   */
  toRoundEndedEvent(
    reason: RoundEndReason,
    updatedScores: readonly PlayerScore[],
    scoringData?: RoundScoringData,
    instantData?: RoundInstantEndData,
    displayTimeoutSeconds?: number,
    requireContinueConfirmation?: boolean
  ): RoundEndedEvent

  /**
   * 轉換為 GameFinished 事件
   *
   * @param winnerId - 勝者 ID（平局時為 null）
   * @param finalScores - 最終分數
   * @param reason - 遊戲結束原因
   */
  toGameFinishedEvent(
    winnerId: string | null,
    finalScores: readonly PlayerScore[],
    reason: GameEndedReason
  ): GameFinishedEvent
}

// ============================================================
// Leave Game Event Mapper Port (LeaveGameUseCase)
// ============================================================

/**
 * 離開遊戲事件映射器介面
 *
 * @description
 * 用於 LeaveGameUseCase。
 */
export interface LeaveGameEventMapperPort {
  /**
   * 轉換為 GameFinished 事件
   *
   * @param winnerId - 勝者 ID（平局時為 null）
   * @param finalScores - 最終分數
   * @param reason - 遊戲結束原因
   */
  toGameFinishedEvent(
    winnerId: string | null,
    finalScores: readonly PlayerScore[],
    reason: GameEndedReason
  ): GameFinishedEvent
}

// ============================================================
// Full Event Mapper Port (for EventMapper implementation)
// ============================================================

/**
 * 完整事件映射器介面
 *
 * @description
 * 包含所有事件映射方法的介面。
 * EventMapper adapter 應實作此介面。
 */
export interface FullEventMapperPort
  extends SelectionEventMapperPort,
    DecisionEventMapperPort,
    LeaveGameEventMapperPort {}
