/**
 * EventMapper - Adapter Layer
 *
 * @description
 * 將 Domain entities 轉換為 SSE events。
 * 負責處理 Domain → Shared Contracts 的轉換邏輯。
 *
 * @module server/adapters/mappers/eventMapper
 */

import { randomUUID } from 'uncrypto'
import type { Game } from '~~/server/domain/game/game'
import type { Player } from '~~/server/domain/game/player'
import type { Round } from '~~/server/domain/round/round'
import type {
  GameStartedEvent,
  RoundDealtEvent,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  RoundScoredEvent,
  RoundDrawnEvent,
  RoundEndedInstantlyEvent,
  GameFinishedEvent,
  GameSnapshotRestore,
  GameErrorEvent,
  RoundEndReason,
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
import { toSnapshot } from '~~/server/domain/game/game'
import { toPlayerInfo, toPlayerInfoList, createNextState, toScoreMultipliers } from './dtos'
import { gameConfig } from '~~/server/utils/config'

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
 * 提供 Domain → SSE Event 的轉換方法
 */
export class EventMapper {
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
      dealer_id: round.dealerId,
      field: [...round.field],
      hands,
      deck_remaining: round.deck.length,
      next_state: nextState,
      action_timeout_seconds: gameConfig.action_timeout_seconds,
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
      action_timeout_seconds: gameConfig.action_timeout_seconds,
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
      action_timeout_seconds: gameConfig.action_timeout_seconds,
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
      action_timeout_seconds: gameConfig.action_timeout_seconds,
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
      action_timeout_seconds: gameConfig.action_timeout_seconds,
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
      },
      next_state: nextState,
      action_timeout_seconds: gameConfig.action_timeout_seconds,
    }
  }

  // ============================================================
  // Round End Events
  // ============================================================

  /**
   * 將局計分轉換為 RoundScoredEvent
   *
   * @param game - 遊戲聚合根
   * @param winnerId - 勝者 ID
   * @param yakuList - 役種列表
   * @param baseScore - 基礎分數
   * @param finalScore - 最終分數
   * @param multipliers - 倍率資訊
   * @param updatedScores - 更新後的分數
   * @returns RoundScoredEvent
   */
  toRoundScoredEvent(
    game: Game,
    winnerId: string,
    yakuList: readonly Yaku[],
    baseScore: number,
    finalScore: number,
    multipliers: ScoreMultipliers,
    updatedScores: readonly PlayerScore[]
  ): RoundScoredEvent {
    return {
      event_type: 'RoundScored',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      winner_id: winnerId,
      yaku_list: yakuList.map(y => ({
        yaku_type: y.yaku_type,
        base_points: y.base_points,
        contributing_cards: [...y.contributing_cards],
      })),
      base_score: baseScore,
      final_score: finalScore,
      multipliers: {
        player_multipliers: { ...multipliers.player_multipliers },
      },
      updated_total_scores: updatedScores.map(s => ({
        player_id: s.player_id,
        score: s.score,
      })),
      display_timeout_seconds: gameConfig.display_timeout_seconds,
    }
  }

  /**
   * 將平局結果轉換為 RoundDrawnEvent
   *
   * @param currentScores - 目前累積分數
   * @returns RoundDrawnEvent
   */
  toRoundDrawnEvent(
    currentScores: readonly PlayerScore[]
  ): RoundDrawnEvent {
    return {
      event_type: 'RoundDrawn',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      current_total_scores: currentScores.map(s => ({
        player_id: s.player_id,
        score: s.score,
      })),
      display_timeout_seconds: gameConfig.display_timeout_seconds,
    }
  }

  /**
   * 將特殊規則觸發轉換為 RoundEndedInstantlyEvent
   *
   * @param reason - 結束原因（TESHI / FIELD_KUTTSUKI / NO_YAKU）
   * @param winnerId - 勝者 ID（平局時為 null）
   * @param awardedPoints - 獎勵/懲罰分數
   * @param updatedScores - 更新後的分數
   * @returns RoundEndedInstantlyEvent
   */
  toRoundEndedInstantlyEvent(
    reason: RoundEndReason,
    winnerId: string | null,
    awardedPoints: number,
    updatedScores: readonly PlayerScore[]
  ): RoundEndedInstantlyEvent {
    return {
      event_type: 'RoundEndedInstantly',
      event_id: createEventId(),
      timestamp: createTimestamp(),
      reason,
      winner_id: winnerId,
      awarded_points: awardedPoints,
      updated_total_scores: updatedScores.map(s => ({
        player_id: s.player_id,
        score: s.score,
      })),
      display_timeout_seconds: gameConfig.display_timeout_seconds,
    }
  }

  /**
   * 將遊戲結束轉換為 GameFinishedEvent
   *
   * @param winnerId - 勝者 ID（平局時為 null）
   * @param finalScores - 最終分數
   * @returns GameFinishedEvent
   */
  toGameFinishedEvent(
    winnerId: string | null,
    finalScores: readonly PlayerScore[]
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
   * @returns GameSnapshotRestore 事件
   * @throws Error 如果遊戲無法建立快照（currentRound 為 null）
   */
  toGameSnapshotRestoreEvent(game: Game): GameSnapshotRestore {
    const snapshot = toSnapshot(game)

    if (!snapshot) {
      throw new Error('Cannot create GameSnapshotRestore: unable to create snapshot (currentRound is null)')
    }

    return {
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
      koi_statuses: snapshot.koi_statuses.map(ks => ({
        player_id: ks.player_id,
        koi_multiplier: ks.koi_multiplier,
        times_continued: ks.times_continued,
      })),
      action_timeout_seconds: gameConfig.action_timeout_seconds,
    }
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
