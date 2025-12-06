/**
 * Round Entity - Domain Layer
 *
 * @description
 * 代表一局遊戲狀態。追蹤場牌、牌堆、玩家手牌/獲得區，以及流程狀態。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/round/round
 */

import type { FlowState, CardPlay } from '#shared/contracts'
import type { KoiStatus } from './koiStatus'
import { createInitialKoiStatus } from './koiStatus'
import type { DealResult } from '../services/deckService'
import { getCardMonth } from '../services/deckService'

/**
 * 玩家局內狀態
 *
 * 追蹤玩家在一局內的手牌與獲得區
 */
export interface PlayerRoundState {
  readonly playerId: string
  readonly hand: readonly string[]
  readonly depository: readonly string[]
}

/**
 * 等待選擇配對的狀態
 *
 * 當翻牌與場上有多張同月份牌時，需要等待玩家選擇
 */
export interface PendingSelection {
  readonly drawnCard: string
  readonly possibleTargets: readonly string[]
  readonly handCardPlay: CardPlay
}

/**
 * Round Entity
 *
 * 一局遊戲的完整狀態
 */
export interface Round {
  /** 莊家 ID */
  readonly dealerId: string
  /** 場牌 */
  readonly field: readonly string[]
  /** 剩餘牌堆 */
  readonly deck: readonly string[]
  /** 玩家狀態（手牌、獲得區） */
  readonly playerStates: readonly PlayerRoundState[]
  /** 目前流程狀態 */
  readonly flowState: FlowState
  /** 目前行動玩家 ID */
  readonly activePlayerId: string
  /** 各玩家的 Koi-Koi 狀態 */
  readonly koiStatuses: readonly KoiStatus[]
  /** 等待配對選擇（若有） */
  readonly pendingSelection: PendingSelection | null
}

/**
 * 建立新局參數
 */
export interface CreateRoundParams {
  readonly dealerId: string
  readonly playerIds: readonly string[]
  readonly dealResult: DealResult
  readonly startingPlayerId: string
}

/**
 * 建立新局
 *
 * @param params - 建立局所需的參數
 * @returns 新建立的 Round 實體
 */
export function createRound(params: CreateRoundParams): Round {
  const { dealerId, playerIds, dealResult, startingPlayerId } = params

  // 建立玩家狀態
  const playerStates: PlayerRoundState[] = playerIds.map((playerId) => {
    const hand = dealResult.playerHands.get(playerId)
    if (!hand) {
      throw new Error(`No hand dealt for player ${playerId}`)
    }
    return Object.freeze({
      playerId,
      hand,
      depository: [] as readonly string[],
    })
  })

  // 建立初始 Koi-Koi 狀態
  const koiStatuses = playerIds.map((playerId) => createInitialKoiStatus(playerId))

  return Object.freeze({
    dealerId,
    field: dealResult.field,
    deck: dealResult.deck,
    playerStates: Object.freeze(playerStates),
    flowState: 'AWAITING_HAND_PLAY' as FlowState,
    activePlayerId: startingPlayerId,
    koiStatuses: Object.freeze(koiStatuses),
    pendingSelection: null,
  })
}

/**
 * 手四檢測結果
 */
export interface TeshiResult {
  readonly hasTeshi: boolean
  readonly month: number | null
}

/**
 * 檢測手四（手牌中有四張同月份牌）
 *
 * @param hand - 玩家手牌
 * @returns 手四檢測結果
 */
export function detectTeshi(hand: readonly string[]): TeshiResult {
  // 統計各月份牌數
  const monthCounts = new Map<number, number>()

  for (const cardId of hand) {
    const month = getCardMonth(cardId)
    const count = monthCounts.get(month) ?? 0
    monthCounts.set(month, count + 1)
  }

  // 找出有四張的月份
  for (const [month, count] of monthCounts.entries()) {
    if (count === 4) {
      return { hasTeshi: true, month }
    }
  }

  return { hasTeshi: false, month: null }
}

/**
 * 喰付檢測結果
 */
export interface KuttsukiResult {
  readonly hasKuttsuki: boolean
  readonly month: number | null
}

/**
 * 檢測喰付（場牌中有四張同月份牌）
 *
 * @param field - 場牌
 * @returns 喰付檢測結果
 */
export function detectKuttsuki(field: readonly string[]): KuttsukiResult {
  // 統計各月份牌數
  const monthCounts = new Map<number, number>()

  for (const cardId of field) {
    const month = getCardMonth(cardId)
    const count = monthCounts.get(month) ?? 0
    monthCounts.set(month, count + 1)
  }

  // 找出有四張的月份
  for (const [month, count] of monthCounts.entries()) {
    if (count === 4) {
      return { hasKuttsuki: true, month }
    }
  }

  return { hasKuttsuki: false, month: null }
}

/**
 * 取得玩家手牌
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns 玩家手牌（若找不到則回傳空陣列）
 */
export function getPlayerHand(round: Round, playerId: string): readonly string[] {
  const playerState = round.playerStates.find((ps) => ps.playerId === playerId)
  return playerState?.hand ?? []
}

/**
 * 取得玩家獲得區
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns 玩家獲得區（若找不到則回傳空陣列）
 */
export function getPlayerDepository(round: Round, playerId: string): readonly string[] {
  const playerState = round.playerStates.find((ps) => ps.playerId === playerId)
  return playerState?.depository ?? []
}

/**
 * 取得對手 ID
 *
 * @param round - 局狀態
 * @param playerId - 目前玩家 ID
 * @returns 對手 ID（若找不到則回傳 null）
 */
export function getOpponentId(round: Round, playerId: string): string | null {
  const opponent = round.playerStates.find((ps) => ps.playerId !== playerId)
  return opponent?.playerId ?? null
}

/**
 * 檢查玩家是否為目前行動玩家
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns 是否為目前行動玩家
 */
export function isActivePlayer(round: Round, playerId: string): boolean {
  return round.activePlayerId === playerId
}
