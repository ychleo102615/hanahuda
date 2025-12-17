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
import {
  setRequireContinueConfirmation,
  clearRequireContinueConfirmation,
  isConfirmationRequired,
  isPlayerDisconnectedOrLeft,
  hasDisconnectedOrLeftPlayers,
} from '~~/server/domain/game/playerConnection'
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
   * 計時器語意分離：
   * - **操作計時器**：永遠 15 秒，代表玩家標準操作時間
   * - **加速代行計時器**：3 秒，僅用於斷線/離開玩家（會搶先觸發）
   *
   * 斷線玩家會同時有兩個計時器，3 秒計時器先到期觸發代行。
   * 玩家重連時清除加速計時器，保留操作計時器繼續倒數。
   */
  startTimeoutForPlayer(
    gameId: string,
    playerId: string,
    flowState: 'AWAITING_HAND_PLAY' | 'AWAITING_SELECTION' | 'AWAITING_DECISION'
  ): void {
    const game = this.gameStore.get(gameId)
    const isDisconnected = game ? isPlayerDisconnectedOrLeft(game, playerId) : false

    console.log(`[TurnFlowService] Starting timeout for player ${playerId} (disconnected/left: ${isDisconnected})`)

    // 永遠啟動 15 秒操作計時器
    this.gameTimeoutManager.startTimeout(
      gameId,
      gameConfig.action_timeout_seconds,
      () => {
        console.log(`[TurnFlowService] Action timeout for player ${playerId} in game ${gameId}, executing auto-action`)
        this.autoActionUseCase.execute({
          gameId,
          playerId,
          currentFlowState: flowState,
        }).catch((error) => {
          console.error(`[TurnFlowService] Auto-action failed:`, error)
        })
      }
    )

    // 若斷線/離開，額外啟動 3 秒加速計時器（會搶先觸發）
    if (isDisconnected) {
      this.gameTimeoutManager.startAcceleratedTimeout(
        gameId,
        playerId,
        () => {
          console.log(`[TurnFlowService] Accelerated timeout for disconnected player ${playerId}`)
          // 先清除 15 秒計時器，避免重複觸發
          this.gameTimeoutManager.clearTimeout(gameId)
          this.autoActionUseCase.execute({
            gameId,
            playerId,
            currentFlowState: flowState,
          }).catch((error) => {
            console.error(`[TurnFlowService] Auto-action failed:`, error)
          })
        }
      )
    } else {
      // 正常玩家啟動閒置計時器（60秒無主動操作後標記需確認）
      this.startIdleTimeoutIfNeeded(gameId, playerId)
    }
  }

  /**
   * 處理玩家重連的計時器邏輯
   *
   * @description
   * 當玩家重連時：
   * 1. 清除加速代行計時器（若存在）
   * 2. 操作計時器繼續倒數（玩家獲得剩餘時間）
   * 3. 啟動閒置計時器（若尚未啟動）
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  handlePlayerReconnected(gameId: string, playerId: string): void {
    const game = this.gameStore.get(gameId)
    if (!game || !game.currentRound || game.status !== 'IN_PROGRESS') {
      return
    }

    // 清除加速代行計時器
    this.gameTimeoutManager.clearAcceleratedTimeout(gameId, playerId)

    // 檢查是否輪到此玩家
    if (game.currentRound.activePlayerId !== playerId) {
      return
    }

    const remainingSeconds = this.gameTimeoutManager.getRemainingSeconds(gameId)
    console.log(`[TurnFlowService] Player ${playerId} reconnected, remaining: ${remainingSeconds}s`)

    // 啟動閒置計時器（重連玩家應有閒置追蹤）
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
  protected startIdleTimeoutIfNeeded(gameId: string, playerId: string): void {
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
        console.log(`[TurnFlowService] Idle timeout for player ${playerId} in game ${gameId}, marking for confirmation`)
        this.markPlayerRequiresConfirmation(gameId, playerId).catch((error) => {
          console.error(`[TurnFlowService] Failed to mark player for confirmation:`, error)
        })
      }
    )
  }

  /**
   * 標記閒置玩家需要確認繼續遊戲
   *
   * @description
   * 當玩家閒置超過 60 秒時呼叫。
   * 設置 `requireContinueConfirmation = true`，在回合結束時顯示確認提示。
   */
  private async markPlayerRequiresConfirmation(gameId: string, playerId: string): Promise<void> {
    const game = this.gameStore.get(gameId)
    if (!game || game.status === 'FINISHED') {
      return
    }

    // 使用 Domain Layer 函數設置確認需求
    const updatedGame = setRequireContinueConfirmation(game, playerId)

    // 儲存更新
    this.gameStore.set(updatedGame)
    await this.gameRepository.save(updatedGame)

    console.log(`[TurnFlowService] Marked player ${playerId} as requiring confirmation in game ${gameId}`)
  }

  /**
   * 玩家主動操作時呼叫 - 重置閒置計時器並清除確認需求
   *
   * @description
   * 當玩家主動執行操作（非被代行）時呼叫此方法。
   * 1. 重置閒置計時器
   * 2. 清除確認繼續遊戲的需求（若有）
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  async handlePlayerActiveOperation(gameId: string, playerId: string): Promise<void> {
    // 重置閒置計時器
    this.gameTimeoutManager.resetIdleTimeout(gameId, playerId)

    // 清除確認需求（若有）
    const game = this.gameStore.get(gameId)
    if (game && isConfirmationRequired(game, playerId)) {
      const updatedGame = clearRequireContinueConfirmation(game, playerId)
      this.gameStore.set(updatedGame)
      await this.gameRepository.save(updatedGame)
      console.log(`[TurnFlowService] Cleared confirmation requirement for player ${playerId} in game ${gameId}`)
    }
  }

  /**
   * 檢查指定玩家是否需要確認繼續遊戲
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   * @returns 是否需要確認
   */
  isPlayerConfirmationRequired(gameId: string, playerId: string): boolean {
    const game = this.gameStore.get(gameId)
    if (!game) {
      return false
    }
    return isConfirmationRequired(game, playerId)
  }

  /**
   * 踢出閒置玩家（確認超時後呼叫）
   */
  kickIdlePlayer(gameId: string, playerId: string): void {
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
   * 處理回合結束時的確認邏輯
   *
   * @description
   * 檢查是否有玩家需要確認繼續遊戲，
   * 若有則啟動確認超時計時器。
   *
   * @param gameId - 遊戲 ID
   * @param game - 遊戲狀態
   * @returns 是否有玩家需要確認
   */
  handleRoundEndConfirmation(gameId: string, game: Game): boolean {
    const playersNeedingConfirmation = game.pendingContinueConfirmations

    if (playersNeedingConfirmation.length === 0) {
      return false
    }

    // 為每個需要確認的玩家啟動確認超時計時器
    for (const playerId of playersNeedingConfirmation) {
      this.gameTimeoutManager.startContinueConfirmationTimeout(
        gameId,
        playerId,
        () => {
          console.log(`[TurnFlowService] Confirmation timeout for player ${playerId} in game ${gameId}, kicking player`)
          this.kickIdlePlayer(gameId, playerId)
        }
      )
    }

    return true
  }

  /**
   * 處理玩家確認繼續遊戲
   *
   * @description
   * 清除確認超時計時器，清除 Domain 狀態中的確認需求。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  async handlePlayerConfirmContinue(gameId: string, playerId: string): Promise<void> {
    // 清除確認超時計時器
    this.gameTimeoutManager.clearContinueConfirmationTimeout(gameId, playerId)

    // 清除 Domain 狀態中的確認需求
    const game = this.gameStore.get(gameId)
    if (game && isConfirmationRequired(game, playerId)) {
      const updatedGame = clearRequireContinueConfirmation(game, playerId)
      this.gameStore.set(updatedGame)
      await this.gameRepository.save(updatedGame)
      console.log(`[TurnFlowService] Player ${playerId} confirmed continue in game ${gameId}`)
    }

    // 重置閒置計時器（確認後重新開始計時）
    this.gameTimeoutManager.clearIdleTimeout(gameId, playerId)
  }

  /**
   * 檢查並處理斷線/離開玩家（在回合結束時呼叫）
   *
   * @description
   * 若有玩家斷線或離開，發送 GameEnded 事件並結束遊戲。
   * 連線中的玩家為勝者。
   *
   * @param gameId - 遊戲 ID
   * @param game - 遊戲狀態
   * @returns 是否有斷線/離開玩家（已處理遊戲結束）
   */
  checkAndHandleDisconnectedPlayers(gameId: string, game: Game): boolean {
    if (!hasDisconnectedOrLeftPlayers(game)) {
      return false
    }

    console.log(`[TurnFlowService] Found disconnected/left players in game ${gameId}, ending game`)

    // 找出連線中的玩家作為勝者
    const connectedPlayer = game.players.find(
      p => !isPlayerDisconnectedOrLeft(game, p.id)
    )

    // 清除遊戲的所有計時器
    this.gameTimeoutManager.clearAllForGame(gameId)

    // 發送 GameFinished 事件
    const winnerId = connectedPlayer?.id ?? null
    const finalScores = game.cumulativeScores

    const gameFinishedEvent = this.eventMapper.toGameFinishedEvent(
      winnerId,
      finalScores,
      'PLAYER_DISCONNECTED'
    )
    this.eventPublisher.publishToGame(gameId, gameFinishedEvent)

    console.log(`[TurnFlowService] Game ${gameId} ended due to disconnected player, winner: ${winnerId ?? 'none'}`)

    return true
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

    // 檢查是否需要確認繼續遊戲
    const requireConfirmation = this.handleRoundEndConfirmation(gameId, updatedGame)

    // 發送 RoundEnded 事件（reason: DRAWN）
    const roundEndedEvent = this.eventMapper.toRoundEndedEvent(
      'DRAWN',
      updatedGame.cumulativeScores,
      undefined,
      undefined,
      displayTimeoutSeconds,
      requireConfirmation
    )
    this.eventPublisher.publishToGame(gameId, roundEndedEvent)

    // 檢查是否有斷線/離開玩家（Phase 5: 回合結束時檢查）
    if (this.checkAndHandleDisconnectedPlayers(gameId, updatedGame)) {
      // 已處理遊戲結束，儲存後直接返回
      this.gameStore.set(updatedGame)
      await this.gameRepository.save(updatedGame)
      return updatedGame
    }

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
          winner.finalScores,
          'NORMAL'
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
