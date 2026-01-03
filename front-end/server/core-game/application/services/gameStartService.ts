/**
 * GameStartService - Application Layer Internal Service
 *
 * @description
 * 遊戲開始服務的實作。
 * 封裝第二位玩家加入遊戲並開始的共用邏輯。
 *
 * 此服務由 JoinGameUseCase 和 JoinGameAsAiUseCase 共用，避免重複程式碼。
 *
 * @module server/application/services/gameStartService
 */

import type { Game } from '~~/server/core-game/domain/game/game'
import { addSecondPlayerAndStart, startRound } from '~~/server/core-game/domain/game/game'
import type { Player } from '~~/server/core-game/domain/game/player'
import { checkSpecialRules, type SpecialRuleResult } from '~~/server/core-game/domain/services/specialRulesService'
import type { GameRepositoryPort } from '~~/server/core-game/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/core-game/application/ports/output/eventPublisherPort'
import type { GameStorePort } from '~~/server/core-game/application/ports/output/gameStorePort'
import type { FullEventMapperPort } from '~~/server/core-game/application/ports/output/eventMapperPort'
import type { GameTimeoutPort } from '~~/server/core-game/application/ports/output/gameTimeoutPort'
import type { GameLogRepositoryPort } from '~~/server/core-game/application/ports/output/gameLogRepositoryPort'
import type { TurnFlowService } from '~~/server/core-game/application/services/turnFlowService'
import { gameConfig } from '~~/server/utils/config'
import { logger } from '~~/server/utils/logger'
import { COMMAND_TYPES } from '~~/server/database/schema/gameLogs'

/**
 * 初始事件延遲（毫秒）
 *
 * 給予客戶端時間建立 SSE 連線
 */
const INITIAL_EVENT_DELAY_MS = 100

/**
 * 開始遊戲參數
 */
export interface StartGameParams {
  /** 等待中的遊戲 */
  readonly waitingGame: Game
  /** 第二位玩家 */
  readonly secondPlayer: Player
  /** 會話 Token（AI 不需要） */
  readonly sessionToken?: string
  /** 是否為 AI 玩家 */
  readonly isAi: boolean
  /** 玩家名稱（用於日誌記錄） */
  readonly playerName: string
}

/**
 * 開始遊戲結果
 */
export interface StartGameResult {
  /** 更新後的遊戲狀態 */
  readonly game: Game
  /** 先手玩家 ID */
  readonly startingPlayerId: string
}

/**
 * GameStartService
 *
 * 遊戲開始服務，封裝共用的遊戲開始邏輯。
 */
export class GameStartService {
  private turnFlowService?: TurnFlowService

  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: FullEventMapperPort,
    private readonly gameTimeoutManager: GameTimeoutPort,
    private readonly gameLogRepository?: GameLogRepositoryPort
  ) {}

  /**
   * 設定 TurnFlowService（用於解決循環依賴）
   */
  setTurnFlowService(service: TurnFlowService): void {
    this.turnFlowService = service
  }

  /**
   * 執行第二位玩家加入並開始遊戲
   *
   * @description
   * 處理完整的遊戲開始流程：
   * 1. 加入遊戲並轉換狀態為 IN_PROGRESS
   * 2. 發牌並開始第一局
   * 3. 檢查特殊規則（手四、喰付、場上手四）
   * 4. 儲存遊戲狀態
   * 5. 建立 session 映射（人類玩家）
   * 6. 排程初始事件
   * 7. 記錄日誌
   *
   * @param params - 開始遊戲參數
   * @returns 開始遊戲結果
   */
  async startGameWithSecondPlayer(params: StartGameParams): Promise<StartGameResult> {
    const { waitingGame, secondPlayer, sessionToken, isAi, playerName } = params

    // 1. 加入遊戲並開始
    let game = addSecondPlayerAndStart(waitingGame, secondPlayer)

    // 2. 發牌並開始第一局（可使用測試牌組）
    game = startRound(game, gameConfig.use_test_deck)

    // 3. 檢查特殊規則（手四、喰付、場上手四）
    const specialRuleResult = this.checkAndHandleSpecialRules(game)

    // 4. 儲存 startingPlayerId
    const startingPlayerId = game.currentRound?.activePlayerId ?? game.players[0]?.id ?? ''

    // 5. 儲存遊戲狀態
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    // 6. 建立 session 映射（人類玩家才需要）
    if (!isAi && sessionToken) {
      this.gameStore.addPlayerSession(sessionToken, game.id, secondPlayer.id)
    }

    // 7. 排程初始事件（延遲讓客戶端建立 SSE 連線）
    if (specialRuleResult.triggered && game.currentRound) {
      this.scheduleSpecialRuleEvents(game, specialRuleResult)
    } else {
      this.scheduleInitialEvents(game)
    }

    // 8. 記錄日誌
    const commandType = isAi ? COMMAND_TYPES.JoinGameAsAi : COMMAND_TYPES.JoinExistingGame
    this.gameLogRepository?.logAsync({
      gameId: game.id,
      playerId: secondPlayer.id,
      eventType: commandType,
      payload: { playerName, isAi },
    })

    return {
      game,
      startingPlayerId,
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
      } catch (err) {
        logger.error('Failed to publish initial events', { gameId: game.id, error: String(err) })
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
          .catch(() => {
            // Failed to handle special rule
          })
      } catch {
        // Failed to schedule special rule events
      }
    }, INITIAL_EVENT_DELAY_MS)
  }
}
