/**
 * Matchmaking Registry
 *
 * @description
 * 管理配對條目的計時器邏輯。
 *
 * 功能：
 * - 為每個配對條目設定獨立計時器
 * - 10 秒後轉換為 LOW_AVAILABILITY 狀態
 * - 15 秒後觸發 Bot Fallback
 * - 提供 SSE 狀態更新回調
 *
 * 計時器設計：
 * - 每個 Entry 有獨立的 lowAvailability (10s) 和 botFallback (15s) 計時器
 * - 配對成功或取消時清除計時器
 *
 * @module server/matchmaking/adapters/registry/matchmakingRegistry
 */

import type { MatchmakingPoolPort } from '../../application/ports/output/matchmakingPoolPort'
import type { MatchmakingEntry } from '../../domain/matchmakingEntry'
import type { MatchmakingStatusCode } from '../../domain/matchmakingStatus'
import { STATUS_MESSAGES } from '../../domain/matchmakingStatus'
import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import {
  playerEventBus,
  createMatchmakingEvent,
  internalEventBus,
  type Unsubscribe,
} from '~~/server/shared/infrastructure/event-bus'

/**
 * 計時器配置常數
 */
const TIMERS = {
  LOW_AVAILABILITY_MS: 10_000, // 10 seconds
  BOT_FALLBACK_MS: 15_000, // 15 seconds
} as const

/**
 * SSE 狀態更新事件
 */
export interface MatchmakingStatusUpdate {
  readonly entry_id: string
  readonly status: MatchmakingStatusCode
  readonly message: string
  readonly elapsed_seconds: number
}

/**
 * 狀態更新回調類型
 */
export type StatusCallback = (update: MatchmakingStatusUpdate) => void

/**
 * Bot Fallback 資訊
 *
 * @description
 * 當玩家等待超過 15 秒仍未配對到人類對手時，
 * Registry 透過此資訊通知 Application Layer 執行 Bot Fallback。
 */
export interface BotFallbackInfo {
  readonly entryId: string
  readonly playerId: string
  readonly playerName: string
  readonly roomType: RoomTypeId
}

/**
 * Bot Fallback 回調類型
 *
 * @description
 * 由 SSE Endpoint 定義，呼叫 ProcessMatchmakingUseCase.executeBotFallback()。
 * 確保所有 MATCH_FOUND 事件由 Application Layer 發布，符合 Clean Architecture。
 */
export type BotFallbackCallback = (info: BotFallbackInfo) => void

/**
 * Entry 計時器資訊
 */
interface EntryTimers {
  readonly entryId: string
  readonly playerId: string
  readonly playerName: string
  readonly roomType: RoomTypeId
  readonly enteredAt: Date
  readonly statusCallback: StatusCallback
  readonly botFallbackCallback: BotFallbackCallback
  lowAvailabilityTimer: NodeJS.Timeout | null
  botFallbackTimer: NodeJS.Timeout | null
}

/**
 * Matchmaking Registry
 *
 * @description
 * 管理配對條目的生命週期與計時器。
 */
export class MatchmakingRegistry {
  private readonly entries: Map<string, EntryTimers> = new Map()
  private readonly playerIdToEntryId: Map<string, string> = new Map()
  private matchFoundUnsubscribe: Unsubscribe | null = null

  constructor(private readonly poolPort: MatchmakingPoolPort) {
    // 訂閱 MATCH_FOUND 事件，清理已配對玩家的計時器
    this.matchFoundUnsubscribe = internalEventBus.onMatchFound((payload) => {
      this.handleMatchFoundEvent(payload.player1Id, payload.player2Id)
    })
  }

  /**
   * 處理 MATCH_FOUND 事件
   *
   * @description
   * 清理已配對玩家的 Registry entries（計時器）。
   */
  private handleMatchFoundEvent(player1Id: string, player2Id: string): void {
    const entry1Id = this.playerIdToEntryId.get(player1Id)
    const entry2Id = this.playerIdToEntryId.get(player2Id)

    if (entry1Id) {
      this.unregisterEntry(entry1Id)
    }
    if (entry2Id) {
      this.unregisterEntry(entry2Id)
    }
  }

  /**
   * 註冊配對條目
   *
   * @description
   * 為條目設定計時器並發送初始狀態。
   * 此方法具有冪等性：如果條目已存在，會先清除舊的計時器再重新設定。
   *
   * @param entry 配對條目
   * @param statusCallback SSE 狀態更新回調
   * @param botFallbackCallback Bot Fallback 回調（由 Application Layer 定義）
   */
  registerEntry(
    entry: MatchmakingEntry,
    statusCallback: StatusCallback,
    botFallbackCallback: BotFallbackCallback
  ): void {
    // 冪等性保護：如果條目已存在，先清除舊的計時器
    const existingEntry = this.entries.get(entry.id)
    if (existingEntry) {
      this.clearTimers(existingEntry)
    }

    const entryTimers: EntryTimers = {
      entryId: entry.id,
      playerId: entry.playerId,
      playerName: entry.playerName,
      roomType: entry.roomType,
      enteredAt: entry.enteredAt,
      statusCallback,
      botFallbackCallback,
      lowAvailabilityTimer: null,
      botFallbackTimer: null,
    }

    // 發送初始 SEARCHING 狀態
    this.sendStatusUpdate(entryTimers, 'SEARCHING')

    // 設定 10 秒 LOW_AVAILABILITY 計時器
    entryTimers.lowAvailabilityTimer = setTimeout(() => {
      this.handleLowAvailabilityTimeout(entry.id)
    }, TIMERS.LOW_AVAILABILITY_MS)

    // 設定 15 秒 Bot Fallback 計時器
    entryTimers.botFallbackTimer = setTimeout(() => {
      this.handleBotFallbackTimeout(entry.id)
    }, TIMERS.BOT_FALLBACK_MS)

    this.entries.set(entry.id, entryTimers)
    this.playerIdToEntryId.set(entry.playerId, entry.id)
  }

  /**
   * 取消註冊配對條目
   *
   * @description
   * 清除計時器並移除條目。
   */
  unregisterEntry(entryId: string): void {
    const entryTimers = this.entries.get(entryId)
    if (!entryTimers) {
      return
    }

    this.clearTimers(entryTimers)
    this.entries.delete(entryId)
    this.playerIdToEntryId.delete(entryTimers.playerId)
  }

  /**
   * 處理配對成功
   *
   * @description
   * 玩家已配對成功，清除計時器。
   */
  handleMatchFound(entryId: string): void {
    this.unregisterEntry(entryId)
  }

  /**
   * 停止所有計時器並清理資源
   */
  stop(): void {
    // 取消 MATCH_FOUND 事件訂閱
    if (this.matchFoundUnsubscribe) {
      this.matchFoundUnsubscribe()
      this.matchFoundUnsubscribe = null
    }

    // 清除所有計時器
    for (const entryTimers of this.entries.values()) {
      this.clearTimers(entryTimers)
    }
    this.entries.clear()
    this.playerIdToEntryId.clear()
  }

  /**
   * 處理 10 秒 LOW_AVAILABILITY 超時
   */
  private handleLowAvailabilityTimeout(entryId: string): void {
    const entryTimers = this.entries.get(entryId)
    if (!entryTimers) {
      return
    }

    // 更新 Pool 中的狀態
    this.poolPort.updateStatus(entryId, 'LOW_AVAILABILITY')

    // 發送 SSE 狀態更新
    this.sendStatusUpdate(entryTimers, 'LOW_AVAILABILITY')
  }

  /**
   * 處理 15 秒 Bot Fallback 超時
   *
   * @description
   * 透過 callback 通知 Application Layer 執行 Bot Fallback。
   * 符合 Clean Architecture：Adapter 只負責計時，業務事件由 Use Case 發布。
   */
  private handleBotFallbackTimeout(entryId: string): void {
    const entryTimers = this.entries.get(entryId)
    if (!entryTimers) {
      return
    }

    // 透過 callback 通知 Application Layer 執行 Bot Fallback
    entryTimers.botFallbackCallback({
      entryId: entryTimers.entryId,
      playerId: entryTimers.playerId,
      playerName: entryTimers.playerName,
      roomType: entryTimers.roomType,
    })

    // 清除條目
    this.unregisterEntry(entryId)
  }

  /**
   * 發送 SSE 狀態更新
   *
   * @description
   * 1. 呼叫傳統 statusCallback（向後兼容舊 SSE 端點）
   * 2. 發布到 PlayerEventBus（新 Gateway 架構）
   */
  private sendStatusUpdate(entryTimers: EntryTimers, status: MatchmakingStatusCode): void {
    const now = new Date()
    const elapsedMs = now.getTime() - entryTimers.enteredAt.getTime()
    const elapsedSeconds = Math.floor(elapsedMs / 1000)

    const update: MatchmakingStatusUpdate = {
      entry_id: entryTimers.entryId,
      status,
      message: STATUS_MESSAGES[status],
      elapsed_seconds: elapsedSeconds,
    }

    // 1. 傳統 statusCallback（向後兼容）
    entryTimers.statusCallback(update)

    // 2. 發布到 PlayerEventBus（新 Gateway 架構）
    const gatewayEvent = createMatchmakingEvent('MatchmakingStatus', update)
    playerEventBus.publishToPlayer(entryTimers.playerId, gatewayEvent)
  }

  /**
   * 清除條目的所有計時器
   */
  private clearTimers(entryTimers: EntryTimers): void {
    if (entryTimers.lowAvailabilityTimer) {
      clearTimeout(entryTimers.lowAvailabilityTimer)
      entryTimers.lowAvailabilityTimer = null
    }
    if (entryTimers.botFallbackTimer) {
      clearTimeout(entryTimers.botFallbackTimer)
      entryTimers.botFallbackTimer = null
    }
  }
}
