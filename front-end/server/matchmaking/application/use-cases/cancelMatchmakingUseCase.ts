/**
 * Cancel Matchmaking Use Case
 *
 * @description
 * 處理玩家取消配對的 Use Case。
 * 驗證條目存在且屬於該玩家後，從佇列中移除。
 *
 * @module server/matchmaking/application/use-cases/cancelMatchmakingUseCase
 */

import {
  CancelMatchmakingInputPort,
  type CancelMatchmakingInput,
  type CancelMatchmakingOutput,
} from '../ports/input/cancelMatchmakingInputPort'
import type { MatchmakingPoolPort } from '../ports/output/matchmakingPoolPort'

/**
 * Cancel Matchmaking Use Case
 */
export class CancelMatchmakingUseCase extends CancelMatchmakingInputPort {
  constructor(
    private readonly poolPort: MatchmakingPoolPort
  ) {
    super()
  }

  async execute(input: CancelMatchmakingInput): Promise<CancelMatchmakingOutput> {
    // 1. 查找配對條目
    const entry = await this.poolPort.findById(input.entryId)

    if (!entry) {
      return {
        success: false,
        errorCode: 'ENTRY_NOT_FOUND',
        message: 'Matchmaking entry not found or expired',
      }
    }

    // 2. 驗證條目是否屬於該玩家
    if (entry.playerId !== input.playerId) {
      return {
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'This matchmaking entry does not belong to you',
      }
    }

    // 3. 檢查條目是否仍可取消（只有 SEARCHING 和 LOW_AVAILABILITY 可取消）
    if (entry.status === 'MATCHED' || entry.status === 'CANCELLED') {
      return {
        success: false,
        errorCode: 'NOT_IN_QUEUE',
        message: 'Entry is not in queue (already matched or cancelled)',
      }
    }

    // 4. 從佇列中移除
    await this.poolPort.remove(input.entryId)

    return {
      success: true,
      message: 'Matchmaking cancelled',
    }
  }
}
