/**
 * SSEEventPublisher - Adapter Layer
 *
 * @description
 * 實作 EventPublisherPort，負責事件路由：
 * - 所有事件廣播到 SSE 連線（Normal Clients）
 * - 若 next_state.player_id 是 AI，額外發布到 opponentEventBus
 *
 * @module server/adapters/event-publisher/sseEventPublisher
 */

import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameEvent, GameStartedEvent, RoundDealtEvent } from '#shared/contracts'
import type { Game } from '~~/server/domain/game/game'
import type { GameStorePort } from '~~/server/application/use-cases/joinGameUseCase'
import { connectionStore } from './connectionStore'
import { opponentEventBus } from './opponentEventBus'

/**
 * SSEEventPublisher
 *
 * 實作 EventPublisherPort，負責事件路由：
 * - SSE 永遠廣播給所有 Normal Clients
 * - 若 next_state.player_id 是 AI，額外發布到 opponentEventBus
 */
export class SSEEventPublisher implements EventPublisherPort {
  constructor(private readonly gameStore: GameStorePort) {}

  /**
   * 發佈通用遊戲事件到指定遊戲
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲事件
   */
  publishToGame(gameId: string, event: GameEvent): void {
    const connectionCount = connectionStore.getConnectionCount(gameId)

    // 發布到所有連線的 Normal Clients（透過 SSE）
    if (connectionCount > 0) {
      connectionStore.broadcast(gameId, event)
      console.log(`[SSEEventPublisher] Broadcast ${event.event_type} to game ${gameId} (${connectionCount} connections)`)
    } else {
      console.log(`[SSEEventPublisher] No connections for game ${gameId}, SSE skipped`)
    }

    // 若 next_state 指向 AI 玩家，同時發布到 opponentEventBus
    this.routeToOpponentIfNeeded(gameId, event)
  }

  /**
   * 發佈遊戲開始事件
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲開始事件
   */
  publishGameStarted(gameId: string, event: GameStartedEvent): void {
    this.publishToGame(gameId, event)
  }

  /**
   * 發佈發牌事件
   *
   * @param gameId - 遊戲 ID
   * @param event - 發牌事件
   */
  publishRoundDealt(gameId: string, event: RoundDealtEvent): void {
    this.publishToGame(gameId, event)
  }

  /**
   * 若 next_state.player_id 是 AI，路由到 opponentEventBus
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲事件
   */
  private routeToOpponentIfNeeded(gameId: string, event: GameEvent): void {
    // 並非所有事件都有 next_state，需要檢查
    if (!('next_state' in event) || !event.next_state) return

    const nextPlayerId = event.next_state.active_player_id
    if (!nextPlayerId) return

    const game = this.gameStore.get(gameId)
    if (!game) return

    if (this.isAiPlayer(game, nextPlayerId)) {
      opponentEventBus.publish(gameId, event)
      console.log(`[SSEEventPublisher] Routed ${event.event_type} to OpponentEventBus for AI player ${nextPlayerId}`)
    }
  }

  /**
   * 檢查玩家是否為 AI
   *
   * @param game - 遊戲狀態
   * @param playerId - 玩家 ID
   * @returns 是否為 AI 玩家
   */
  private isAiPlayer(game: Game, playerId: string): boolean {
    const player = game.players.find((p) => p.id === playerId)
    return player?.isAi ?? false
  }
}

/**
 * 建立 SSEEventPublisher 實例
 *
 * 需要在 Composition Root (Plugin) 中使用 gameStore 建立。
 *
 * @param gameStore - 遊戲儲存庫
 * @returns SSEEventPublisher 實例
 */
export function createSSEEventPublisher(gameStore: GameStorePort): SSEEventPublisher {
  return new SSEEventPublisher(gameStore)
}
