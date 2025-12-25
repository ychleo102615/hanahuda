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
 * @module server/application/use-cases/joinGameAsAiUseCase
 */

import type { Game } from '~~/server/domain/game/game'
import { addSecondPlayerAndStart, startRound } from '~~/server/domain/game/game'
import { createPlayer } from '~~/server/domain/game/player'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { FullEventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { TurnFlowService } from '~~/server/application/services/turnFlowService'
import {
  JoinGameAsAiInputPort,
  type JoinGameAsAiInput,
  type JoinGameAsAiOutput,
} from '~~/server/application/ports/input/joinGameAsAiInputPort'
import { checkSpecialRules, type SpecialRuleResult } from '~~/server/domain/services/specialRulesService'
import { loggers } from '~~/server/utils/logger'

/** Module logger instance */
const logger = loggers.useCase('JoinGameAsAi')

/**
 * 初始事件延遲（毫秒）
 *
 * 給予客戶端時間建立 SSE 連線
 */
const INITIAL_EVENT_DELAY_MS = 100

/**
 * JoinGameAsAiUseCase
 *
 * 處理 AI 對手加入遊戲的完整流程。
 */
export class JoinGameAsAiUseCase extends JoinGameAsAiInputPort {
  private turnFlowService?: TurnFlowService

  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: FullEventMapperPort,
    private readonly gameTimeoutManager?: GameTimeoutPort
  ) {
    super()
  }

  /**
   * 設定 TurnFlowService（用於解決循環依賴）
   */
  setTurnFlowService(service: TurnFlowService): void {
    this.turnFlowService = service
  }

  /**
   * 執行 AI 加入遊戲用例
   *
   * @param input - AI 加入遊戲參數
   * @returns AI 加入結果
   */
  async execute(input: JoinGameAsAiInput): Promise<JoinGameAsAiOutput> {
    const { playerId, playerName, gameId, strategyType } = input

    logger.info('AI joining game', { playerName, strategyType, gameId })

    // 1. 取得目標遊戲
    const waitingGame = this.gameStore.get(gameId)

    if (!waitingGame) {
      logger.error('Game not found', undefined, { gameId })
      return {
        gameId,
        playerId,
        success: false,
      }
    }

    if (waitingGame.status !== 'WAITING') {
      logger.error('Game is not in WAITING status', undefined, { gameId, status: waitingGame.status })
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

    // 3. 加入遊戲並開始
    let game = addSecondPlayerAndStart(waitingGame, aiPlayer)

    // 4. 發牌並開始第一局（可使用測試牌組）
    game = startRound(game, true)
    // game = startRound(game, gameConfig.use_test_deck)

    // 5. 檢查特殊規則（手四、喰付、場上手四）
    const specialRuleResult = this.checkAndHandleSpecialRules(game)

    if (specialRuleResult.triggered && game.currentRound) {
      // 特殊規則觸發：儲存遊戲狀態（確保 currentRound 存在以支援重連）
      this.gameStore.set(game)
      await this.gameRepository.save(game)

      logger.info('Special rule triggered, delegating to TurnFlowService', {
        gameId: game.id,
        ruleType: specialRuleResult.type,
        winnerId: specialRuleResult.winnerId,
      })

      // 排程初始事件（延遲讓客戶端建立 SSE 連線）
      this.scheduleSpecialRuleEvents(game, specialRuleResult)
    } else {
      // 無特殊規則：正常流程
      this.gameStore.set(game)
      await this.gameRepository.save(game)

      logger.info('AI joined game, game is now IN_PROGRESS', { gameId: game.id, playerName })

      // 排程初始事件（延遲讓客戶端建立 SSE 連線）
      this.scheduleInitialEvents(game)
    }

    return {
      gameId: game.id,
      playerId,
      success: true,
    }
  }

  /**
   * 檢查特殊規則
   *
   * @param game - 遊戲狀態
   * @returns 特殊規則檢測結果
   */
  private checkAndHandleSpecialRules(game: Game): SpecialRuleResult {
    if (!game.currentRound) {
      return {
        triggered: false,
        type: null,
        triggeredPlayerId: null,
        awardedPoints: 0,
        winnerId: null,
        month: null,
        months: null,
      }
    }

    return checkSpecialRules(game.currentRound, game.ruleset.special_rules)
  }

  /**
   * 排程初始事件（正常流程）
   *
   * @param game - 遊戲狀態
   */
  private scheduleInitialEvents(game: Game): void {
    setTimeout(() => {
      try {
        // 發送 GameStarted 事件
        const gameStartedEvent = this.eventMapper.toGameStartedEvent(game)
        this.eventPublisher.publishToGame(game.id, gameStartedEvent)

        // 發送 RoundDealt 事件
        const roundDealtEvent = this.eventMapper.toRoundDealtEvent(game)
        this.eventPublisher.publishToGame(game.id, roundDealtEvent)

        // 啟動第一位玩家的操作超時計時器
        const firstPlayerId = game.currentRound?.activePlayerId
        if (firstPlayerId) {
          this.turnFlowService?.startTimeoutForPlayer(game.id, firstPlayerId, 'AWAITING_HAND_PLAY')
        }

        logger.info('Initial events published', { gameId: game.id })
      } catch (error) {
        logger.error('Failed to publish initial events', error, { gameId: game.id })
      }
    }, INITIAL_EVENT_DELAY_MS)
  }

  /**
   * 排程特殊規則事件
   *
   * @description
   * 委託 TurnFlowService 處理特殊規則：
   * 1. 發送 GameStartedEvent
   * 2. 呼叫 handleSpecialRuleTriggered（處理 RoundDealt、狀態更新、RoundEnded、回合轉換）
   *
   * @param game - 遊戲狀態（currentRound 存在）
   * @param result - 特殊規則結果
   */
  private scheduleSpecialRuleEvents(
    game: Game,
    result: SpecialRuleResult
  ): void {
    setTimeout(() => {
      try {
        // 發送 GameStarted 事件
        const gameStartedEvent = this.eventMapper.toGameStartedEvent(game)
        this.eventPublisher.publishToGame(game.id, gameStartedEvent)

        // 委託 TurnFlowService 處理特殊規則流程
        this.turnFlowService?.handleSpecialRuleTriggered(game.id, game, result)
          .catch((error) => {
            logger.error('Failed to handle special rule', error, { gameId: game.id })
          })

        logger.info('Special rule handling delegated', {
          gameId: game.id,
          ruleType: result.type,
          winnerId: result.winnerId,
        })
      } catch (error) {
        logger.error('Failed to schedule special rule events', error, { gameId: game.id })
      }
    }, INITIAL_EVENT_DELAY_MS)
  }
}
