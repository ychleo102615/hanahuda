/**
 * EventMapper - Adapter Layer
 *
 * @description
 * 將 Domain entities 轉換為 SSE events。
 * 負責處理 Domain → Shared Contracts 的轉換邏輯。
 *
 * @module server/adapters/mappers/eventMapper
 */

import { randomUUID } from 'crypto'
import type { Game, Player } from '~~/server/domain/game'
import { toSnapshot } from '~~/server/domain/game'
import type { Round } from '~~/server/domain/round'
import type {
  GameStartedEvent,
  RoundDealtEvent,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  RoundEndedEvent,
  RoundScoringData,
  RoundInstantEndData,
  GameFinishedEvent,
  GameSnapshotRestore,
  GameErrorEvent,
  RoundEndReason,
  GameEndedReason,
  GameErrorCode,
  SuggestedAction,
  PlayerInfo,
  PlayerHand,
  PlayerDepository,
  CardPlay,
  CardSelection,
  YakuUpdate,
  Yaku,
  ScoreMultipliers,
  PlayerScore,
  KoiStatus,
} from '#shared/contracts'
import { toPlayerInfo, toPlayerInfoList, createNextState, toScoreMultipliers } from './dtos'
import { gameConfig } from '~~/server/utils/config'
import type { FullEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'

/**
 * 產生 ISO 8601 格式的時間戳
 */
function createTimestamp(): string {
  return new Date().toISOString()
}

/**
 * 產生事件 ID (UUID v4)
 */
function createEventId(): string {
  return randomUUID()
}

/**
 * EventMapper
 *
 * 提供 Domain → SSE Event 的轉換方法。
 * 實作 FullEventMapperPort（Application Layer Output Port）。
 */
export class EventMapper implements FullEventMapperPort {
  /**
   * 將 Game 轉換為 GameStartedEvent
   *
   * @param game - 遊戲聚合根
   * @returns GameStartedEvent
   * @throws Error 如果 currentRound 不存在
   */
  toGameStartedEvent(game: Game): GameStartedEvent {
    if (!game.currentRound) {
      throw new Error('Cannot create GameStartedEvent: currentRound is null')
    }

    return {
      event_type: 'GameStarted',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      game_id: game.id,
      players: toPlayerInfoList(game.players),
      ruleset: game.ruleset,
      starting_player_id: game.currentRound.activePlayerId,
    }
  }

  /**
   * 將 Game 轉換為 RoundDealtEvent
   *
   * @param game - 遊戲聚合根
   * @returns RoundDealtEvent
   * @throws Error 如果 currentRound 不存在
   */
  toRoundDealtEvent(game: Game): RoundDealtEvent {
    if (!game.currentRound) {
      throw new Error('Cannot create RoundDealtEvent: currentRound is null')
    }

    const round = game.currentRound
    const hands = this.toPlayerHands(round)
    const nextState = createNextState(round.flowState, round.activePlayerId)

    return {
      event_type: 'RoundDealt',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      current_round: game.roundsPlayed + 1,
      dealer_id: round.dealerId,
      field: [...round.field],
      hands,
      deck_remaining: round.deck.length,
      next_state: nextState,
      timeout_seconds: gameConfig.turn_timeout_seconds,
    }
  }

  /**
   * 將 Game 轉換為特殊規則觸發時的 RoundDealtEvent
   *
   * @description
   * 特殊規則（手四、喰付、場上手四）觸發時使用。
   * - next_state 為 null（無需玩家操作）
   * - timeout_seconds 為 0
   *
   * @param game - 遊戲聚合根
   * @returns RoundDealtEvent（next_state = null, timeout_seconds = 0）
   * @throws Error 如果 currentRound 不存在
   */
  toRoundDealtEventForSpecialRule(game: Game): RoundDealtEvent {
    if (!game.currentRound) {
      throw new Error('Cannot create RoundDealtEvent for special rule: currentRound is null')
    }

    const round = game.currentRound
    const hands = this.toPlayerHands(round)

    return {
      event_type: 'RoundDealt',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      current_round: game.roundsPlayed + 1,
      dealer_id: round.dealerId,
      field: [...round.field],
      hands,
      deck_remaining: round.deck.length,
      next_state: null,
      timeout_seconds: 0,
    }
  }

  /**
   * 從 Round 提取玩家手牌資訊
   *
   * @param round - 局狀態
   * @returns PlayerHand 陣列
   */
  private toPlayerHands(round: Round): PlayerHand[] {
    return round.playerStates.map((playerState) => ({
      player_id: playerState.playerId,
      cards: [...playerState.hand],
    }))
  }

  // ============================================================
  // Turn Events
  // ============================================================

  /**
   * 將回合完成資訊轉換為 TurnCompletedEvent
   *
   * @param game - 遊戲聚合根
   * @param playerId - 玩家 ID
   * @param handCardPlay - 手牌操作結果
   * @param drawCardPlay - 翻牌操作結果
   * @returns TurnCompletedEvent
   */
  toTurnCompletedEvent(
    game: Game,
    playerId: string,
    handCardPlay: CardPlay,
    drawCardPlay: CardPlay
  ): TurnCompletedEvent {
    if (!game.currentRound) {
      throw new Error('Cannot create TurnCompletedEvent: currentRound is null')
    }

    const round = game.currentRound
    const nextState = createNextState(round.flowState, round.activePlayerId)

    return {
      event_type: 'TurnCompleted',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      player_id: playerId,
      hand_card_play: {
        played_card: handCardPlay.played_card,
        matched_card: handCardPlay.matched_card,
        captured_cards: [...handCardPlay.captured_cards],
      },
      draw_card_play: {
        played_card: drawCardPlay.played_card,
        matched_card: drawCardPlay.matched_card,
        captured_cards: [...drawCardPlay.captured_cards],
      },
      deck_remaining: round.deck.length,
      next_state: nextState,
      timeout_seconds: gameConfig.turn_timeout_seconds,
    }
  }

  /**
   * 將選擇需求轉換為 SelectionRequiredEvent
   *
   * @param game - 遊戲聚合根
   * @param playerId - 玩家 ID
   * @param handCardPlay - 手牌操作結果
   * @param drawnCard - 翻出的卡片
   * @param possibleTargets - 可選配對目標
   * @returns SelectionRequiredEvent
   */
  toSelectionRequiredEvent(
    game: Game,
    playerId: string,
    handCardPlay: CardPlay,
    drawnCard: string,
    possibleTargets: readonly string[]
  ): SelectionRequiredEvent {
    if (!game.currentRound) {
      throw new Error('Cannot create SelectionRequiredEvent: currentRound is null')
    }

    return {
      event_type: 'SelectionRequired',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      player_id: playerId,
      hand_card_play: {
        played_card: handCardPlay.played_card,
        matched_card: handCardPlay.matched_card,
        captured_cards: [...handCardPlay.captured_cards],
      },
      drawn_card: drawnCard,
      possible_targets: [...possibleTargets],
      deck_remaining: game.currentRound.deck.length,
      timeout_seconds: gameConfig.turn_timeout_seconds,
    }
  }

  /**
   * 將選擇後的進度轉換為 TurnProgressAfterSelectionEvent
   *
   * @param game - 遊戲聚合根
   * @param playerId - 玩家 ID
   * @param selection - 選擇結果
   * @param drawCardPlay - 翻牌操作結果
   * @param yakuUpdate - 役種更新（可選）
   * @returns TurnProgressAfterSelectionEvent
   */
  toTurnProgressAfterSelectionEvent(
    game: Game,
    playerId: string,
    selection: CardSelection,
    drawCardPlay: CardPlay,
    yakuUpdate: YakuUpdate | null
  ): TurnProgressAfterSelectionEvent {
    if (!game.currentRound) {
      throw new Error('Cannot create TurnProgressAfterSelectionEvent: currentRound is null')
    }

    const round = game.currentRound
    const nextState = createNextState(round.flowState, round.activePlayerId)

    return {
      event_type: 'TurnProgressAfterSelection',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      player_id: playerId,
      selection: {
        source_card: selection.source_card,
        selected_target: selection.selected_target,
        captured_cards: [...selection.captured_cards],
      },
      draw_card_play: {
        played_card: drawCardPlay.played_card,
        matched_card: drawCardPlay.matched_card,
        captured_cards: [...drawCardPlay.captured_cards],
      },
      yaku_update: yakuUpdate
        ? {
            newly_formed_yaku: yakuUpdate.newly_formed_yaku.map(y => ({
              yaku_type: y.yaku_type,
              base_points: y.base_points,
              contributing_cards: [...y.contributing_cards],
            })),
            all_active_yaku: yakuUpdate.all_active_yaku.map(y => ({
              yaku_type: y.yaku_type,
              base_points: y.base_points,
              contributing_cards: [...y.contributing_cards],
            })),
          }
        : null,
      deck_remaining: round.deck.length,
      next_state: nextState,
      timeout_seconds: gameConfig.turn_timeout_seconds,
    }
  }

  // ============================================================
  // Decision Events
  // ============================================================

  /**
   * 將決策需求轉換為 DecisionRequiredEvent
   *
   * @param game - 遊戲聚合根
   * @param playerId - 玩家 ID
   * @param handCardPlay - 手牌操作結果（可選）
   * @param drawCardPlay - 翻牌操作結果（可選）
   * @param yakuUpdate - 役種更新
   * @returns DecisionRequiredEvent
   */
  toDecisionRequiredEvent(
    game: Game,
    playerId: string,
    handCardPlay: CardPlay | null,
    drawCardPlay: CardPlay | null,
    yakuUpdate: YakuUpdate
  ): DecisionRequiredEvent {
    if (!game.currentRound) {
      throw new Error('Cannot create DecisionRequiredEvent: currentRound is null')
    }

    const multipliers = toScoreMultipliers(game.currentRound.koiStatuses)

    return {
      event_type: 'DecisionRequired',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      player_id: playerId,
      hand_card_play: handCardPlay
        ? {
            played_card: handCardPlay.played_card,
            matched_card: handCardPlay.matched_card,
            captured_cards: [...handCardPlay.captured_cards],
          }
        : null,
      draw_card_play: drawCardPlay
        ? {
            played_card: drawCardPlay.played_card,
            matched_card: drawCardPlay.matched_card,
            captured_cards: [...drawCardPlay.captured_cards],
          }
        : null,
      yaku_update: {
        newly_formed_yaku: yakuUpdate.newly_formed_yaku.map(y => ({
          yaku_type: y.yaku_type,
          base_points: y.base_points,
          contributing_cards: [...y.contributing_cards],
        })),
        all_active_yaku: yakuUpdate.all_active_yaku.map(y => ({
          yaku_type: y.yaku_type,
          base_points: y.base_points,
          contributing_cards: [...y.contributing_cards],
        })),
      },
      current_multipliers: multipliers,
      deck_remaining: game.currentRound.deck.length,
      timeout_seconds: gameConfig.turn_timeout_seconds,
    }
  }

  /**
   * 將決策結果轉換為 DecisionMadeEvent
   *
   * @param game - 遊戲聚合根
   * @param playerId - 玩家 ID
   * @param decision - 決策
   * @param multipliers - 倍率資訊
   * @returns DecisionMadeEvent
   */
  toDecisionMadeEvent(
    game: Game,
    playerId: string,
    decision: 'KOI_KOI' | 'END_ROUND',
    multipliers: ScoreMultipliers
  ): DecisionMadeEvent {
    if (!game.currentRound) {
      throw new Error('Cannot create DecisionMadeEvent: currentRound is null')
    }

    const round = game.currentRound
    const nextState = createNextState(round.flowState, round.activePlayerId)

    return {
      event_type: 'DecisionMade',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      player_id: playerId,
      decision,
      updated_multipliers: {
        player_multipliers: { ...multipliers.player_multipliers },
        koi_koi_applied: multipliers.koi_koi_applied,
      },
      next_state: nextState,
      timeout_seconds: gameConfig.turn_timeout_seconds,
    }
  }

  // ============================================================
  // Round End Events
  // ============================================================

  /**
   * 將回合結束轉換為統一的 RoundEndedEvent
   *
   * @description
   * 統一的回合結束事件，取代 RoundScoredEvent、RoundDrawnEvent、RoundEndedInstantlyEvent。
   *
   * @param reason - 回合結束原因
   * @param updatedScores - 更新後的累積分數
   * @param scoringData - 計分資料（僅當 reason === 'SCORED' 時需要）
   * @param instantData - 特殊結束資料（僅當 reason 為 INSTANT_* 時需要）
   * @param timeoutSeconds - 後端倒數秒數（無值時不包含此欄位）
   * @param requireContinueConfirmation - 是否需要確認繼續遊戲
   * @returns RoundEndedEvent
   */
  toRoundEndedEvent(
    reason: RoundEndReason,
    updatedScores: readonly PlayerScore[],
    scoringData?: RoundScoringData,
    instantData?: RoundInstantEndData,
    timeoutSeconds?: number,
    requireContinueConfirmation = false
  ): RoundEndedEvent {
    const baseEvent: RoundEndedEvent = {
      event_type: 'RoundEnded',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      reason,
      updated_total_scores: updatedScores.map(s => ({
        player_id: s.player_id,
        score: s.score,
      })),
      require_continue_confirmation: requireContinueConfirmation,
    }

    // 根據 reason 決定要包含哪些資料
    let event = baseEvent

    if (scoringData) {
      event = { ...event, scoring_data: scoringData }
    }

    if (instantData) {
      event = { ...event, instant_data: instantData }
    }

    if (timeoutSeconds !== undefined) {
      event = { ...event, timeout_seconds: timeoutSeconds }
    }

    return event
  }

  /**
   * 將遊戲結束轉換為 GameFinishedEvent
   *
   * @param winnerId - 勝者 ID（平局時為 null）
   * @param finalScores - 最終分數
   * @param reason - 遊戲結束原因
   * @returns GameFinishedEvent
   */
  toGameFinishedEvent(
    winnerId: string | null,
    finalScores: readonly PlayerScore[],
    reason: GameEndedReason
  ): GameFinishedEvent {
    return {
      event_type: 'GameFinished',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      winner_id: winnerId,
      final_scores: finalScores.map(s => ({
        player_id: s.player_id,
        score: s.score,
      })),
      reason,
    }
  }

  // ============================================================
  // Reconnection Events (Phase 7)
  // ============================================================

  /**
   * 將遊戲狀態轉換為 GameSnapshotRestore 事件
   *
   * @description
   * 用於斷線重連時發送完整遊戲狀態。
   * 使用 Domain Layer 的 toSnapshot() 取得快照資料。
   *
   * @param game - 遊戲聚合根
   * @param remainingSeconds - 操作剩餘秒數（可選，預設使用 config 值）
   * @returns GameSnapshotRestore 事件
   * @throws Error 如果遊戲無法建立快照（currentRound 為 null）
   */
  toGameSnapshotRestoreEvent(game: Game, remainingSeconds?: number): GameSnapshotRestore {
    const snapshot = toSnapshot(game)

    if (!snapshot) {
      throw new Error('Cannot create GameSnapshotRestore: unable to create snapshot (currentRound is null)')
    }

    const baseEvent: GameSnapshotRestore = {
      event_type: 'GameSnapshotRestore',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      game_id: snapshot.game_id,
      players: snapshot.players.map(p => ({
        player_id: p.player_id,
        player_name: p.player_name,
        is_ai: p.is_ai,
      })),
      ruleset: snapshot.ruleset,
      field_cards: [...snapshot.field_cards],
      deck_remaining: snapshot.deck_remaining,
      player_hands: snapshot.player_hands.map(h => ({
        player_id: h.player_id,
        cards: [...h.cards],
      })),
      player_depositories: snapshot.player_depositories.map(d => ({
        player_id: d.player_id,
        cards: [...d.cards],
      })),
      player_scores: snapshot.player_scores.map(s => ({
        player_id: s.player_id,
        score: s.score,
      })),
      current_flow_stage: snapshot.current_flow_stage,
      active_player_id: snapshot.active_player_id,
      current_round: snapshot.current_round,
      dealer_id: snapshot.dealer_id,
      koi_statuses: snapshot.koi_statuses.map(ks => ({
        player_id: ks.player_id,
        koi_multiplier: ks.koi_multiplier,
        times_continued: ks.times_continued,
      })),
      timeout_seconds: remainingSeconds ?? gameConfig.turn_timeout_seconds,
    }

    // 加入可選的上下文欄位
    if (snapshot.selection_context) {
      return {
        ...baseEvent,
        selection_context: {
          drawn_card: snapshot.selection_context.drawn_card,
          possible_targets: [...snapshot.selection_context.possible_targets],
        },
      }
    }

    if (snapshot.decision_context) {
      return {
        ...baseEvent,
        decision_context: {
          all_active_yaku: snapshot.decision_context.all_active_yaku.map(y => ({
            yaku_type: y.yaku_type,
            base_points: y.base_points,
            contributing_cards: [...y.contributing_cards],
          })),
          current_multipliers: {
            player_multipliers: { ...snapshot.decision_context.current_multipliers.player_multipliers },
            koi_koi_applied: snapshot.decision_context.current_multipliers.koi_koi_applied,
          },
        },
      }
    }

    if (snapshot.round_end_info) {
      return {
        ...baseEvent,
        round_end_info: {
          reason: snapshot.round_end_info.reason,
          winner_id: snapshot.round_end_info.winner_id,
          awarded_points: snapshot.round_end_info.awarded_points,
          scoring_data: snapshot.round_end_info.scoring_data,
          instant_data: snapshot.round_end_info.instant_data,
          timeout_remaining_seconds: snapshot.round_end_info.timeout_remaining_seconds,
        },
      }
    }

    return baseEvent
  }

  /**
   * 建立 GameErrorEvent
   *
   * @description
   * 用於遊戲層級錯誤（如配對超時、對手斷線等）。
   *
   * @param errorCode - 錯誤代碼
   * @param message - 錯誤訊息
   * @param recoverable - 是否可恢復
   * @param suggestedAction - 建議操作（可選）
   * @returns GameErrorEvent
   */
  toGameErrorEvent(
    errorCode: GameErrorCode,
    message: string,
    recoverable: boolean,
    suggestedAction?: SuggestedAction
  ): GameErrorEvent {
    const event: GameErrorEvent = {
      event_type: 'GameError',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      error_code: errorCode,
      message,
      recoverable,
    }

    if (suggestedAction) {
      return { ...event, suggested_action: suggestedAction }
    }

    return event
  }
}

/**
 * EventMapper 單例
 */
export const eventMapper = new EventMapper()
