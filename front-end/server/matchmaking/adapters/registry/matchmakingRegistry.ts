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
import type { MatchmakingEventPublisherPort } from '../../application/ports/output/matchmakingEventPublisherPort'
import type { MatchmakingEntry } from '../../domain/matchmakingEntry'
import type { MatchmakingStatusCode } from '../../domain/matchmakingStatus'
import { STATUS_MESSAGES } from '../../domain/matchmakingStatus'

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
 * Entry 計時器資訊
 */
interface EntryTimers {
  readonly entryId: string
  readonly playerId: string
  readonly playerName: string
  readonly roomType: 'QUICK' | 'STANDARD' | 'MARATHON'
  readonly enteredAt: Date
  readonly statusCallback: StatusCallback
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

  constructor(
    private readonly poolPort: MatchmakingPoolPort,
    private readonly eventPublisher: MatchmakingEventPublisherPort
  ) {}

  /**
   * 註冊配對條目
   *
   * @description
   * 為條目設定計時器並發送初始狀態。
   */
  registerEntry(entry: MatchmakingEntry, statusCallback: StatusCallback): void {
    const entryTimers: EntryTimers = {
      entryId: entry.id,
      playerId: entry.playerId,
      playerName: entry.playerName,
      roomType: entry.roomType,
      enteredAt: entry.enteredAt,
      statusCallback,
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
   * 停止所有計時器
   */
  stop(): void {
    for (const entryTimers of this.entries.values()) {
      this.clearTimers(entryTimers)
    }
    this.entries.clear()
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
   */
  private handleBotFallbackTimeout(entryId: string): void {
    const entryTimers = this.entries.get(entryId)
    if (!entryTimers) {
      return
    }

    // 發布 Bot 配對事件
    this.eventPublisher.publishMatchFound({
      player1Id: entryTimers.playerId,
      player1Name: entryTimers.playerName,
      player2Id: '', // Bot 沒有 player ID
      player2Name: 'Computer',
      roomType: entryTimers.roomType,
      matchType: 'BOT',
      matchedAt: new Date(),
    })

    // 清除條目
    this.unregisterEntry(entryId)
  }

  /**
   * 發送 SSE 狀態更新
   */
  private sendStatusUpdate(entryTimers: EntryTimers, status: MatchmakingStatusCode): void {
    const now = new Date()
    const elapsedMs = now.getTime() - entryTimers.enteredAt.getTime()
    const elapsedSeconds = Math.floor(elapsedMs / 1000)

    entryTimers.statusCallback({
      entry_id: entryTimers.entryId,
      status,
      message: STATUS_MESSAGES[status],
      elapsed_seconds: elapsedSeconds,
    })
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
