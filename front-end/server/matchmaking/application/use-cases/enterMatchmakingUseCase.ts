/**
 * Enter Matchmaking Use Case
 *
 * @description
 * 處理玩家進入配對佇列的 Use Case。
 * 驗證玩家狀態後加入佇列，嘗試立即配對。
 *
 * @module server/matchmaking/application/use-cases/enterMatchmakingUseCase
 */

import { randomUUID } from 'node:crypto'
import type {
  EnterMatchmakingInput,
  EnterMatchmakingOutput,
} from '../ports/input/enterMatchmakingInputPort'
import { EnterMatchmakingInputPort } from '../ports/input/enterMatchmakingInputPort'
import type { MatchmakingPoolPort } from '../ports/output/matchmakingPoolPort'
import type { PlayerGameStatusPort } from '../ports/output/playerGameStatusPort'
import type { MatchmakingEventPublisherPort } from '../ports/output/matchmakingEventPublisherPort'
import { MatchmakingEntry } from '../../domain/matchmakingEntry'
import { STATUS_MESSAGES } from '../../domain/matchmakingStatus'

/**
 * Enter Matchmaking Use Case
 */
export class EnterMatchmakingUseCase extends EnterMatchmakingInputPort {
  constructor(
    private readonly poolPort: MatchmakingPoolPort,
    private readonly playerGameStatusPort: PlayerGameStatusPort,
    private readonly eventPublisher: MatchmakingEventPublisherPort
  ) {
    super()
  }

  async execute(input: EnterMatchmakingInput): Promise<EnterMatchmakingOutput> {
    // 1. 檢查玩家是否已在配對佇列中
    const existingEntry = await this.poolPort.findByPlayerId(input.playerId)
    if (existingEntry) {
      return {
        success: false,
        errorCode: 'ALREADY_IN_QUEUE',
        message: 'You are already in the matchmaking queue',
      }
    }

    // 2. 檢查玩家是否有進行中的遊戲
    const hasActiveGame = await this.playerGameStatusPort.hasActiveGame(input.playerId)
    if (hasActiveGame) {
      return {
        success: false,
        errorCode: 'ALREADY_IN_GAME',
        message: 'You have an active game in progress',
      }
    }

    // 3. 建立配對條目
    const entry = MatchmakingEntry.create({
      id: randomUUID(),
      playerId: input.playerId,
      playerName: input.playerName,
      roomType: input.roomType,
    })

    // 4. 加入佇列
    await this.poolPort.add(entry)

    // 5. 嘗試立即配對
    const matchedEntry = await this.poolPort.findMatch(entry)

    if (matchedEntry) {
      // 找到對手 - 從 Pool 移除兩個條目（配對完成，不再需要）
      // 注意：必須在發布 MatchFound 前移除，避免玩家重新點擊時觸發 ALREADY_IN_QUEUE
      await this.poolPort.remove(entry.id)
      await this.poolPort.remove(matchedEntry.id)

      this.eventPublisher.publishMatchFound({
        player1Id: matchedEntry.playerId,
        player1Name: matchedEntry.playerName,
        player2Id: entry.playerId,
        player2Name: entry.playerName,
        roomType: input.roomType,
        matchType: 'HUMAN',
        matchedAt: new Date(),
      })

      return {
        success: true,
        entryId: entry.id,
        message: STATUS_MESSAGES.MATCHED_HUMAN,
      }
    }

    // 未找到對手 - 玩家進入等待狀態
    return {
      success: true,
      entryId: entry.id,
      message: STATUS_MESSAGES.SEARCHING,
    }
  }
}
