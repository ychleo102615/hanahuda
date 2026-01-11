/**
 * JoinGameAsAiUseCase - Application Layer
 *
 * @description
 * 處理 AI 對手加入遊戲的用例。
 * 與 JoinGameUseCase 分離，專門處理 AI 玩家的加入邏輯。
 *
 * 差異點：
 * - AI 玩家標記 isAi = true
 * - 不產生 sessionToken（AI 不會斷線重連）
 * - 不建立 SSE 連線（AI 透過 OpponentInstance 接收事件）
 *
 * 委託 GameStartService 處理共用的遊戲開始邏輯。
 *
 * @module server/application/use-cases/joinGameAsAiUseCase
 */

import { createPlayer } from '~~/server/core-game/domain/game/player'
import type { GameStorePort } from '~~/server/core-game/application/ports/output/gameStorePort'
import type { GameLockPort } from '~~/server/core-game/application/ports/output/gameLockPort'
import {
  JoinGameAsAiInputPort,
  type JoinGameAsAiInput,
  type JoinGameAsAiOutput,
} from '~~/server/core-game/application/ports/input/joinGameAsAiInputPort'
import type { GameStartService } from '~~/server/core-game/application/services/gameStartService'

/**
 * JoinGameAsAiUseCase
 *
 * 處理 AI 對手加入遊戲的完整流程。
 * 委託 GameStartService 處理遊戲開始邏輯。
 */
export class JoinGameAsAiUseCase extends JoinGameAsAiInputPort {
  constructor(
    private readonly gameStore: GameStorePort,
    private readonly gameLock: GameLockPort,
    private readonly gameStartService: GameStartService
  ) {
    super()
  }

  /**
   * 執行 AI 加入遊戲用例
   *
   * @param input - AI 加入遊戲參數
   * @returns AI 加入結果
   */
  async execute(input: JoinGameAsAiInput): Promise<JoinGameAsAiOutput> {
    const { playerId, playerName, gameId } = input

    // 使用悲觀鎖確保同一遊戲的操作互斥執行
    return this.gameLock.withLock(gameId, async () => {
      // 1. 取得目標遊戲
      const waitingGame = this.gameStore.get(gameId)

      if (!waitingGame) {
        console.warn('[JoinGameAsAiUseCase] Game not found:', gameId)
        return {
          gameId,
          playerId,
          success: false,
        }
      }

      if (waitingGame.status !== 'WAITING') {
        console.warn('[JoinGameAsAiUseCase] Game not in WAITING status:', gameId, 'status:', waitingGame.status)
        return {
          gameId,
          playerId,
          success: false,
        }
      }

      // 2. 建立 AI 玩家（isAi = true）
      const aiPlayer = createPlayer({
        id: playerId,
        name: playerName,
        isAi: true,
      })

      // 3. 委託 GameStartService 處理遊戲開始邏輯
      await this.gameStartService.startGameWithSecondPlayer({
        waitingGame,
        secondPlayer: aiPlayer,
        isAi: true,
        playerName,
        // AI 不需要 sessionToken
      })

      return {
        gameId,
        playerId,
        success: true,
      }
    }) // end of withLock
  }
}
