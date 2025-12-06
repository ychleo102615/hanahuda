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

import type { Ruleset, PlayerScore, YakuSetting, SpecialRules } from '#shared/contracts'
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
 * 預設役種設定
 */
const DEFAULT_YAKU_SETTINGS: YakuSetting[] = [
  { yaku_type: 'GOKO', base_points: 15, enabled: true },
  { yaku_type: 'SHIKO', base_points: 8, enabled: true },
  { yaku_type: 'AME_SHIKO', base_points: 7, enabled: true },
  { yaku_type: 'SANKO', base_points: 6, enabled: true },
  { yaku_type: 'TSUKIMI_ZAKE', base_points: 5, enabled: true },
  { yaku_type: 'HANAMI_ZAKE', base_points: 5, enabled: true },
  { yaku_type: 'INO_SHIKA_CHO', base_points: 5, enabled: true },
  { yaku_type: 'TANE', base_points: 1, enabled: true },
  { yaku_type: 'AKATAN_AOTAN', base_points: 10, enabled: true },
  { yaku_type: 'AKATAN', base_points: 5, enabled: true },
  { yaku_type: 'AOTAN', base_points: 5, enabled: true },
  { yaku_type: 'TANZAKU', base_points: 1, enabled: true },
  { yaku_type: 'KASU', base_points: 1, enabled: true },
]

/**
 * 預設特殊規則
 */
const DEFAULT_SPECIAL_RULES: SpecialRules = {
  teshi_enabled: true,
  field_kuttsuki_enabled: true,
}

/**
 * 取得預設規則集
 *
 * @returns 預設的遊戲規則集
 */
export function getDefaultRuleset(): Ruleset {
  return Object.freeze({
    target_score: 50,
    yaku_settings: Object.freeze(DEFAULT_YAKU_SETTINGS),
    special_rules: Object.freeze(DEFAULT_SPECIAL_RULES),
  })
}

/**
 * 預設總局數
 */
export const DEFAULT_TOTAL_ROUNDS = 12

/**
 * 建立遊戲參數
 */
export interface CreateGameParams {
  readonly id: string
  readonly sessionToken: string
  readonly player: Player
  readonly ruleset?: Ruleset
  readonly totalRounds?: number
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
  const { id, sessionToken, player, ruleset = getDefaultRuleset(), totalRounds = DEFAULT_TOTAL_ROUNDS } = params

  const now = new Date()

  return Object.freeze({
    id,
    sessionToken,
    players: Object.freeze([player]),
    ruleset,
    cumulativeScores: Object.freeze([{ player_id: player.id, score: 0 }]),
    roundsPlayed: 0,
    totalRounds,
    currentRound: null,
    status: 'WAITING' as GameStatus,
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * 加入 AI 對手並開始遊戲
 *
 * 將 AI 對手加入遊戲，並將狀態改為進行中
 *
 * @param game - 等待中的遊戲
 * @param aiPlayer - AI 玩家實體
 * @returns 更新後的遊戲（狀態改為 IN_PROGRESS）
 */
export function addAiOpponentAndStart(game: Game, aiPlayer: Player): Game {
  if (game.status !== 'WAITING') {
    throw new Error(`Cannot add AI opponent to game with status: ${game.status}`)
  }

  if (game.players.length !== 1) {
    throw new Error(`Expected 1 player, got ${game.players.length}`)
  }

  if (!aiPlayer.isAi) {
    throw new Error('Expected AI player')
  }

  return Object.freeze({
    ...game,
    players: Object.freeze([...game.players, aiPlayer]),
    cumulativeScores: Object.freeze([...game.cumulativeScores, { player_id: aiPlayer.id, score: 0 }]),
    status: 'IN_PROGRESS' as GameStatus,
    updatedAt: new Date(),
  })
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

  // 先手是非莊家
  const startingPlayerIndex = (dealerIndex + 1) % 2
  const startingPlayer = game.players[startingPlayerIndex]

  if (!startingPlayer) {
    throw new Error(`Starting player not found at index ${startingPlayerIndex}`)
  }

  const startingPlayerId = startingPlayer.id

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
