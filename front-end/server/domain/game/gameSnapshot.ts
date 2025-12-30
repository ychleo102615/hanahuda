/**
 * Game Snapshot - Domain Layer
 *
 * @description
 * 遊戲快照功能，用於斷線重連恢復。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/game/gameSnapshot
 */

import type {
  FlowState,
  Ruleset,
  PlayerInfo,
  PlayerHand,
  PlayerDepository,
  PlayerScore,
  KoiStatus as ContractKoiStatus,
  SelectionContext,
  DecisionContext,
  RoundEndInfo,
} from '#shared/contracts'
import type { Game } from './game'

/**
 * 遊戲快照
 *
 * @description
 * 用於斷線重連時恢復完整遊戲狀態。
 * 結構與 GameSnapshotRestore 事件一致（不含事件元資料）。
 */
export interface GameSnapshot {
  /** 遊戲 ID */
  readonly game_id: string
  /** 玩家資訊 */
  readonly players: readonly PlayerInfo[]
  /** 規則集 */
  readonly ruleset: Ruleset
  /** 場牌 */
  readonly field_cards: readonly string[]
  /** 牌堆剩餘數量 */
  readonly deck_remaining: number
  /** 玩家手牌 */
  readonly player_hands: readonly PlayerHand[]
  /** 玩家獲得區 */
  readonly player_depositories: readonly PlayerDepository[]
  /** 玩家累積分數 */
  readonly player_scores: readonly PlayerScore[]
  /** 目前流程狀態 */
  readonly current_flow_stage: FlowState
  /** 目前行動玩家 ID */
  readonly active_player_id: string
  /** 目前局數（從 1 開始） */
  readonly current_round: number
  /** 目前莊家 ID */
  readonly dealer_id: string
  /** 各玩家的 Koi-Koi 狀態 */
  readonly koi_statuses: readonly ContractKoiStatus[]
  /** AWAITING_SELECTION 時的選擇上下文（可選） */
  readonly selection_context?: SelectionContext
  /** AWAITING_DECISION 時的決策上下文（可選） */
  readonly decision_context?: DecisionContext
  /** ROUND_ENDED 時的結算資訊（可選） */
  readonly round_end_info?: RoundEndInfo
}

/**
 * 建立遊戲快照
 *
 * @description
 * 從 Game 聚合根提取完整狀態，用於斷線重連恢復。
 * 若 currentRound 為 null（遊戲未開始或局間），回傳 null。
 *
 * @param game - 遊戲聚合根
 * @returns 遊戲快照（若無法建立則回傳 null）
 */
export function toSnapshot(game: Game): GameSnapshot | null {
  // 若無進行中的局，無法建立快照
  if (!game.currentRound) {
    return null
  }

  const round = game.currentRound

  // 轉換 Player → PlayerInfo
  const players: readonly PlayerInfo[] = Object.freeze(
    game.players.map((player) =>
      Object.freeze({
        player_id: player.id,
        player_name: player.name,
        is_ai: player.isAi,
      })
    )
  )

  // 轉換 PlayerRoundState → PlayerHand
  const player_hands: readonly PlayerHand[] = Object.freeze(
    round.playerStates.map((ps) =>
      Object.freeze({
        player_id: ps.playerId,
        cards: ps.hand,
      })
    )
  )

  // 轉換 PlayerRoundState → PlayerDepository
  const player_depositories: readonly PlayerDepository[] = Object.freeze(
    round.playerStates.map((ps) =>
      Object.freeze({
        player_id: ps.playerId,
        cards: ps.depository,
      })
    )
  )

  // 轉換 KoiStatus（Domain → Contract 格式一致，直接使用）
  const koi_statuses: readonly ContractKoiStatus[] = Object.freeze(
    round.koiStatuses.map((ks) =>
      Object.freeze({
        player_id: ks.player_id,
        koi_multiplier: ks.koi_multiplier,
        times_continued: ks.times_continued,
      })
    )
  )

  // 根據 flowState 建立上下文
  let selection_context: SelectionContext | undefined
  let decision_context: DecisionContext | undefined
  let round_end_info: RoundEndInfo | undefined

  if (round.flowState === 'AWAITING_SELECTION' && round.pendingSelection) {
    selection_context = Object.freeze({
      drawn_card: round.pendingSelection.drawnCard,
      possible_targets: round.pendingSelection.possibleTargets,
    })
  }

  if (round.flowState === 'AWAITING_DECISION' && round.pendingDecision) {
    // 計算分數倍率（新規則：全局共享，只要有人宣告過 Koi-Koi 就 ×2）
    const koi_koi_applied = round.koiStatuses.some(ks => ks.times_continued > 0)

    // 在決策階段尚未結算，is_score_doubled 設為 false
    // 7 點翻倍只在結算時才計算（由 RoundScoringData 提供）
    decision_context = Object.freeze({
      all_active_yaku: round.pendingDecision.activeYaku,
      current_multipliers: Object.freeze({ koi_koi_applied, is_score_doubled: false }),
    })
  }

  if (round.flowState === 'ROUND_ENDED' && round.settlementInfo) {
    // 計算剩餘倒數秒數
    // 若 totalTimeoutSeconds 為 undefined，表示最後一局不需要倒數，剩餘秒數為 0
    const totalTimeout = round.settlementInfo.totalTimeoutSeconds ?? 0
    const elapsed = (Date.now() - round.settlementInfo.endedAt.getTime()) / 1000
    const remaining = Math.max(0, totalTimeout - elapsed)

    round_end_info = Object.freeze({
      reason: round.settlementInfo.reason,
      winner_id: round.settlementInfo.winnerId,
      awarded_points: round.settlementInfo.awardedPoints,
      scoring_data: round.settlementInfo.scoringData,
      instant_data: round.settlementInfo.instantData,
      timeout_remaining_seconds: Math.ceil(remaining),
    })
  }

  const snapshot: GameSnapshot = {
    game_id: game.id,
    players,
    ruleset: game.ruleset,
    field_cards: round.field,
    deck_remaining: round.deck.length,
    player_hands,
    player_depositories,
    player_scores: game.cumulativeScores,
    current_flow_stage: round.flowState,
    active_player_id: round.activePlayerId,
    current_round: game.roundsPlayed + 1,
    dealer_id: round.dealerId,
    koi_statuses,
  }

  // 只在有值時加入可選欄位
  if (selection_context) {
    return Object.freeze({ ...snapshot, selection_context })
  }
  if (decision_context) {
    return Object.freeze({ ...snapshot, decision_context })
  }
  if (round_end_info) {
    return Object.freeze({ ...snapshot, round_end_info })
  }

  return Object.freeze(snapshot)
}
