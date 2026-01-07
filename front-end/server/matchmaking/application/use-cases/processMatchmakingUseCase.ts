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
import { MatchResult } from '../../domain/matchResult'

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

    // 5. 更新兩個條目的狀態
    await this.poolPort.updateStatus(entry.id, 'MATCHED')
    await this.poolPort.updateStatus(opponent.id, 'MATCHED')

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
}
