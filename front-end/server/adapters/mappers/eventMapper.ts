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
import type { GameStartedEvent, RoundDealtEvent, PlayerInfo, PlayerHand } from '#shared/contracts'
import { toPlayerInfo, toPlayerInfoList, createNextState } from './dtos'
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
}

/**
 * EventMapper 單例
 */
export const eventMapper = new EventMapper()
