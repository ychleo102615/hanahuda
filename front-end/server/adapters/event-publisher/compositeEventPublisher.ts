/**
 * CompositeEventPublisher - Adapter Layer
 *
 * @description
 * 組合式事件發佈器，統一發佈事件到所有訂閱者：
 * 1. SSE 連線（透過 ConnectionStore）
 * 2. AI 對手（透過 OpponentStore）
 * 3. 資料庫日誌（透過 GameLogRepository）
 *
 * 設計原則：
 * - 不解析事件語意
 * - 不判斷誰是 AI
 * - 只負責將事件廣播到所有註冊的接收者
 * - 接收者（OpponentInstance）自己判斷是否該行動
 * - 日誌寫入為 Fire-and-Forget，不阻塞遊戲流程
 *
 * @module server/adapters/event-publisher/compositeEventPublisher
 */

import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameLogRepositoryPort } from '~~/server/application/ports/output/gameLogRepositoryPort'
import type { GameEvent, GameStartedEvent, RoundDealtEvent } from '#shared/contracts'
import type { GameLogEventType } from '~~/server/database/schema/gameLogs'
import { connectionStore } from './connectionStore'
import { opponentStore } from '~~/server/adapters/opponent/opponentStore'
import { loggers } from '~~/server/utils/logger'

/** Module logger instance */
const logger = loggers.adapter('CompositeEventPublisher')

/**
 * 需要記錄的 SSE 事件類型
 *
 * 不記錄的事件：
 * - TurnError, GameError: 錯誤事件由日誌框架處理
 * - InitialState, GameSnapshotRestore: 狀態恢復事件
 * - SelectionRequired, DecisionRequired: 只是提示，實際操作由命令記錄
 */
const LOGGABLE_EVENT_TYPES: Set<GameLogEventType> = new Set([
  'GameStarted',
  'GameFinished',
  'RoundDealt',
  'RoundEnded',
  'TurnCompleted',
  'TurnProgressAfterSelection',
  'DecisionMade',
])

/**
 * CompositeEventPublisher
 *
 * 實作 EventPublisherPort，將事件廣播到 SSE、AI 對手，並記錄到資料庫。
 */
export class CompositeEventPublisher implements EventPublisherPort {
  constructor(
    private readonly gameLogRepository?: GameLogRepositoryPort
  ) {}

  /**
   * 發佈通用遊戲事件到指定遊戲
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲事件
   */
  publishToGame(gameId: string, event: GameEvent): void {
    // 1. 發布到 SSE 連線（Normal Clients）
    const connectionCount = connectionStore.getConnectionCount(gameId)
    if (connectionCount > 0) {
      connectionStore.broadcast(gameId, event)
      logger.info('SSE broadcast', {
        eventType: event.event_type,
        gameId,
        connectionCount,
      })
    }

    // 2. 發布到 AI 對手（若有註冊）
    const hasOpponent = opponentStore.hasOpponent(gameId)
    if (hasOpponent) {
      opponentStore.sendEvent(gameId, event)
      logger.info('AI broadcast', { eventType: event.event_type, gameId })
    }

    // 3. 記錄到資料庫（Fire-and-Forget）
    this.logEventToDatabase(gameId, event)
  }

  /**
   * 記錄事件到資料庫（Fire-and-Forget）
   */
  private logEventToDatabase(gameId: string, event: GameEvent): void {
    if (!this.gameLogRepository) return

    // 檢查是否為需要記錄的事件類型
    const eventType = event.event_type as GameLogEventType
    if (!LOGGABLE_EVENT_TYPES.has(eventType)) return

    // 提取 playerId（若事件中有）
    const playerId = 'player_id' in event ? (event as { player_id?: string }).player_id : undefined

    // 精簡 payload，只保留關鍵資訊
    const payload = this.extractMinimalPayload(event)

    this.gameLogRepository.logAsync({
      gameId,
      playerId,
      eventType,
      payload,
    })
  }

  /**
   * 提取精簡的 payload
   *
   * 移除冗餘資訊，只保留關鍵欄位以減少儲存空間。
   */
  private extractMinimalPayload(event: GameEvent): Record<string, unknown> {
    const eventData = event as unknown as Record<string, unknown>

    switch (event.event_type) {
      case 'GameStarted':
        return {
          starting_player_id: eventData.starting_player_id,
        }

      case 'GameFinished':
        return {
          winner_id: eventData.winner_id,
          reason: eventData.reason,
        }

      case 'RoundDealt':
        return {
          current_round: eventData.current_round,
          dealer_id: eventData.dealer_id,
        }

      case 'RoundEnded':
        return {
          reason: eventData.reason,
          winner_id: eventData.winner_id,
        }

      case 'TurnCompleted':
        return {
          next_player_id: eventData.next_player_id,
        }

      case 'TurnProgressAfterSelection':
        // 從 selection 中提取關鍵資訊
        const selection = eventData.draw_card_selection as Record<string, unknown> | undefined
        return {
          source_card_id: selection?.source_card_id,
          target_card_id: selection?.target_card_id,
        }

      case 'DecisionMade':
        return {
          decision: eventData.decision,
        }

      default:
        // 未知事件類型，記錄完整 payload
        return eventData
    }
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
   * 發佈事件到指定玩家
   *
   * @description
   * 用於重連時發送 GameSnapshotRestore 事件給單一玩家。
   * 僅發送到 SSE 連線，AI 不需要重連機制。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param event - 遊戲事件
   */
  publishToPlayer(gameId: string, playerId: string, event: GameEvent): void {
    const success = connectionStore.sendToPlayer(gameId, playerId, event)
    if (success) {
      logger.info('Sent event to player', { eventType: event.event_type, playerId, gameId })
    } else {
      logger.info('No connection for player, event not sent', { playerId, gameId })
    }
  }
}

/**
 * 建立 CompositeEventPublisher 實例
 *
 * @param gameLogRepository - 遊戲日誌儲存庫（可選）
 * @returns CompositeEventPublisher 實例
 */
export function createCompositeEventPublisher(
  gameLogRepository?: GameLogRepositoryPort
): CompositeEventPublisher {
  return new CompositeEventPublisher(gameLogRepository)
}
