/**
 * Game Invariants - Domain Layer
 *
 * @description
 * 遊戲狀態不變量檢查。
 * 用於驗證遊戲狀態是否符合業務規則。
 *
 * @module server/domain/game/gameInvariants
 */

import type { Game } from './game'
import type { Round } from '../round'
import { ALL_CARD_IDS_SET, TOTAL_DECK_SIZE } from '../card/cardConstants'

/**
 * 不變量違規錯誤
 */
export class InvariantViolation extends Error {
  constructor(
    public readonly invariant: string,
    message: string
  ) {
    super(`[Invariant:${invariant}] ${message}`)
    this.name = 'InvariantViolation'
  }
}

// ============================================================
// Round Invariants
// ============================================================

/**
 * 檢查回合卡片不變量
 *
 * 1. 所有卡片都是有效 ID
 * 2. 沒有重複卡片
 * 3. 總數 = 48
 */
export function assertRoundCardInvariants(round: Round): void {
  const seen = new Set<string>()
  let totalCount = 0

  // 檢查牌堆
  for (const cardId of round.deck) {
    if (!ALL_CARD_IDS_SET.has(cardId)) {
      throw new InvariantViolation('INVALID_CARD_ID', `Unknown card in deck: ${cardId}`)
    }
    if (seen.has(cardId)) {
      throw new InvariantViolation('CARD_DUPLICATE', `Card ${cardId} appears multiple times (found in deck)`)
    }
    seen.add(cardId)
    totalCount++
  }

  // 檢查場牌
  for (const cardId of round.field) {
    if (!ALL_CARD_IDS_SET.has(cardId)) {
      throw new InvariantViolation('INVALID_CARD_ID', `Unknown card in field: ${cardId}`)
    }
    if (seen.has(cardId)) {
      throw new InvariantViolation('CARD_DUPLICATE', `Card ${cardId} appears multiple times (found in field)`)
    }
    seen.add(cardId)
    totalCount++
  }

  // 檢查玩家手牌和獲得區
  for (const ps of round.playerStates) {
    for (const cardId of ps.hand) {
      if (!ALL_CARD_IDS_SET.has(cardId)) {
        throw new InvariantViolation('INVALID_CARD_ID', `Unknown card in player ${ps.playerId} hand: ${cardId}`)
      }
      if (seen.has(cardId)) {
        throw new InvariantViolation('CARD_DUPLICATE', `Card ${cardId} appears multiple times (found in player ${ps.playerId} hand)`)
      }
      seen.add(cardId)
      totalCount++
    }

    for (const cardId of ps.depository) {
      if (!ALL_CARD_IDS_SET.has(cardId)) {
        throw new InvariantViolation('INVALID_CARD_ID', `Unknown card in player ${ps.playerId} depository: ${cardId}`)
      }
      if (seen.has(cardId)) {
        throw new InvariantViolation('CARD_DUPLICATE', `Card ${cardId} appears multiple times (found in player ${ps.playerId} depository)`)
      }
      seen.add(cardId)
      totalCount++
    }
  }

  // 檢查總數
  if (totalCount !== TOTAL_DECK_SIZE) {
    throw new InvariantViolation('CARD_COUNT', `Expected ${TOTAL_DECK_SIZE} cards, found ${totalCount}`)
  }
}

/**
 * 檢查 FlowState 一致性
 */
export function assertFlowStateConsistency(round: Round): void {
  switch (round.flowState) {
    case 'AWAITING_SELECTION':
      if (!round.pendingSelection) {
        throw new InvariantViolation('FLOW_STATE', 'AWAITING_SELECTION requires pendingSelection')
      }
      break

    case 'AWAITING_DECISION':
      if (!round.pendingDecision) {
        throw new InvariantViolation('FLOW_STATE', 'AWAITING_DECISION requires pendingDecision')
      }
      break

    case 'AWAITING_HAND_PLAY':
      if (round.pendingSelection) {
        throw new InvariantViolation('FLOW_STATE', 'AWAITING_HAND_PLAY should not have pendingSelection')
      }
      if (round.pendingDecision) {
        throw new InvariantViolation('FLOW_STATE', 'AWAITING_HAND_PLAY should not have pendingDecision')
      }
      break
  }
}

/**
 * 檢查所有回合不變量
 */
export function assertRoundInvariants(round: Round): void {
  assertRoundCardInvariants(round)
  assertFlowStateConsistency(round)
}

// ============================================================
// Game Invariants
// ============================================================

/**
 * 檢查遊戲狀態一致性
 */
export function assertGameStateConsistency(game: Game): void {
  // 回合數不超過總回合數
  if (game.roundsPlayed > game.totalRounds) {
    throw new InvariantViolation(
      'ROUND_COUNT',
      `roundsPlayed (${game.roundsPlayed}) > totalRounds (${game.totalRounds})`
    )
  }

  // FINISHED 狀態一致性
  if (game.status === 'FINISHED' && game.currentRound !== null) {
    throw new InvariantViolation('FINISHED_STATE', 'FINISHED game should not have currentRound')
  }

  // IN_PROGRESS 需要 2 玩家
  if (game.status === 'IN_PROGRESS' && game.players.length !== 2) {
    throw new InvariantViolation(
      'PLAYER_COUNT',
      `IN_PROGRESS game needs 2 players, found ${game.players.length}`
    )
  }

  // WAITING 應該只有 1 玩家
  if (game.status === 'WAITING' && game.players.length !== 1) {
    throw new InvariantViolation(
      'PLAYER_COUNT',
      `WAITING game should have 1 player, found ${game.players.length}`
    )
  }

  // IN_PROGRESS 應該有 currentRound
  if (game.status === 'IN_PROGRESS' && game.currentRound === null) {
    throw new InvariantViolation('ROUND_STATE', 'IN_PROGRESS game should have currentRound')
  }
}

/**
 * 檢查所有遊戲不變量（包含回合）
 */
export function assertGameInvariants(game: Game): void {
  assertGameStateConsistency(game)

  if (game.currentRound) {
    assertRoundInvariants(game.currentRound)
  }
}
