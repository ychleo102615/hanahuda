/**
 * JoinGameUseCase - Application Layer
 *
 * @description
 * 處理玩家加入遊戲的用例。
 * 建立遊戲、加入 AI 對手、發牌，並排程初始事件。
 *
 * @module server/application/use-cases/joinGameUseCase
 */

import { randomUUID } from 'uncrypto'
import type { Game } from '~~/server/domain/game/game'
import type { GameEvent, GameStartedEvent, RoundDealtEvent } from '#shared/contracts'
import { createGame, addAiOpponentAndStart, startRound } from '~~/server/domain/game/game'
import { createPlayer, createAiPlayer } from '~~/server/domain/game/player'
import { detectTeshi, detectKuttsuki } from '~~/server/domain/round/round'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'

/**
 * 遊戲記憶體儲存介面
 *
 * Use Case 不直接依賴具體實作，只依賴介面
 */
export interface GameStorePort {
  set(game: Game): void
  getBySessionToken(token: string): Game | undefined
}

/**
 * 事件映射器介面
 *
 * 將 Domain entities 轉換為 SSE events
 */
export interface EventMapperPort {
  toGameStartedEvent(game: Game): GameStartedEvent
  toRoundDealtEvent(game: Game): RoundDealtEvent
}

/**
 * 加入遊戲輸入參數
 */
export interface JoinGameInput {
  /** 玩家 ID (UUID v4) */
  readonly playerId: string
  /** 玩家名稱 */
  readonly playerName: string
  /** 會話 Token（用於重連） */
  readonly sessionToken?: string
}

/**
 * 加入遊戲輸出結果
 */
export interface JoinGameOutput {
  /** 遊戲 ID */
  readonly gameId: string
  /** 會話 Token */
  readonly sessionToken: string
  /** 玩家 ID */
  readonly playerId: string
  /** SSE 端點路徑 */
  readonly sseEndpoint: string
  /** 是否為重連 */
  readonly reconnected: boolean
}

/**
 * 初始事件延遲（毫秒）
 *
 * 給予客戶端時間建立 SSE 連線
 */
const INITIAL_EVENT_DELAY_MS = 100

/**
 * JoinGameUseCase
 *
 * 處理玩家加入遊戲的完整流程。
 */
export class JoinGameUseCase {
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: EventMapperPort
  ) {}

  /**
   * 執行加入遊戲用例
   *
   * @param input - 加入遊戲參數
   * @returns 遊戲資訊
   */
  async execute(input: JoinGameInput): Promise<JoinGameOutput> {
    const { playerId, playerName, sessionToken } = input

    // 1. 嘗試重連（如果提供了 sessionToken）
    if (sessionToken) {
      const existingGame = this.gameStore.getBySessionToken(sessionToken)
      if (existingGame) {
        console.log(`[JoinGameUseCase] Reconnection for game ${existingGame.id}`)
        return {
          gameId: existingGame.id,
          sessionToken: existingGame.sessionToken,
          playerId,
          sseEndpoint: `/api/v1/games/${existingGame.id}/events`,
          reconnected: true,
        }
      }
    }

    // 2. 建立新遊戲
    const gameId = randomUUID()
    const newSessionToken = randomUUID()
    const aiPlayerId = randomUUID()

    const humanPlayer = createPlayer({
      id: playerId,
      name: playerName,
      isAi: false,
    })

    let game = createGame({
      id: gameId,
      sessionToken: newSessionToken,
      player: humanPlayer,
    })

    // 3. 加入 AI 對手（MVP: 立即配對）
    const aiPlayer = createAiPlayer(aiPlayerId)
    game = addAiOpponentAndStart(game, aiPlayer)

    // 4. 發牌並開始第一局
    game = startRound(game)

    // 5. 檢查 Teshi/Kuttsuki（Phase 3 先記錄，US4 完整處理）
    if (game.currentRound) {
      for (const playerState of game.currentRound.playerStates) {
        const teshiResult = detectTeshi(playerState.hand)
        if (teshiResult.hasTeshi) {
          console.log(`[JoinGameUseCase] Teshi detected for player ${playerState.playerId}, month: ${teshiResult.month}`)
        }
      }

      const kuttsukiResult = detectKuttsuki(game.currentRound.field)
      if (kuttsukiResult.hasKuttsuki) {
        console.log(`[JoinGameUseCase] Kuttsuki detected on field, month: ${kuttsukiResult.month}`)
      }
    }

    // 6. 儲存到記憶體和資料庫
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    console.log(`[JoinGameUseCase] Created game ${gameId} with players: ${humanPlayer.name}, ${aiPlayer.name}`)

    // 7. 排程初始事件（延遲讓客戶端建立 SSE 連線）
    this.scheduleInitialEvents(game)

    // 8. 返回遊戲資訊
    return {
      gameId: game.id,
      sessionToken: game.sessionToken,
      playerId,
      sseEndpoint: `/api/v1/games/${game.id}/events`,
      reconnected: false,
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

        console.log(`[JoinGameUseCase] Initial events published for game ${game.id}`)
      } catch (error) {
        console.error(`[JoinGameUseCase] Failed to publish initial events for game ${game.id}:`, error)
      }
    }, INITIAL_EVENT_DELAY_MS)
  }
}
