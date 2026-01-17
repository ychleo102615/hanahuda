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
import { addSecondPlayerToStarting, startRound } from '~~/server/core-game/domain/game/game'
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
 * 遊戲啟動延遲（毫秒）
 *
 * 延遲發牌和遊戲開始，給予客戶端時間建立 WebSocket 連線並完成應用層初始化。
 * 在這段期間，遊戲狀態為 STARTING，重連時會看到「遊戲開始中」而非遊戲畫面。
 */
const GAME_START_DELAY_MS = 1000

/**
 * 開始遊戲參數
 */
export interface StartGameParams {
  /** 等待中的遊戲 */
  readonly waitingGame: Game
  /** 第二位玩家 */
  readonly secondPlayer: Player
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
    private readonly _gameTimeoutManager: GameTimeoutPort,
    private readonly gameLogRepository?: GameLogRepositoryPort
  ) {}

  /**
   * 設定 TurnFlowService（用於解決循環依賴）
   */
  setTurnFlowService(service: TurnFlowService): void {
    this.turnFlowService = service
  }

  /**
   * 執行第二位玩家加入並準備開始遊戲
   *
   * @description
   * 處理完整的遊戲開始流程（兩步驟設計）：
   *
   * **步驟 1（立即執行）**：
   * 1. 加入遊戲，狀態變為 STARTING（尚未發牌）
   * 2. 儲存遊戲狀態
   * 3. 建立 session 映射
   * 4. 記錄日誌
   *
   * **步驟 2（延遲 500ms 後執行）**：
   * 1. 發牌並開始第一局
   * 2. 檢查特殊規則
   * 3. 狀態變為 IN_PROGRESS
   * 4. 發送事件
   *
   * 這種設計確保在 500ms 內重連時，玩家看到的是「遊戲開始中」
   * 而非「遊戲進行中」，符合業務語意。
   *
   * @param params - 開始遊戲參數
   * @returns 開始遊戲結果（返回 STARTING 狀態的遊戲）
   */
  async startGameWithSecondPlayer(params: StartGameParams): Promise<StartGameResult> {
    const { waitingGame, secondPlayer, isAi, playerName } = params

    // ===== 步驟 1：進入 STARTING 狀態（立即執行）=====

    // 1. 加入遊戲，狀態變為 STARTING（尚未發牌）
    const startingGame = addSecondPlayerToStarting(waitingGame, secondPlayer)

    // 2. 儲存遊戲狀態
    this.gameStore.set(startingGame)
    await this.gameRepository.save(startingGame)

    // 3. 建立 playerId -> gameId 映射
    this.gameStore.addPlayerGame(secondPlayer.id, startingGame.id)

    // 4. 記錄日誌
    const commandType = isAi ? COMMAND_TYPES.JoinGameAsAi : COMMAND_TYPES.JoinExistingGame
    this.gameLogRepository?.logAsync({
      gameId: startingGame.id,
      playerId: secondPlayer.id,
      eventType: commandType,
      payload: { playerName, isAi },
    })

    // ===== 步驟 2：排程遊戲真正開始（延遲執行）=====
    this.scheduleGameStart(startingGame.id)

    // 返回 STARTING 狀態的遊戲
    // 注意：此時還沒發牌，沒有 currentRound，所以 startingPlayerId 無法確定
    return {
      game: startingGame,
      startingPlayerId: startingGame.players[0]?.id ?? '',
    }
  }

  /**
   * 排程遊戲開始
   *
   * @description
   * 500ms 後執行真正的遊戲開始邏輯：發牌、檢查特殊規則、發送事件。
   *
   * @param gameId - 遊戲 ID
   */
  private scheduleGameStart(gameId: string): void {
    setTimeout(() => {
      this.executeGameStart(gameId).catch((err) => {
        logger.error('Failed to execute game start', { gameId, error: String(err) })
      })
    }, GAME_START_DELAY_MS)
  }

  /**
   * 執行遊戲開始
   *
   * @description
   * 發牌、檢查特殊規則、狀態變為 IN_PROGRESS、發送事件。
   *
   * @param gameId - 遊戲 ID
   */
  private async executeGameStart(gameId: string): Promise<void> {
    // 取得當前遊戲狀態
    const currentGame = this.gameStore.get(gameId)
    if (!currentGame) {
      logger.warn('Game not found for executeGameStart', { gameId })
      return
    }

    // 確認遊戲狀態是 STARTING
    if (currentGame.status !== 'STARTING') {
      logger.warn('Game is not in STARTING status', { gameId, status: currentGame.status })
      return
    }

    // 1. 發牌並開始第一局（狀態變為 IN_PROGRESS）
    const game = startRound(currentGame, gameConfig.use_test_deck)

    // 2. 檢查特殊規則（手四、喰付、場上手四）
    const specialRuleResult = this.checkAndHandleSpecialRules(game)

    // 3. 儲存遊戲狀態
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    // 4. 發送事件
    if (specialRuleResult.triggered && game.currentRound) {
      this.publishSpecialRuleEvents(game, specialRuleResult)
    } else {
      this.publishInitialEvents(game)
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
   * 發送初始事件（正常流程）
   *
   * @param game - 遊戲狀態
   */
  private publishInitialEvents(game: Game): void {
    try {
      // 發送 GameStarted 事件（所有人相同）
      const gameStartedEvent = this.eventMapper.toGameStartedEvent(game)
      this.eventPublisher.publishToGame(game.id, gameStartedEvent)

      // 發送 RoundDealt 事件（每個玩家收到過濾後的版本）
      // 業務規則：自己的手牌完整，對手只有數量
      for (const player of game.players) {
        const filteredEvent = this.eventMapper.toRoundDealtEventForPlayer(game, player.id)
        this.eventPublisher.publishToPlayer(game.id, player.id, filteredEvent)
      }

      // 啟動第一位玩家的操作超時計時器
      const firstPlayerId = game.currentRound?.activePlayerId
      if (firstPlayerId) {
        this.turnFlowService?.startTimeoutForPlayer(game.id, firstPlayerId, 'AWAITING_HAND_PLAY')
      }
    } catch (err) {
      logger.error('Failed to publish initial events', { gameId: game.id, error: String(err) })
    }
  }

  /**
   * 發送特殊規則事件
   *
   * @description
   * 委託 TurnFlowService 處理特殊規則：
   * 1. 發送 GameStartedEvent
   * 2. 呼叫 handleSpecialRuleTriggered（處理 RoundDealt、狀態更新、RoundEnded、回合轉換）
   *
   * @param game - 遊戲狀態（currentRound 存在）
   * @param result - 特殊規則結果
   */
  private publishSpecialRuleEvents(
    game: Game,
    result: SpecialRuleResult
  ): void {
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
      // Failed to publish special rule events
    }
  }
}
