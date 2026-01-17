/**
 * CompositeEventPublisher - Adapter Layer
 *
 * @description
 * 組合式事件發佈器，統一發佈事件到所有訂閱者：
 * 1. AI 對手（透過 OpponentStore）
 * 2. 玩家連線（透過 PlayerEventBus，WebSocket Gateway 架構）
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

import type { EventPublisherPort } from '~~/server/core-game/application/ports/output/eventPublisherPort'
import type { GameLogRepositoryPort } from '~~/server/core-game/application/ports/output/gameLogRepositoryPort'
import type { GameEvent, GameStartedEvent, RoundDealtEvent, CardPlay } from '#shared/contracts'
import { EVENT_TYPES } from '#shared/contracts'
import type { GameLogEventType } from '~~/server/database/schema/gameLogs'
import { opponentStore } from '~~/server/opponent/adapter/store/opponentStore'
import { inMemoryGameStore } from '~~/server/core-game/adapters/persistence/inMemoryGameStore'
import {
  playerEventBus,
  createGameEvent,
} from '~~/server/shared/infrastructure/event-bus'
import { wsConnectionManager } from '~~/server/gateway/wsConnectionManager'

/**
 * GameFinished 後關閉連線的延遲時間（毫秒）
 *
 * @description
 * 確保 GameFinished 事件送達客戶端後再關閉連線。
 * 前端收到事件後會設置 `expectingDisconnect = true`，
 * 避免觸發不必要的重連。
 */
const DISCONNECT_DELAY_MS = 100

// ============================================================================
// Payload 精簡工具（儲存優化，不影響業務契約）
// ============================================================================

/**
 * 精簡 CardPlay，省略空的 matched_cards
 *
 * @description
 * 儲存層優化：當 matched_cards 為空陣列時省略該欄位，節省 JSON 大小。
 * 讀取時需用 `matched_cards ?? []` 還原。
 *
 * @param cardPlay - 卡片操作（可為 null）
 * @returns 精簡後的物件（省略空陣列欄位）
 */
function compactCardPlay(cardPlay: CardPlay | null): Record<string, unknown> | null {
  if (!cardPlay) return null

  if (cardPlay.matched_cards.length === 0) {
    return { played_card: cardPlay.played_card }
  }

  return {
    played_card: cardPlay.played_card,
    matched_cards: [...cardPlay.matched_cards],
  }
}

/**
 * 移除物件中的 null 值欄位
 *
 * @description
 * 儲存層優化：移除值為 null 的欄位，節省 JSON 大小。
 *
 * @param obj - 原始物件
 * @returns 移除 null 值後的新物件
 */
function omitNullValues<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null) {
      result[key] = value
    }
  }
  return result
}

/**
 * 需要記錄的事件類型（使用 EVENT_TYPES 常數）
 *
 * 不記錄的事件：
 * - TurnError, GameError: 錯誤事件由日誌框架處理
 * - InitialState, GameSnapshotRestore: 狀態恢復事件
 *
 * 注意：SelectionRequired 和 DecisionRequired 必須記錄，
 * 因為它們包含翻開的牌堆牌資訊（drawn_card / draw_card_play），
 * 對於遊戲重播是必要的。
 */
const LOGGABLE_EVENT_TYPES: Set<GameLogEventType> = new Set([
  EVENT_TYPES.GameStarted,
  EVENT_TYPES.GameFinished,
  EVENT_TYPES.RoundDealt,
  EVENT_TYPES.RoundEnded,
  EVENT_TYPES.TurnCompleted,
  EVENT_TYPES.SelectionRequired,
  EVENT_TYPES.TurnProgressAfterSelection,
  EVENT_TYPES.DecisionRequired,
  EVENT_TYPES.DecisionMade,
])

/**
 * CompositeEventPublisher
 *
 * 實作 EventPublisherPort，將事件廣播到 WebSocket、AI 對手，並記錄到資料庫。
 */
export class CompositeEventPublisher implements EventPublisherPort {
  constructor(
    private readonly gameLogRepository?: GameLogRepositoryPort
  ) {}

  /**
   * 發佈通用遊戲事件到指定遊戲
   *
   * @description
   * 1. 發布到 AI 對手
   * 2. 發布到 PlayerEventBus（WebSocket Gateway 架構 /_ws）
   * 3. 記錄到資料庫
   * 4. 若為 GameFinished 事件，延遲後關閉玩家連線
   *
   * @param gameId - 遊戲 ID
   * @param event - 遊戲事件
   */
  publishToGame(gameId: string, event: GameEvent): void {
    // 取得玩家 ID 列表（需在事件發送前取得，因為遊戲可能在發送後被刪除）
    const game = inMemoryGameStore.get(gameId)
    const playerIds = game?.players.map((p) => p.id) ?? []

    // 1. 發布到 AI 對手（若有註冊）
    const hasOpponent = opponentStore.hasOpponent(gameId)
    if (hasOpponent) {
      opponentStore.sendEvent(gameId, event)
    }

    // 2. 發布到 PlayerEventBus（WebSocket Gateway 架構）
    this.publishToPlayerEventBus(gameId, event)

    // 3. 記錄到資料庫（Fire-and-Forget）
    this.logEventToDatabase(gameId, event)

    // 4. 若為 GameFinished 事件，延遲後關閉玩家連線
    if (event.event_type === EVENT_TYPES.GameFinished) {
      this.scheduleDisconnectAfterGameEnd(playerIds)
    }
  }

  /**
   * 遊戲結束後排程關閉玩家連線
   *
   * @description
   * GameFinished 事件發送後，等待一小段時間確保事件送達，
   * 然後主動關閉玩家的 WebSocket 連線。
   * 前端收到 GameFinished 後會設置 expectingDisconnect，
   * 收到 onclose 時不會觸發重連。
   *
   * @param playerIds - 玩家 ID 列表
   */
  private scheduleDisconnectAfterGameEnd(playerIds: string[]): void {
    setTimeout(() => {
      for (const playerId of playerIds) {
        // 使用 4000 代碼表示「正常遊戲結束」
        wsConnectionManager.forceDisconnect(playerId, 4000, 'Game finished')
      }
    }, DISCONNECT_DELAY_MS)
  }

  /**
   * 發布到 PlayerEventBus（新 Gateway 架構）
   *
   * @description
   * 從 inMemoryGameStore 取得遊戲資訊，廣播到所有玩家的 PlayerEventBus。
   */
  private publishToPlayerEventBus(gameId: string, event: GameEvent): void {
    const game = inMemoryGameStore.get(gameId)
    if (!game) return

    const playerIds = game.players.map((p) => p.id)
    const gatewayEvent = createGameEvent(event.event_type, event)
    playerEventBus.broadcastToPlayers(playerIds, gatewayEvent)
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
        // 精簡：省略空 matched_cards 和 null 值
        return omitNullValues({
          hand_card_play: compactCardPlay(event.hand_card_play),
          draw_card_play: compactCardPlay(event.draw_card_play),
        })

      case EVENT_TYPES.SelectionRequired:
        // 精簡：省略空 matched_cards
        return {
          hand_card_play: compactCardPlay(event.hand_card_play),
          drawn_card: event.drawn_card,
          possible_targets: event.possible_targets,
        }

      case EVENT_TYPES.TurnProgressAfterSelection:
        // 精簡：省略空 matched_cards 和 null 值
        return omitNullValues({
          selection: event.selection,
          draw_card_play: compactCardPlay(event.draw_card_play),
          yaku_update: event.yaku_update,
        })

      case EVENT_TYPES.DecisionRequired:
        // 精簡：省略空 matched_cards 和 null 值
        return omitNullValues({
          hand_card_play: compactCardPlay(event.hand_card_play),
          draw_card_play: compactCardPlay(event.draw_card_play),
          yaku_update: event.yaku_update,
          current_multipliers: event.current_multipliers,
        })

      case EVENT_TYPES.DecisionMade:
        return {
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
   * 用於：
   * - RoundDealt 事件（每個玩家收到過濾後的版本）
   * - 重連時發送 GameSnapshotRestore 事件給單一玩家
   *
   * 若目標玩家是 AI 對手，透過 OpponentStore 發送。
   * 否則透過 PlayerEventBus（WebSocket Gateway 架構）發送。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @param event - 遊戲事件
   */
  publishToPlayer(gameId: string, playerId: string, event: GameEvent): void {
    // 檢查目標玩家是否為 AI 對手
    const opponentInfo = opponentStore.get(gameId)
    if (opponentInfo && opponentInfo.playerId === playerId) {
      // AI 玩家：透過 OpponentStore 發送
      opponentStore.sendEvent(gameId, event)
      return
    }

    // 人類玩家：透過 PlayerEventBus（WebSocket Gateway 架構）發送
    const gatewayEvent = createGameEvent(event.event_type, event)
    playerEventBus.publishToPlayer(playerId, gatewayEvent)
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
