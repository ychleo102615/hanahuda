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
import { EVENT_TYPES } from '#shared/contracts'
import type { GameLogEventType } from '~~/server/database/schema/gameLogs'
import { connectionStore } from './connectionStore'
import { opponentStore } from '~~/server/adapters/opponent/opponentStore'

/**
 * 需要記錄的 SSE 事件類型（使用 EVENT_TYPES 常數）
 *
 * 不記錄的事件：
 * - TurnError, GameError: 錯誤事件由日誌框架處理
 * - InitialState, GameSnapshotRestore: 狀態恢復事件
 * - SelectionRequired, DecisionRequired: 只是提示，實際操作由命令記錄
 */
const LOGGABLE_EVENT_TYPES: Set<GameLogEventType> = new Set([
  EVENT_TYPES.GameStarted,
  EVENT_TYPES.GameFinished,
  EVENT_TYPES.RoundDealt,
  EVENT_TYPES.RoundEnded,
  EVENT_TYPES.TurnCompleted,
  EVENT_TYPES.TurnProgressAfterSelection,
  EVENT_TYPES.DecisionMade,
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
    }

    // 2. 發布到 AI 對手（若有註冊）
    const hasOpponent = opponentStore.hasOpponent(gameId)
    if (hasOpponent) {
      opponentStore.sendEvent(gameId, event)
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

    // 提取 Event Sourcing 所需的完整 payload
    const payload = this.extractReplayPayload(event)

    this.gameLogRepository.logAsync({
      gameId,
      playerId,
      eventType,
      payload,
    })
  }

  /**
   * 提取 Event Sourcing 所需的完整 payload
   *
   * @description
   * 保留重播遊戲所需的所有關鍵資訊。
   * 使用 EVENT_TYPES 常數確保 SSOT，並利用 TypeScript discriminated union narrowing。
   *
   * 設計原則：
   * - Commands（Use Cases）記錄玩家意圖（最小化）
   * - Events（此處）記錄完整結果（支援重播）
   */
  private extractReplayPayload(event: GameEvent): Record<string, unknown> {
    switch (event.event_type) {
      case EVENT_TYPES.GameStarted:
        return {
          starting_player_id: event.starting_player_id,
          players: event.players,
          ruleset: event.ruleset,
        }

      case EVENT_TYPES.GameFinished:
        return {
          winner_id: event.winner_id,
          reason: event.reason,
          final_scores: event.final_scores,
        }

      case EVENT_TYPES.RoundDealt:
        return {
          current_round: event.current_round,
          dealer_id: event.dealer_id,
          field: event.field,
          hands: event.hands,
        }

      case EVENT_TYPES.RoundEnded:
        return {
          reason: event.reason,
          updated_total_scores: event.updated_total_scores,
          scoring_data: event.scoring_data,
          instant_data: event.instant_data,
        }

      case EVENT_TYPES.TurnCompleted:
        return {
          player_id: event.player_id,
          hand_card_play: event.hand_card_play,
          draw_card_play: event.draw_card_play,
        }

      case EVENT_TYPES.TurnProgressAfterSelection:
        return {
          player_id: event.player_id,
          selection: event.selection,
          draw_card_play: event.draw_card_play,
        }

      case EVENT_TYPES.DecisionMade:
        return {
          player_id: event.player_id,
          decision: event.decision,
        }

      default:
        // 非記錄對象的事件類型，返回空物件（不應到達此處）
        return {}
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
    connectionStore.sendToPlayer(gameId, playerId, event)
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
