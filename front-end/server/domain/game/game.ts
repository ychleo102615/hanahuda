/**
 * Game Aggregate Root - Domain Layer
 *
 * @description
 * 遊戲聚合根，管理整個遊戲會話的生命週期。
 * 包含玩家、規則、分數、局狀態等資訊。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/game/game
 */

import type { Ruleset, PlayerScore } from '#shared/contracts'
import {
  type RoomTypeId,
  getRuleset,
  DEFAULT_ROOM_TYPE_ID,
} from '#shared/constants/roomTypes'
import type { Player } from './player'
import { createAiPlayer } from './player'
import type { Round } from '../round/round'
import { createRound } from '../round/round'
import { createShuffledDeck, deal } from '../services/deckService'

/**
 * 遊戲狀態
 */
export type GameStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'

/**
 * Game Aggregate Root
 *
 * 遊戲會話的完整狀態
 */
export interface Game {
  /** 遊戲 ID (UUID v4) */
  readonly id: string
  /** 會話 Token (UUID v4) */
  readonly sessionToken: string
  /** 參與玩家列表 */
  readonly players: readonly Player[]
  /** 遊戲規則集 */
  readonly ruleset: Ruleset
  /** 各玩家累積分數 */
  readonly cumulativeScores: readonly PlayerScore[]
  /** 已完成的局數 */
  readonly roundsPlayed: number
  /** 總局數 */
  readonly totalRounds: number
  /** 目前局狀態（null 表示尚未開始或局間） */
  readonly currentRound: Round | null
  /** 遊戲狀態 */
  readonly status: GameStatus
  /** 建立時間 */
  readonly createdAt: Date
  /** 更新時間 */
  readonly updatedAt: Date
}

/**
 * 取得預設規則集
 *
 * @param roomTypeId - 房間類型 ID（可選，預設為 DEFAULT_ROOM_TYPE_ID）
 * @returns 對應房間類型的規則集
 */
export function getDefaultRuleset(roomTypeId: RoomTypeId = DEFAULT_ROOM_TYPE_ID): Ruleset {
  return getRuleset(roomTypeId)
}

/**
 * 建立遊戲參數
 */
export interface CreateGameParams {
  readonly id: string
  readonly sessionToken: string
  readonly player: Player
  readonly ruleset?: Ruleset
}

/**
 * 建立新遊戲
 *
 * 建立等待中的遊戲，只有一位玩家（等待對手加入）
 *
 * @param params - 建立遊戲所需參數
 * @returns 新建立的遊戲
 */
export function createGame(params: CreateGameParams): Game {
  const { id, sessionToken, player, ruleset = getDefaultRuleset() } = params

  const now = new Date()

  return Object.freeze({
    id,
    sessionToken,
    players: Object.freeze([player]),
    ruleset,
    cumulativeScores: Object.freeze([{ player_id: player.id, score: 0 }]),
    roundsPlayed: 0,
    totalRounds: ruleset.total_rounds,
    currentRound: null,
    status: 'WAITING' as GameStatus,
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * 加入第二位玩家並開始遊戲
 *
 * 將任意玩家（人類或 AI）加入遊戲，並將狀態改為 IN_PROGRESS。
 * 這是 Server 中立的配對邏輯核心函數。
 *
 * @param game - 等待中的遊戲
 * @param player - 要加入的玩家
 * @returns 更新後的遊戲（狀態改為 IN_PROGRESS）
 */
export function addSecondPlayerAndStart(game: Game, player: Player): Game {
  if (game.status !== 'WAITING') {
    throw new Error(`Cannot add player to game with status: ${game.status}`)
  }

  if (game.players.length !== 1) {
    throw new Error(`Expected 1 player, got ${game.players.length}`)
  }

  return Object.freeze({
    ...game,
    players: Object.freeze([...game.players, player]),
    cumulativeScores: Object.freeze([...game.cumulativeScores, { player_id: player.id, score: 0 }]),
    status: 'IN_PROGRESS' as GameStatus,
    updatedAt: new Date(),
  })
}

/**
 * 加入 AI 對手並開始遊戲
 *
 * 將 AI 對手加入遊戲，並將狀態改為進行中。
 * 此函數為向後兼容保留，內部呼叫 addSecondPlayerAndStart。
 *
 * @param game - 等待中的遊戲
 * @param aiPlayer - AI 玩家實體
 * @returns 更新後的遊戲（狀態改為 IN_PROGRESS）
 * @deprecated 使用 addSecondPlayerAndStart 替代
 */
export function addAiOpponentAndStart(game: Game, aiPlayer: Player): Game {
  if (!aiPlayer.isAi) {
    throw new Error('Expected AI player')
  }

  return addSecondPlayerAndStart(game, aiPlayer)
}

/**
 * 開始新局
 *
 * 洗牌、發牌，建立新的 Round
 *
 * @param game - 進行中的遊戲
 * @returns 更新後的遊戲（包含新的 currentRound）
 */
export function startRound(game: Game): Game {
  if (game.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot start round for game with status: ${game.status}`)
  }

  if (game.players.length !== 2) {
    throw new Error(`Expected 2 players, got ${game.players.length}`)
  }

  // 決定莊家（第一局是第一位玩家，之後輪替）
  const dealerIndex = game.roundsPlayed % 2
  const dealer = game.players[dealerIndex]

  if (!dealer) {
    throw new Error(`Dealer player not found at index ${dealerIndex}`)
  }

  const dealerId = dealer.id

  // 洗牌並發牌
  const shuffledDeck = createShuffledDeck()
  const playerIds = game.players.map((p) => p.id)
  const dealResult = deal(shuffledDeck, playerIds)

  // 先手是莊家（符合標準 Koi-Koi 規則）
  const startingPlayerId = dealerId

  const round = createRound({
    dealerId,
    playerIds,
    dealResult,
    startingPlayerId,
  })

  return Object.freeze({
    ...game,
    currentRound: round,
    updatedAt: new Date(),
  })
}

/**
 * 取得人類玩家
 *
 * @param game - 遊戲
 * @returns 人類玩家（若找不到則回傳 null）
 */
export function getHumanPlayer(game: Game): Player | null {
  return game.players.find((p) => !p.isAi) ?? null
}

/**
 * 取得 AI 玩家
 *
 * @param game - 遊戲
 * @returns AI 玩家（若找不到則回傳 null）
 */
export function getAiPlayer(game: Game): Player | null {
  return game.players.find((p) => p.isAi) ?? null
}

/**
 * 檢查遊戲是否可以繼續（有足夠局數）
 *
 * @param game - 遊戲
 * @returns 是否可以繼續
 */
export function canContinue(game: Game): boolean {
  return game.status === 'IN_PROGRESS' && game.roundsPlayed < game.totalRounds
}

/**
 * 取得玩家累積分數
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 玩家累積分數（若找不到則回傳 0）
 */
export function getPlayerScore(game: Game, playerId: string): number {
  const score = game.cumulativeScores.find((s) => s.player_id === playerId)
  return score?.score ?? 0
}

// ============================================================
// Turn Execution & State Management
// ============================================================

import type {
  FlowState,
  PlayerInfo,
  PlayerHand,
  PlayerDepository,
  KoiStatus as ContractKoiStatus,
  SelectionContext,
  DecisionContext,
  ScoreMultipliers,
} from '#shared/contracts'

/**
 * 檢查是否為指定玩家的回合
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 是否為該玩家的回合
 */
export function isPlayerTurn(game: Game, playerId: string): boolean {
  if (game.status !== 'IN_PROGRESS' || !game.currentRound) {
    return false
  }
  return game.currentRound.activePlayerId === playerId
}

/**
 * 取得目前流程狀態
 *
 * @param game - 遊戲
 * @returns 目前的 FlowState（若遊戲未進行中則回傳 null）
 */
export function getCurrentFlowState(game: Game): FlowState | null {
  if (game.status !== 'IN_PROGRESS' || !game.currentRound) {
    return null
  }
  return game.currentRound.flowState
}

/**
 * 取得目前行動玩家 ID
 *
 * @param game - 遊戲
 * @returns 目前行動玩家 ID（若遊戲未進行中則回傳 null）
 */
export function getActivePlayerId(game: Game): string | null {
  if (game.status !== 'IN_PROGRESS' || !game.currentRound) {
    return null
  }
  return game.currentRound.activePlayerId
}

/**
 * 更新目前局狀態
 *
 * @param game - 遊戲
 * @param updatedRound - 更新後的局
 * @returns 更新後的遊戲
 */
export function updateRound(game: Game, updatedRound: Round): Game {
  if (game.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot update round for game with status: ${game.status}`)
  }

  return Object.freeze({
    ...game,
    currentRound: updatedRound,
    updatedAt: new Date(),
  })
}

/**
 * 結束目前局並更新分數
 *
 * @param game - 遊戲
 * @param winnerId - 勝者 ID
 * @param score - 本局得分
 * @returns 更新後的遊戲（若達到總局數則狀態為 FINISHED）
 */
export function finishRound(game: Game, winnerId: string, score: number): Game {
  if (game.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot finish round for game with status: ${game.status}`)
  }

  // 更新累積分數
  const updatedScores = game.cumulativeScores.map((ps) =>
    ps.player_id === winnerId
      ? Object.freeze({ ...ps, score: ps.score + score })
      : ps
  )

  const newRoundsPlayed = game.roundsPlayed + 1
  const isGameFinished = newRoundsPlayed >= game.totalRounds

  return Object.freeze({
    ...game,
    cumulativeScores: Object.freeze(updatedScores),
    roundsPlayed: newRoundsPlayed,
    currentRound: null,
    status: isGameFinished ? ('FINISHED' as GameStatus) : game.status,
    updatedAt: new Date(),
  })
}

/**
 * 結束局（平局，無得分）
 *
 * @param game - 遊戲
 * @returns 更新後的遊戲
 */
export function finishRoundDraw(game: Game): Game {
  if (game.status !== 'IN_PROGRESS') {
    throw new Error(`Cannot finish round for game with status: ${game.status}`)
  }

  const newRoundsPlayed = game.roundsPlayed + 1
  const isGameFinished = newRoundsPlayed >= game.totalRounds

  return Object.freeze({
    ...game,
    roundsPlayed: newRoundsPlayed,
    currentRound: null,
    status: isGameFinished ? ('FINISHED' as GameStatus) : game.status,
    updatedAt: new Date(),
  })
}

/**
 * 強制結束遊戲（玩家離開或超時）
 *
 * @param game - 遊戲
 * @param winnerId - 勝者 ID（可選，若無則視為平局）
 * @returns 更新後的遊戲（狀態為 FINISHED）
 */
export function finishGame(game: Game, winnerId?: string): Game {
  return Object.freeze({
    ...game,
    currentRound: null,
    status: 'FINISHED' as GameStatus,
    updatedAt: new Date(),
  })
}

/**
 * 取得對手玩家
 *
 * @param game - 遊戲
 * @param playerId - 目前玩家 ID
 * @returns 對手玩家（若找不到則回傳 null）
 */
export function getOpponentPlayer(game: Game, playerId: string): Player | null {
  return game.players.find((p) => p.id !== playerId) ?? null
}

/**
 * 判斷遊戲勝者
 *
 * @param game - 已結束的遊戲
 * @returns 勝者 ID（若平局則回傳 null）
 */
export function determineWinner(game: Game): string | null {
  if (game.cumulativeScores.length !== 2) {
    return null
  }

  const score1 = game.cumulativeScores[0]
  const score2 = game.cumulativeScores[1]

  if (!score1 || !score2) {
    return null
  }

  if (score1.score > score2.score) {
    return score1.player_id
  } else if (score2.score > score1.score) {
    return score2.player_id
  }

  return null // 平局
}

/**
 * 檢查牌堆是否已空（局結束條件之一）
 *
 * @param game - 遊戲
 * @returns 牌堆是否已空
 */
export function isDeckEmpty(game: Game): boolean {
  if (!game.currentRound) {
    return true
  }
  return game.currentRound.deck.length === 0
}

/**
 * 檢查是否有玩家手牌已空
 *
 * @param game - 遊戲
 * @returns 是否有玩家手牌已空
 */
export function hasPlayerWithEmptyHand(game: Game): boolean {
  if (!game.currentRound) {
    return false
  }
  return game.currentRound.playerStates.some((ps) => ps.hand.length === 0)
}

/**
 * 檢查是否雙方玩家手牌都已空
 *
 * @param game - 遊戲
 * @returns 是否雙方手牌都為空
 */
export function haveBothPlayersEmptyHand(game: Game): boolean {
  if (!game.currentRound) {
    return false
  }
  return game.currentRound.playerStates.every((ps) => ps.hand.length === 0)
}

/**
 * 檢查是否應該結束局
 *
 * 花札規則：只有雙方手牌都打完時才結束局。
 * 標準規則下牌堆不會空（24張 - 16次翻牌 = 剩8張）。
 *
 * @param game - 遊戲
 * @returns 是否應該結束局
 */
export function shouldEndRound(game: Game): boolean {
  return haveBothPlayersEmptyHand(game)
}

/**
 * 取得玩家的獲得區（透過 Game 取得）
 *
 * @param game - 遊戲
 * @param playerId - 玩家 ID
 * @returns 玩家獲得區（若找不到則回傳空陣列）
 */
export function getPlayerDepositoryFromGame(game: Game, playerId: string): readonly string[] {
  if (!game.currentRound) {
    return []
  }
  const playerState = game.currentRound.playerStates.find((ps) => ps.playerId === playerId)
  return playerState?.depository ?? []
}

// ============================================================
// Game Result Calculation (Phase 6)
// ============================================================

/**
 * 遊戲勝者計算結果
 */
export interface GameWinnerResult {
  /** 勝者 ID（平局時為 null） */
  readonly winnerId: string | null
  /** 分差（絕對值） */
  readonly margin: number
  /** 最終分數 */
  readonly finalScores: readonly PlayerScore[]
}

/**
 * 計算遊戲最終勝者
 *
 * 比較雙方累積分數，計算勝者和分差。
 *
 * @param game - 遊戲（通常為已結束或即將結束的遊戲）
 * @returns 勝者計算結果
 */
export function calculateWinner(game: Game): GameWinnerResult {
  const finalScores = game.cumulativeScores

  if (finalScores.length !== 2) {
    return {
      winnerId: null,
      margin: 0,
      finalScores,
    }
  }

  const score1 = finalScores[0]
  const score2 = finalScores[1]

  if (!score1 || !score2) {
    return {
      winnerId: null,
      margin: 0,
      finalScores,
    }
  }

  const margin = Math.abs(score1.score - score2.score)

  if (score1.score > score2.score) {
    return {
      winnerId: score1.player_id,
      margin,
      finalScores,
    }
  } else if (score2.score > score1.score) {
    return {
      winnerId: score2.player_id,
      margin,
      finalScores,
    }
  }

  // 平局
  return {
    winnerId: null,
    margin: 0,
    finalScores,
  }
}

// ============================================================
// Game Snapshot (Phase 7 - Reconnection Support)
// ============================================================

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
  /** 各玩家的 Koi-Koi 狀態 */
  readonly koi_statuses: readonly ContractKoiStatus[]
  /** AWAITING_SELECTION 時的選擇上下文（可選） */
  readonly selection_context?: SelectionContext
  /** AWAITING_DECISION 時的決策上下文（可選） */
  readonly decision_context?: DecisionContext
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

  if (round.flowState === 'AWAITING_SELECTION' && round.pendingSelection) {
    selection_context = Object.freeze({
      drawn_card: round.pendingSelection.drawnCard,
      possible_targets: round.pendingSelection.possibleTargets,
    })
  }

  if (round.flowState === 'AWAITING_DECISION' && round.pendingDecision) {
    // 計算分數倍率
    const player_multipliers: Record<string, number> = {}
    for (const ks of round.koiStatuses) {
      player_multipliers[ks.player_id] = ks.koi_multiplier
    }

    decision_context = Object.freeze({
      all_active_yaku: round.pendingDecision.activeYaku,
      current_multipliers: Object.freeze({ player_multipliers }),
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
    koi_statuses,
  }

  // 只在有值時加入可選欄位
  if (selection_context) {
    return Object.freeze({ ...snapshot, selection_context })
  }
  if (decision_context) {
    return Object.freeze({ ...snapshot, decision_context })
  }

  return Object.freeze(snapshot)
}
