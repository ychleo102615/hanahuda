/**
 * Game Aggregate Root - Domain Layer
 *
 * @description
 * 遊戲聚合根，管理整個遊戲會話的生命週期。
 * 包含玩家、規則、分數、局狀態等資訊。
 * 純 TypeScript，無框架依賴。
 *
 * 注意：此檔案已拆分為多個模組，請優先從 index.ts 導入：
 * - gameQueries.ts: 查詢函數
 * - gameEndConditions.ts: 結束條件與勝者計算
 * - gameSnapshot.ts: 快照序列化
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
import type { Round } from '../round'
import { createRound } from '../round'
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
 * @param useTestDeck - 是否使用測試牌組（預設 false）
 * @returns 更新後的遊戲（包含新的 currentRound）
 */
export function startRound(game: Game, useTestDeck = false): Game {
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
  const shuffledDeck = createShuffledDeck(useTestDeck)
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
