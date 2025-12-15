/**
 * TurnFlowService - Application Layer Internal Service
 *
 * @description
 * 回合流程服務的實作。
 * 封裝回合流程中的計時器啟動、流局處理等共用邏輯。
 *
 * 此服務由多個 Use Cases 共用，避免重複程式碼。
 *
 * @module server/application/services/turnFlowService
 */

import type { Game } from '~~/server/domain/game/game'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { AutoActionInputPort } from '~~/server/application/ports/input/autoActionInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { TurnEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import { transitionAfterRoundDraw } from '~~/server/domain/services/roundTransitionService'
import { gameConfig } from '~~/server/utils/config'

/**
 * TurnFlowService
 *
 * 回合流程服務，封裝共用的計時與流局處理邏輯。
 */
export class TurnFlowService {
  constructor(
    private readonly gameTimeoutManager: GameTimeoutPort,
    private readonly autoActionUseCase: AutoActionInputPort,
    private readonly gameStore: GameStorePort,
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly eventMapper: TurnEventMapperPort
  ) {}

  /**
   * 為玩家啟動操作超時計時器
   */
  startTimeoutForPlayer(
    gameId: string,
    playerId: string,
    flowState: 'AWAITING_HAND_PLAY' | 'AWAITING_SELECTION' | 'AWAITING_DECISION'
  ): void {
    this.gameTimeoutManager.startTimeout(
      gameId,
      gameConfig.action_timeout_seconds,
      () => {
        console.log(`[TurnFlowService] Timeout for player ${playerId} in game ${gameId}, executing auto-action`)
        this.autoActionUseCase.execute({
          gameId,
          playerId,
          currentFlowState: flowState,
        }).catch((error) => {
          console.error(`[TurnFlowService] Auto-action failed:`, error)
        })
      }
    )
  }

  /**
   * 啟動顯示超時計時器
   */
  startDisplayTimeout(gameId: string, onTimeout: () => void): void {
    this.gameTimeoutManager.startTimeout(
      gameId,
      gameConfig.display_timeout_seconds,
      onTimeout
    )
  }

  /**
   * 處理流局（牌堆或手牌耗盡且無役種）
   */
  async handleRoundDraw(gameId: string, game: Game): Promise<Game> {
    // 使用 Domain Service 處理流局轉換
    const transitionResult = transitionAfterRoundDraw(game)
    const updatedGame = transitionResult.game

    // 根據轉換結果決定 displayTimeoutSeconds
    const isNextRound = transitionResult.transitionType === 'NEXT_ROUND'
    const displayTimeoutSeconds = isNextRound
      ? gameConfig.display_timeout_seconds
      : undefined

    // 發送 RoundDrawn 事件
    const roundDrawnEvent = this.eventMapper.toRoundDrawnEvent(
      updatedGame.cumulativeScores,
      displayTimeoutSeconds
    )
    this.eventPublisher.publishToGame(gameId, roundDrawnEvent)

    // 根據轉換結果決定下一步
    if (isNextRound) {
      // 延遲後發送 RoundDealt 事件（讓前端顯示流局畫面）
      const firstPlayerId = updatedGame.currentRound?.activePlayerId
      this.startDisplayTimeout(gameId, () => {
        const roundDealtEvent = this.eventMapper.toRoundDealtEvent(updatedGame)
        this.eventPublisher.publishToGame(gameId, roundDealtEvent)

        // 啟動新回合第一位玩家的超時
        if (firstPlayerId) {
          this.startTimeoutForPlayer(gameId, firstPlayerId, 'AWAITING_HAND_PLAY')
        }
      })
    } else {
      // 遊戲結束
      const winner = transitionResult.winner
      if (winner) {
        const gameFinishedEvent = this.eventMapper.toGameFinishedEvent(
          winner.winnerId,
          winner.finalScores
        )
        this.eventPublisher.publishToGame(gameId, gameFinishedEvent)
      }
    }

    // 儲存更新
    this.gameStore.set(updatedGame)
    await this.gameRepository.save(updatedGame)

    return updatedGame
  }
}
