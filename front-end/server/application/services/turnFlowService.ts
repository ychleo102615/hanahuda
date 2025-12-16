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
import type { LeaveGameInputPort } from '~~/server/application/ports/input/leaveGameInputPort'
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
  private leaveGameUseCase?: LeaveGameInputPort

  constructor(
    private readonly gameTimeoutManager: GameTimeoutPort,
    private readonly autoActionUseCase: AutoActionInputPort,
    private readonly gameStore: GameStorePort,
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly eventMapper: TurnEventMapperPort
  ) {}

  /**
   * 設定 LeaveGameUseCase（用於解決循環依賴）
   */
  setLeaveGameUseCase(useCase: LeaveGameInputPort): void {
    this.leaveGameUseCase = useCase
  }

  /**
   * 為玩家啟動操作超時計時器
   *
   * @description
   * 同時啟動兩種計時器：
   * 1. 操作超時（15秒）：超時後代行
   * 2. 閒置超時（60秒）：持續無主動操作後踢出遊戲
   */
  startTimeoutForPlayer(
    gameId: string,
    playerId: string,
    flowState: 'AWAITING_HAND_PLAY' | 'AWAITING_SELECTION' | 'AWAITING_DECISION'
  ): void {
    // 啟動操作超時計時器（15秒後代行）
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

    // 啟動閒置超時計時器（60秒無主動操作後踢出）
    // 只在回合開始時啟動，若已有計時器則保持原狀（因為代行不重置閒置計時器）
    this.startIdleTimeoutIfNeeded(gameId, playerId)
  }

  /**
   * 啟動閒置超時計時器（若尚未啟動）
   *
   * @description
   * 閒置計時器在玩家首次進入回合時啟動，
   * 只有玩家「主動」操作時才會重置。
   * 代行操作不會重置閒置計時器。
   * 若已有計時器則不重新啟動，確保持續代行會累積到 60 秒。
   */
  private startIdleTimeoutIfNeeded(gameId: string, playerId: string): void {
    // 檢查遊戲是否仍然存在
    const game = this.gameStore.get(gameId)
    if (!game || game.status === 'FINISHED') {
      return
    }

    // 檢查玩家是否為 AI（AI 不需要閒置計時）
    const player = game.players.find(p => p.id === playerId)
    if (player?.isAi) {
      return
    }

    // 若已有閒置計時器，不重新啟動（讓計時器繼續倒數）
    if (this.gameTimeoutManager.hasIdleTimeout(gameId, playerId)) {
      return
    }

    // 只在沒有計時器時才啟動
    this.gameTimeoutManager.startIdleTimeout(
      gameId,
      playerId,
      () => {
        console.log(`[TurnFlowService] Idle timeout for player ${playerId} in game ${gameId}, kicking player`)
        this.kickIdlePlayer(gameId, playerId)
      }
    )
  }

  /**
   * 踢出閒置玩家
   */
  private kickIdlePlayer(gameId: string, playerId: string): void {
    if (!this.leaveGameUseCase) {
      console.error(`[TurnFlowService] LeaveGameUseCase not set, cannot kick idle player`)
      return
    }

    this.leaveGameUseCase.execute({ gameId, playerId }).catch((error) => {
      console.error(`[TurnFlowService] Failed to kick idle player:`, error)
    })
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
        // 清除遊戲的所有計時器
        this.gameTimeoutManager.clearAllForGame(gameId)

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
