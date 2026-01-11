/**
 * Process Matchmaking Use Case
 *
 * @description
 * 處理配對邏輯的 Use Case。
 * 尋找可配對的對手並發布配對成功事件。
 *
 * @module server/matchmaking/application/use-cases/processMatchmakingUseCase
 */

import type { MatchmakingPoolPort } from '../ports/output/matchmakingPoolPort'
import type { MatchmakingEventPublisherPort } from '../ports/output/matchmakingEventPublisherPort'
import type { RoomTypeId } from '~~/shared/constants/roomTypes'
import { MatchResult, BOT_PLAYER_ID } from '../../domain/matchResult'

/**
 * Process Matchmaking Input
 */
export interface ProcessMatchmakingInput {
  readonly entryId: string
}

/**
 * Process Matchmaking Output - Matched
 */
export interface ProcessMatchmakingMatchedOutput {
  readonly matched: true
  readonly matchResult: MatchResult
}

/**
 * Process Matchmaking Output - Not Matched
 */
export interface ProcessMatchmakingNotMatchedOutput {
  readonly matched: false
  readonly error?: 'ENTRY_NOT_FOUND' | 'NOT_MATCHABLE'
}

/**
 * Process Matchmaking Output
 */
export type ProcessMatchmakingOutput =
  | ProcessMatchmakingMatchedOutput
  | ProcessMatchmakingNotMatchedOutput

/**
 * Bot Fallback Input
 *
 * @description
 * 當玩家等待超過 15 秒仍未配對到人類對手時使用。
 */
export interface BotFallbackInput {
  readonly entryId: string
  readonly playerId: string
  readonly playerName: string
  readonly roomType: RoomTypeId
}

/**
 * Bot Fallback Output
 */
export interface BotFallbackOutput {
  readonly success: true
  readonly matchResult: MatchResult
}

/**
 * Process Matchmaking Use Case
 */
export class ProcessMatchmakingUseCase {
  constructor(
    private readonly poolPort: MatchmakingPoolPort,
    private readonly eventPublisher: MatchmakingEventPublisherPort
  ) {}

  async execute(input: ProcessMatchmakingInput): Promise<ProcessMatchmakingOutput> {
    // 1. 取得條目
    const entry = await this.poolPort.findById(input.entryId)
    if (!entry) {
      return {
        matched: false,
        error: 'ENTRY_NOT_FOUND',
      }
    }

    // 2. 檢查是否可配對
    if (!entry.isMatchable()) {
      return {
        matched: false,
        error: 'NOT_MATCHABLE',
      }
    }

    // 3. 尋找對手
    const opponent = await this.poolPort.findMatch(entry)
    if (!opponent) {
      return {
        matched: false,
      }
    }

    // 4. 建立配對結果
    const matchResult = MatchResult.createHumanMatch(
      entry.playerId,
      opponent.playerId,
      entry.roomType
    )

    // 5. 從 Pool 移除兩個條目（配對完成，不再需要）
    await this.poolPort.remove(entry.id)
    await this.poolPort.remove(opponent.id)

    // 6. 發布配對成功事件
    this.eventPublisher.publishMatchFound({
      player1Id: entry.playerId,
      player1Name: entry.playerName,
      player2Id: opponent.playerId,
      player2Name: opponent.playerName,
      roomType: entry.roomType,
      matchType: 'HUMAN',
      matchedAt: matchResult.matchedAt,
    })

    return {
      matched: true,
      matchResult,
    }
  }

  /**
   * 執行 Bot Fallback 配對
   *
   * @description
   * 當玩家等待超過 15 秒仍未配對到人類對手時，
   * 系統自動與 Bot 配對。
   *
   * 此方法由 MatchmakingRegistry 透過 callback 機制觸發，
   * 確保所有 MATCH_FOUND 事件都由 Application Layer 發布。
   */
  async executeBotFallback(input: BotFallbackInput): Promise<BotFallbackOutput> {
    // 1. 建立 Bot 配對結果
    const matchResult = MatchResult.createBotMatch(
      input.playerId,
      input.roomType
    )

    // 2. 從 Pool 移除條目（配對完成，不再需要）
    await this.poolPort.remove(input.entryId)

    // 3. 發布配對成功事件
    this.eventPublisher.publishMatchFound({
      player1Id: input.playerId,
      player1Name: input.playerName,
      player2Id: BOT_PLAYER_ID,
      player2Name: 'Computer',
      roomType: input.roomType,
      matchType: 'BOT',
      matchedAt: matchResult.matchedAt,
    })

    return {
      success: true,
      matchResult,
    }
  }
}
