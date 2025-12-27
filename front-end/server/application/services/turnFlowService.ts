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

import { type Game, finishGame, finishRound, finishRoundDraw, startRound, endRound } from '~~/server/domain/game/game'
import { isLastRound } from '~~/server/domain/game/gameQueries'
import type { SpecialRuleResult } from '~~/server/domain/services/specialRulesService'
import type { RoundEndReason } from '#shared/contracts'
import { calculateWinner } from '~~/server/domain/game/gameEndConditions'
import type { ScoreMultipliers, RoundScoringData, PlayerScore, GameEndedReason } from '#shared/contracts'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { AutoActionInputPort } from '~~/server/application/ports/input/autoActionInputPort'
import type { RecordGameStatsInputPort } from '~~/server/application/ports/input/recordGameStatsInputPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { TurnEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type { GameLockPort } from '~~/server/application/ports/output/gameLockPort'
import {
  transitionAfterRoundDraw,
  finalizeRoundAndTransition,
  type RoundTransitionResult,
} from '~~/server/domain/services/roundTransitionService'
import type { RoundEndResult } from '~~/server/domain/round'
import {
  setRequireContinueConfirmation,
  clearRequireContinueConfirmation,
  isConfirmationRequired,
  isPlayerDisconnectedOrLeft,
  hasDisconnectedOrLeftPlayers,
} from '~~/server/domain/game/playerConnection'
import { gameConfig } from '~~/server/utils/config'
import { loggers } from '~~/server/utils/logger'

/** Module logger instance */
const logger = loggers.useCase('TurnFlow')

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
    private readonly eventMapper: TurnEventMapperPort,
    private readonly gameLock: GameLockPort,
    private readonly recordGameStatsUseCase?: RecordGameStatsInputPort
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
    logger.info('Starting timeout for player', { playerId, gameId, flowState })

    // 啟動 15 秒操作計時器
    this.gameTimeoutManager.startTimeout(
      gameId,
      gameConfig.turn_timeout_seconds,
      () => {
        logger.info('Action timeout, executing auto-action', { playerId, gameId })
        this.autoActionUseCase.execute({
          gameId,
          playerId,
          currentFlowState: flowState,
        }).catch((error) => {
          logger.error('Auto-action failed', error, { playerId, gameId })
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
    logger.info('Player reconnected', { playerId, gameId, remainingSeconds })

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
        logger.info('Idle timeout, marking for confirmation', { playerId, gameId })
        this.markPlayerRequiresConfirmation(gameId, playerId).catch((error) => {
          logger.error('Failed to mark player for confirmation', error, { playerId, gameId })
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
    // 使用悲觀鎖確保同一遊戲的操作互斥執行（此方法從超時回調調用）
    await this.gameLock.withLock(gameId, async () => {
      const game = this.gameStore.get(gameId)
      if (!game || game.status === 'FINISHED') {
        return
      }

      // 使用 Domain Layer 函數設置確認需求
      const updatedGame = setRequireContinueConfirmation(game, playerId)

      // 儲存更新
      this.gameStore.set(updatedGame)
      await this.gameRepository.save(updatedGame)

      logger.info('Marked player as requiring confirmation', { playerId, gameId })
    })
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
      logger.info('Cleared confirmation requirement', { playerId, gameId })
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
          logger.info('Confirmation timeout, ending game', { playerId, gameId })
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
      logger.info('Player confirmed continue', { playerId, gameId })
    }

    // 重置閒置計時器（確認後重新開始計時）
    this.gameTimeoutManager.clearIdleTimeout(gameId, playerId)

    // 檢查所有玩家是否都已確認
    if (game && game.pendingContinueConfirmations.length === 0) {
      logger.info('All players confirmed, continuing to next round', { gameId })

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
      logger.warn('Game not found, cannot end game', { gameId })
      return
    }

    // 使用 Domain 函數結束遊戲
    const finishedGame = finishGame(game, winnerId)

    // 記錄遊戲統計（非正常結束也需要記錄勝負）
    if (this.recordGameStatsUseCase) {
      try {
        await this.recordGameStatsUseCase.execute({
          gameId,
          winnerId: winnerId ?? null,
          finalScores: finishedGame.cumulativeScores,
          winnerYakuList: [], // 非正常結束沒有役種資訊
          winnerKoiMultiplier: 1, // 非正常結束沒有倍率
          players: finishedGame.players,
        })
      } catch (error) {
        logger.error('Failed to record game stats', error, { gameId })
        // 統計記錄失敗不應影響遊戲結束流程
      }
    }

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

    logger.info('Game ended', { gameId, reason, winnerId: winnerId ?? 'none' })
  }

  /**
   * 因閒置玩家未確認而結束遊戲
   *
   * @param gameId - 遊戲 ID
   * @param idlePlayerId - 閒置玩家 ID
   */
  async endGameDueToIdlePlayer(gameId: string, idlePlayerId: string): Promise<void> {
    // 使用悲觀鎖確保同一遊戲的操作互斥執行（此方法可能從超時回調調用）
    await this.gameLock.withLock(gameId, async () => {
      try {
        const game = this.gameStore.get(gameId)
        if (!game) {
          logger.warn('Game not found, cannot end game', { gameId })
          return
        }

        // 依分數決定勝者（而非閒置狀態）
        const winnerResult = calculateWinner(game)
        const winnerId = winnerResult.winnerId ?? undefined

        await this.endGame(gameId, winnerId, 'PLAYER_IDLE_TIMEOUT')
      } catch (error) {
        logger.error('Failed to end game due to idle player', error, { gameId })
      }
    })
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

    logger.info('Found disconnected/left players, ending game', { gameId })

    // 依分數決定勝者（而非連線狀態）
    const winnerResult = calculateWinner(game)
    const winnerId = winnerResult.winnerId ?? undefined

    // 先將更新寫入 gameStore，讓 endGame() 能取得最新狀態（包含當前回合的分數）
    this.gameStore.set(game)

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
      logger.info('Waiting for player confirmation before next round (draw)', { gameId })
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
   * 計分規則：
   * 1. Koi-Koi 倍率：只要有任一方宣告過 Koi-Koi，分數就 ×2（全局共享）
   * 2. 7 點翻倍：基礎分數 ≥ 7 時，最終分數再 ×2
   *
   * @param game - 遊戲狀態
   * @param isScoreDoubled - 是否觸發 7 點翻倍（預設為 false，結算時由外部傳入）
   * @returns 倍率資訊
   */
  buildMultipliers(game: Game, isScoreDoubled: boolean = false): ScoreMultipliers {
    if (!game.currentRound) {
      return { player_multipliers: {}, koi_koi_applied: false, is_score_doubled: false }
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

    return {
      player_multipliers: playerMultipliers,
      koi_koi_applied: koiKoiApplied,
      is_score_doubled: isScoreDoubled,
    }
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
   * 使用新的「局間歸屬上一局尾部」語意處理回合結束：
   * 1. 使用 endRound() 設定結算狀態（保留 currentRound，flowState = 'ROUND_ENDED'）
   * 2. 發送 RoundEnded 事件
   * 3. 檢查斷線玩家
   * 4. 倒數結束後呼叫 finalizeRoundAndTransition() 完成轉換
   *
   * @param gameId - 遊戲 ID
   * @param game - 遊戲狀態（原始狀態，尚未轉換）
   * @param winnerId - 勝者 ID
   * @param roundEndResult - 局結束計算結果
   * @param multipliers - 倍率資訊
   * @param includeAnimationDelay - 是否包含動畫延遲
   * @returns 若遊戲已結束，返回 true；否則返回 false
   */
  async handleScoredRoundEnd(
    gameId: string,
    game: Game,
    winnerId: string,
    roundEndResult: RoundEndResult,
    multipliers: ScoreMultipliers,
    includeAnimationDelay: boolean = false
  ): Promise<boolean> {
    // 1. 判斷是否為最後一局
    const lastRound = isLastRound(game)

    // 2. 計算 displayTimeoutSeconds（最後一局不需要倒數，因為不會進入下一局）
    const animationDelaySeconds = includeAnimationDelay
      ? Math.ceil(gameConfig.card_play_animation_ms / 1000)
      : 0
    const displayTimeoutSeconds = lastRound
      ? undefined
      : gameConfig.result_display_seconds + animationDelaySeconds

    // 3. 建立 RoundScoringData
    const scoringData: RoundScoringData = {
      winner_id: winnerId,
      yaku_list: roundEndResult.yakuList,
      base_score: roundEndResult.baseScore,
      final_score: roundEndResult.finalScore,
      multipliers,
    }

    // 4. 使用 endRound() 設定結算狀態（不執行 finishRound）
    //    傳入 totalTimeoutSeconds 供重連時計算剩餘秒數
    let updatedGame = endRound(game, {
      reason: 'SCORED',
      winnerId,
      awardedPoints: roundEndResult.finalScore,
      scoringData,
      totalTimeoutSeconds: displayTimeoutSeconds,
    })

    // 儲存更新（此時 flowState = 'ROUND_ENDED'，重連可正確顯示 RoundEndedModal）
    this.gameStore.set(updatedGame)
    await this.gameRepository.save(updatedGame)

    // 5. 檢查是否需要確認繼續遊戲（最後一局不需要確認）
    const requireConfirmation = lastRound
      ? false
      : this.handleRoundEndConfirmation(gameId, updatedGame, displayTimeoutSeconds ?? 0)

    // 6. 發送 RoundEnded 事件（使用更新後的累積分數預覽，但實際尚未計入）
    //    預覽分數用於前端顯示
    const previewScores = game.cumulativeScores.map((ps) =>
      ps.player_id === winnerId
        ? { player_id: ps.player_id, score: ps.score + roundEndResult.finalScore }
        : ps
    )
    const roundEndedEvent = this.eventMapper.toRoundEndedEvent(
      'SCORED',
      previewScores,
      scoringData,
      undefined,
      displayTimeoutSeconds,
      requireConfirmation
    )
    this.eventPublisher.publishToGame(gameId, roundEndedEvent)

    // 7. 檢查是否有斷線/離開玩家
    const gameEndedByDisconnect = await this.checkAndHandleDisconnectedPlayers(gameId, updatedGame)
    if (gameEndedByDisconnect) {
      return true
    }

    // 8. 根據確認需求決定下一步
    if (lastRound) {
      // 最後一局：直接執行局轉換（會發送 GameFinished 事件）
      logger.info('Last round ended, finalizing game', { gameId })
      await this.handleFinalizeRound(gameId)
      return true
    } else if (requireConfirmation) {
      logger.info('Waiting for player confirmation before next round', { gameId })
    } else {
      // 啟動 display timeout，倒數結束後執行 finalizeRoundAndTransition
      this.startDisplayTimeout(gameId, displayTimeoutSeconds!, async () => {
        await this.handleFinalizeRound(gameId)
      })
    }

    return false
  }

  /**
   * 執行局轉換（倒數結束後呼叫）
   *
   * @description
   * 從 ROUND_ENDED 狀態執行實際的局轉換：
   * 1. 呼叫 finalizeRoundAndTransition()
   * 2. 根據結果發送 RoundDealt 或 GameFinished 事件
   */
  private async handleFinalizeRound(gameId: string): Promise<void> {
    const currentGame = this.gameStore.get(gameId)
    if (!currentGame || currentGame.status === 'FINISHED') {
      return
    }

    try {
      // 執行實際的局轉換
      const transitionResult = finalizeRoundAndTransition(currentGame)
      const updatedGame = transitionResult.game

      // 儲存更新
      this.gameStore.set(updatedGame)
      await this.gameRepository.save(updatedGame)

      if (transitionResult.transitionType === 'NEXT_ROUND') {
        // 發送 RoundDealt 事件
        const roundDealtEvent = this.eventMapper.toRoundDealtEvent(updatedGame)
        this.eventPublisher.publishToGame(gameId, roundDealtEvent)

        // 啟動新回合第一位玩家的超時
        const firstPlayerId = updatedGame.currentRound?.activePlayerId
        if (firstPlayerId) {
          this.startTimeoutForPlayer(gameId, firstPlayerId, 'AWAITING_HAND_PLAY')
        }
      } else {
        // 遊戲結束
        const winner = transitionResult.winner
        if (winner) {
          await this.endGame(gameId, winner.winnerId ?? undefined, 'NORMAL')
        }
      }
    } catch (error) {
      logger.error('Failed to finalize round', error, { gameId })
    }
  }

  /**
   * 處理開局特殊規則觸發
   *
   * @description
   * 使用新的「局間歸屬上一局尾部」語意：
   * 1. 發送 RoundDealtEvent（前端播放發牌動畫）
   * 2. 使用 endRound() 設定結算狀態（保留 currentRound，flowState = 'ROUND_ENDED'）
   * 3. 發送 RoundEndedEvent
   * 4. 倒數結束後呼叫 finalizeRoundAndTransition()
   *
   * @param gameId - 遊戲 ID
   * @param game - 遊戲狀態（已發牌但尚未 finishRound）
   * @param specialRuleResult - 特殊規則結果
   */
  async handleSpecialRuleTriggered(
    gameId: string,
    game: Game,
    specialRuleResult: SpecialRuleResult
  ): Promise<void> {
    logger.info('Handling special rule triggered', {
      gameId,
      type: specialRuleResult.type,
      winnerId: specialRuleResult.winnerId,
    })

    // 1. 發送 RoundDealtEvent（特殊規則版本：next_state = null, timeout = 0）
    //    前端會開始發牌動畫，但不啟動倒數、不允許操作
    const roundDealtEvent = this.eventMapper.toRoundDealtEventForSpecialRule(game)
    this.eventPublisher.publishToGame(gameId, roundDealtEvent)

    // 2. 判斷是否為最後一局
    const lastRound = isLastRound(game)

    // 3. 計算 displayTimeoutSeconds（發牌動畫 + 結果顯示，最後一局不需要倒數）
    const displayTimeoutSeconds = lastRound
      ? undefined
      : gameConfig.dealing_animation_seconds + gameConfig.result_display_seconds

    // 4. 使用 endRound() 設定結算狀態（保留 currentRound）
    //    傳入 totalTimeoutSeconds 供重連時計算剩餘秒數
    const reason = this.toRoundEndReason(specialRuleResult)
    const updatedGame = endRound(game, {
      reason,
      winnerId: specialRuleResult.winnerId,
      awardedPoints: specialRuleResult.awardedPoints,
      instantData: {
        winner_id: specialRuleResult.winnerId,
        awarded_points: specialRuleResult.awardedPoints,
      },
      totalTimeoutSeconds: displayTimeoutSeconds,
    })

    // 5. 儲存狀態（此時 flowState = 'ROUND_ENDED'，重連可正確顯示 RoundEndedModal）
    this.gameStore.set(updatedGame)
    await this.gameRepository.save(updatedGame)

    // 6. 發送 RoundEndedEvent（前端 EventRouter 會等發牌動畫結束後處理）
    //    使用預覽分數（尚未計入累積分數）
    const previewScores = game.cumulativeScores.map((ps) =>
      ps.player_id === specialRuleResult.winnerId
        ? { player_id: ps.player_id, score: ps.score + specialRuleResult.awardedPoints }
        : ps
    )
    const roundEndedEvent = this.eventMapper.toRoundEndedEvent(
      reason,
      previewScores,
      undefined, // scoringData
      {
        winner_id: specialRuleResult.winnerId,
        awarded_points: specialRuleResult.awardedPoints,
      },
      displayTimeoutSeconds,
      false // requireConfirmation
    )
    this.eventPublisher.publishToGame(gameId, roundEndedEvent)

    logger.info('Special rule RoundEnded event published', {
      gameId,
      reason,
      lastRound,
    })

    // 7. 根據是否為最後一局決定下一步
    if (lastRound) {
      // 最後一局：直接執行局轉換（會發送 GameFinished 事件）
      logger.info('Last round with special rule, finalizing game', { gameId })
      await this.handleFinalizeRound(gameId)
    } else {
      // 啟動 display timeout，倒數結束後執行 finalizeRoundAndTransition
      this.startDisplayTimeout(gameId, displayTimeoutSeconds!, async () => {
        await this.handleFinalizeRound(gameId)
      })
    }
  }

  /**
   * 將 SpecialRuleType 轉換為 RoundEndReason
   */
  private toRoundEndReason(result: SpecialRuleResult): RoundEndReason {
    switch (result.type) {
      case 'TESHI':
        return 'INSTANT_TESHI'
      case 'KUTTSUKI':
        return 'INSTANT_KUTTSUKI'
      case 'FIELD_TESHI':
        return 'INSTANT_FIELD_TESHI'
      default:
        return 'DRAWN'
    }
  }

}
