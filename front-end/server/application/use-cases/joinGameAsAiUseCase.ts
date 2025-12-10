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
import { detectTeshi, detectKuttsuki } from '~~/server/domain/round/round'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { EventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import {
  JoinGameAsAiInputPort,
  type JoinGameAsAiInput,
  type JoinGameAsAiOutput,
} from '~~/server/application/ports/input/joinGameAsAiInputPort'

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
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: EventMapperPort
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
    const { playerId, playerName, gameId, strategyType } = input

    console.log(`[JoinGameAsAiUseCase] AI ${playerName} (${strategyType}) joining game ${gameId}`)

    // 1. 取得目標遊戲
    const waitingGame = this.gameStore.get(gameId)

    if (!waitingGame) {
      console.error(`[JoinGameAsAiUseCase] Game ${gameId} not found`)
      return {
        gameId,
        playerId,
        success: false,
      }
    }

    if (waitingGame.status !== 'WAITING') {
      console.error(`[JoinGameAsAiUseCase] Game ${gameId} is not in WAITING status`)
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

    // 4. 發牌並開始第一局
    game = startRound(game)

    // 5. 檢查 Teshi/Kuttsuki（診斷用）
    this.logSpecialConditions(game)

    // 6. 儲存到記憶體和資料庫
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    console.log(
      `[JoinGameAsAiUseCase] AI ${playerName} joined game ${game.id}, game is now IN_PROGRESS`
    )

    // 7. 排程初始事件（延遲讓客戶端建立 SSE 連線）
    this.scheduleInitialEvents(game)

    return {
      gameId: game.id,
      playerId,
      success: true,
    }
  }

  /**
   * 記錄特殊條件（Teshi/Kuttsuki）
   */
  private logSpecialConditions(game: Game): void {
    if (!game.currentRound) return

    for (const playerState of game.currentRound.playerStates) {
      const teshiResult = detectTeshi(playerState.hand)
      if (teshiResult.hasTeshi) {
        console.log(
          `[JoinGameAsAiUseCase] Teshi detected for player ${playerState.playerId}, month: ${teshiResult.month}`
        )
      }
    }

    const kuttsukiResult = detectKuttsuki(game.currentRound.field)
    if (kuttsukiResult.hasKuttsuki) {
      console.log(`[JoinGameAsAiUseCase] Kuttsuki detected on field, month: ${kuttsukiResult.month}`)
    }
  }

  /**
   * 排程初始事件
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

        console.log(`[JoinGameAsAiUseCase] Initial events published for game ${game.id}`)
      } catch (error) {
        console.error(
          `[JoinGameAsAiUseCase] Failed to publish initial events for game ${game.id}:`,
          error
        )
      }
    }, INITIAL_EVENT_DELAY_MS)
  }
}
