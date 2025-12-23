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

import { type Game, finishGame } from '~~/server/domain/game/game'
import type { ScoreMultipliers, RoundScoringData, PlayerScore, GameEndedReason } from '#shared/contracts'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { AutoActionInputPort } from '~~/server/application/ports/input/autoActionInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { TurnEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import {
  transitionAfterRoundDraw,
  type RoundTransitionResult,
} from '~~/server/domain/services/roundTransitionService'
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
   *
   * @description
   * 啟動 15 秒操作計時器，超時後執行代行（隨機選牌）。
   * 同時啟動閒置計時器（60 秒無主動操作後標記需確認）。
   */
  startTimeoutForPlayer(
    gameId: string,
    playerId: string,
    flowState: 'AWAITING_HAND_PLAY' | 'AWAITING_SELECTION' | 'AWAITING_DECISION'
  ): void {
    console.log(`[TurnFlowService] Starting timeout for player ${playerId}`)

    // 啟動 15 秒操作計時器
    this.gameTimeoutManager.startTimeout(
      gameId,
      gameConfig.turn_timeout_seconds,
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

    // 啟動閒置計時器（60 秒無主動操作後標記需確認）
    this.startIdleTimeoutIfNeeded(gameId, playerId)
  }

  /**
   * 處理玩家重連的計時器邏輯
   *
   * @description
   * 當玩家重連時：
   * 1. 操作計時器繼續倒數（玩家獲得剩餘時間）
   * 2. 啟動閒置計時器（若尚未啟動）
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  handlePlayerReconnected(gameId: string, playerId: string): void {
    const game = this.gameStore.get(gameId)
    if (!game || !game.currentRound || game.status !== 'IN_PROGRESS') {
      return
    }

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
   * 玩家主動操作時呼叫 - 重置閒置計時器、清除確認需求
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
   * 啟動顯示超時計時器
   *
   * @param gameId - 遊戲 ID
   * @param seconds - 超時秒數
   * @param onTimeout - 超時回調函數
   */
  startDisplayTimeout(gameId: string, seconds: number, onTimeout: () => void): void {
    this.gameTimeoutManager.startTimeout(
      gameId,
      seconds,
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
   * 計時器總時間 = displayTimeoutSeconds + confirmation_buffer_seconds
   * 這樣可以讓前端先顯示 Modal，再等待玩家確認。
   *
   * @param gameId - 遊戲 ID
   * @param _game - 遊戲狀態（未使用，從 gameStore 讀取最新狀態）
   * @param displayTimeoutSeconds - Modal 顯示秒數（預設 0）
   * @returns 是否有玩家需要確認
   */
  handleRoundEndConfirmation(
    gameId: string,
    _game: Game,
    displayTimeoutSeconds: number = 0
  ): boolean {
    // 從 gameStore 讀取最新狀態，確保閒置標記不被遺漏
    const latestGame = this.gameStore.get(gameId)
    if (!latestGame) {
      return false
    }

    const playersNeedingConfirmation = latestGame.pendingContinueConfirmations

    if (playersNeedingConfirmation.length === 0) {
      return false
    }

    // 總確認時間 = 顯示時間 + 額外緩衝
    const totalConfirmSeconds = displayTimeoutSeconds + gameConfig.confirmation_buffer_seconds

    // 為每個需要確認的玩家啟動確認超時計時器
    for (const playerId of playersNeedingConfirmation) {
      this.gameTimeoutManager.startContinueConfirmationTimeout(
        gameId,
        playerId,
        totalConfirmSeconds,
        () => {
          console.log(`[TurnFlowService] Confirmation timeout for player ${playerId} in game ${gameId}, ending game`)
          this.endGameDueToIdlePlayer(gameId, playerId)
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
   * 若所有玩家都已確認，啟動下一回合流程。
   *
   * @param gameId - 遊戲 ID
   * @param playerId - 玩家 ID
   */
  async handlePlayerConfirmContinue(gameId: string, playerId: string): Promise<void> {
    // 清除確認超時計時器
    this.gameTimeoutManager.clearContinueConfirmationTimeout(gameId, playerId)

    // 清除 Domain 狀態中的確認需求
    let game = this.gameStore.get(gameId)
    if (game && isConfirmationRequired(game, playerId)) {
      const updatedGame = clearRequireContinueConfirmation(game, playerId)
      this.gameStore.set(updatedGame)
      await this.gameRepository.save(updatedGame)
      game = updatedGame
      console.log(`[TurnFlowService] Player ${playerId} confirmed continue in game ${gameId}`)
    }

    // 重置閒置計時器（確認後重新開始計時）
    this.gameTimeoutManager.clearIdleTimeout(gameId, playerId)

    // 檢查所有玩家是否都已確認
    if (game && game.pendingContinueConfirmations.length === 0) {
      console.log(`[TurnFlowService] All players confirmed, continuing to next round`)

      // 啟動 display timeout，進入下一回合
      const firstPlayerId = game.currentRound?.activePlayerId
      this.startDisplayTimeout(gameId, gameConfig.result_display_seconds, () => {
        const currentGame = this.gameStore.get(gameId)
        if (!currentGame || currentGame.status === 'FINISHED') {
          return
        }

        const roundDealtEvent = this.eventMapper.toRoundDealtEvent(currentGame)
        this.eventPublisher.publishToGame(gameId, roundDealtEvent)

        if (firstPlayerId) {
          this.startTimeoutForPlayer(gameId, firstPlayerId, 'AWAITING_HAND_PLAY')
        }
      })
    }
  }

  /**
   * 結束遊戲（共用核心邏輯）
   *
   * @description
   * 統一處理遊戲結束的所有邏輯：
   * 1. 使用 Domain 函數設定遊戲為 FINISHED
   * 2. 清除所有計時器
   * 3. 發送 GameFinished 事件
   * 4. 從記憶體移除
   * 5. 發送事件（DB 成功後才通知前端）
   *
   * @param gameId - 遊戲 ID
   * @param winnerId - 勝者 ID（可選，若無則視為平局）
   * @param reason - 結束原因
   */
  private async endGame(
    gameId: string,
    winnerId: string | undefined,
    reason: GameEndedReason
  ): Promise<void> {
    const game = this.gameStore.get(gameId)
    if (!game) {
      console.warn(`[TurnFlowService] Game ${gameId} not found, cannot end game`)
      return
    }

    // 使用 Domain 函數結束遊戲
    const finishedGame = finishGame(game, winnerId)

    // 1. 先寫 DB（確保持久化成功）
    await this.gameRepository.save(finishedGame)

    // 2. 清除計時器
    this.gameTimeoutManager.clearAllForGame(gameId)

    // 3. 從記憶體移除
    this.gameStore.delete(gameId)

    // 4. 最後發送事件（DB 成功後才通知前端）
    const gameFinishedEvent = this.eventMapper.toGameFinishedEvent(
      winnerId ?? null,
      finishedGame.cumulativeScores,
      reason
    )
    this.eventPublisher.publishToGame(gameId, gameFinishedEvent)

    console.log(`[TurnFlowService] Game ${gameId} ended, reason: ${reason}, winner: ${winnerId ?? 'none'}`)
  }

  /**
   * 因閒置玩家未確認而結束遊戲
   *
   * @param gameId - 遊戲 ID
   * @param idlePlayerId - 閒置玩家 ID
   */
  async endGameDueToIdlePlayer(gameId: string, idlePlayerId: string): Promise<void> {
    try {
      const game = this.gameStore.get(gameId)
      if (!game) {
        console.warn(`[TurnFlowService] Game ${gameId} not found, cannot end game`)
        return
      }

      const otherPlayer = game.players.find(p => p.id !== idlePlayerId)
      const winnerId = otherPlayer?.id

      await this.endGame(gameId, winnerId, 'PLAYER_IDLE_TIMEOUT')
    } catch (error) {
      console.error(`[TurnFlowService] Failed to end game due to idle player:`, error)
    }
  }

  /**
   * 檢查並處理斷線/離開玩家（在回合結束時呼叫）
   *
   * @description
   * 若有玩家斷線或離開，結束遊戲並發送 GameFinished 事件。
   * 連線中的玩家為勝者。
   *
   * @param gameId - 遊戲 ID
   * @param game - 遊戲狀態
   * @returns 若有斷線玩家，返回 true；否則返回 false
   */
  async checkAndHandleDisconnectedPlayers(gameId: string, game: Game): Promise<boolean> {
    if (!hasDisconnectedOrLeftPlayers(game)) {
      return false
    }

    console.log(`[TurnFlowService] Found disconnected/left players in game ${gameId}, ending game`)

    // 找出連線中的玩家作為勝者
    const connectedPlayer = game.players.find(
      p => !isPlayerDisconnectedOrLeft(game, p.id)
    )
    const winnerId = connectedPlayer?.id

    await this.endGame(gameId, winnerId, 'PLAYER_DISCONNECTED')
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
      ? gameConfig.result_display_seconds
      : undefined

    // 檢查是否需要確認繼續遊戲（計時器總時間 = displayTimeout + confirmTimeout）
    const requireConfirmation = this.handleRoundEndConfirmation(gameId, updatedGame, displayTimeoutSeconds ?? 0)

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
    const gameEnded = await this.checkAndHandleDisconnectedPlayers(gameId, updatedGame)
    if (gameEnded) {
      // 已在 endGame() 中處理儲存和記憶體移除
      return updatedGame
    }

    // 根據確認需求和轉換結果決定下一步
    if (requireConfirmation) {
      // 需要確認：不啟動 display timeout
      // 等待玩家確認後由 handlePlayerConfirmContinue() 繼續流程
      console.log(`[TurnFlowService] Waiting for player confirmation before next round (draw)`)
    } else if (isNextRound) {
      // 不需要確認且有下一局：啟動 display timeout
      const firstPlayerId = updatedGame.currentRound?.activePlayerId
      this.startDisplayTimeout(gameId, displayTimeoutSeconds!, () => {
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
        // 先將更新寫入 gameStore，讓 endGame() 能取得最新狀態
        this.gameStore.set(updatedGame)
        await this.endGame(gameId, winner.winnerId ?? undefined, 'NORMAL')
        return updatedGame
      }
    }

    // 儲存更新（遊戲繼續的情況）
    this.gameStore.set(updatedGame)
    await this.gameRepository.save(updatedGame)

    return updatedGame
  }

  /**
   * 建立倍率資訊
   *
   * @description
   * 新規則：只要有任一方宣告過 Koi-Koi，分數就 ×2（全局共享）。
   *
   * @param game - 遊戲狀態
   * @returns 倍率資訊
   */
  buildMultipliers(game: Game): ScoreMultipliers {
    if (!game.currentRound) {
      return { player_multipliers: {}, koi_koi_applied: false }
    }

    // 檢查是否有任一玩家宣告過 Koi-Koi
    const koiKoiApplied = game.currentRound.koiStatuses.some(
      status => status.times_continued > 0
    )
    const multiplier = koiKoiApplied ? 2 : 1

    // 所有玩家使用相同的倍率
    const playerMultipliers: Record<string, number> = {}
    for (const koiStatus of game.currentRound.koiStatuses) {
      playerMultipliers[koiStatus.player_id] = multiplier
    }

    return { player_multipliers: playerMultipliers, koi_koi_applied: koiKoiApplied }
  }

  /**
   * 處理回合轉換結果
   *
   * @description
   * 根據 transitionResult 決定下一步：
   * - NEXT_ROUND：延遲發送 RoundDealt 事件，啟動玩家超時
   * - GAME_FINISHED：清除計時器，發送 GameFinished 事件
   *
   * @param gameId - 遊戲 ID
   * @param game - 遊戲狀態（已完成轉換）
   * @param transitionResult - 轉換結果
   * @param displayTimeoutSeconds - 顯示超時秒數
   */
  handleRoundTransitionResult(
    gameId: string,
    game: Game,
    transitionResult: RoundTransitionResult,
    displayTimeoutSeconds: number
  ): void {
    if (transitionResult.transitionType === 'NEXT_ROUND') {
      // 延遲發送 RoundDealt 事件（讓前端顯示結算畫面）
      const firstPlayerId = game.currentRound?.activePlayerId
      this.startDisplayTimeout(gameId, displayTimeoutSeconds, () => {
        const roundDealtEvent = this.eventMapper.toRoundDealtEvent(game)
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
  }

  /**
   * 處理計分回合結束（SCORED）
   *
   * @description
   * 統一處理回合結束後的所有邏輯：
   * 1. 檢查並啟動確認計時器
   * 2. 發送 RoundEnded 事件
   * 3. 檢查斷線玩家
   * 4. 根據確認需求決定是否啟動 display timeout
   *
   * @param gameId - 遊戲 ID
   * @param game - 遊戲狀態（已完成轉換）
   * @param transitionResult - 轉換結果
   * @param scoringData - 計分資料
   * @param includeAnimationDelay - 是否包含動畫延遲（用於「最後一手形成役種」情況，
   *                                前端需要先播放 TurnCompleted 動畫）
   * @returns 若遊戲已結束，返回 true；否則返回 false
   */
  async handleScoredRoundEnd(
    gameId: string,
    game: Game,
    transitionResult: RoundTransitionResult,
    scoringData: RoundScoringData,
    includeAnimationDelay: boolean = false
  ): Promise<boolean> {
    // 1. 計算 displayTimeoutSeconds
    const isNextRound = transitionResult.transitionType === 'NEXT_ROUND'
    // 若需要包含動畫延遲，將 card_play_animation_ms 轉換為秒並加到 timeout
    const animationDelaySeconds = includeAnimationDelay
      ? Math.ceil(gameConfig.card_play_animation_ms / 1000)
      : 0
    const displayTimeoutSeconds = isNextRound
      ? gameConfig.result_display_seconds + animationDelaySeconds
      : undefined

    // 2. 檢查是否需要確認繼續遊戲（計時器總時間 = displayTimeout + confirmTimeout）
    const requireConfirmation = this.handleRoundEndConfirmation(gameId, game, displayTimeoutSeconds ?? 0)

    // 3. 發送 RoundEnded 事件
    const roundEndedEvent = this.eventMapper.toRoundEndedEvent(
      'SCORED',
      game.cumulativeScores,
      scoringData,
      undefined,
      displayTimeoutSeconds,
      requireConfirmation
    )
    this.eventPublisher.publishToGame(gameId, roundEndedEvent)

    // 4. 檢查是否有斷線/離開玩家
    const gameEndedByDisconnect = await this.checkAndHandleDisconnectedPlayers(gameId, game)
    if (gameEndedByDisconnect) {
      return true  // 遊戲已結束
    }

    // 5. 根據確認需求決定下一步
    if (requireConfirmation) {
      // 需要確認：不啟動 display timeout
      // 等待玩家確認後由 handlePlayerConfirmContinue() 繼續流程
      console.log(`[TurnFlowService] Waiting for player confirmation before next round`)
    } else {
      // 不需要確認：根據 transitionResult 決定下一步
      if (transitionResult.transitionType === 'NEXT_ROUND') {
        // 繼續下一回合
        const firstPlayerId = game.currentRound?.activePlayerId
        this.startDisplayTimeout(gameId, displayTimeoutSeconds!, () => {
          const roundDealtEvent = this.eventMapper.toRoundDealtEvent(game)
          this.eventPublisher.publishToGame(gameId, roundDealtEvent)
          if (firstPlayerId) {
            this.startTimeoutForPlayer(gameId, firstPlayerId, 'AWAITING_HAND_PLAY')
          }
        })
      } else {
        // 遊戲結束
        const winner = transitionResult.winner
        if (winner) {
          // 先將更新寫入 gameStore，讓 endGame() 能取得最新狀態
          this.gameStore.set(game)
          await this.endGame(gameId, winner.winnerId ?? undefined, 'NORMAL')
          return true  // 遊戲已結束
        }
      }
    }

    return false  // 遊戲繼續
  }
}
