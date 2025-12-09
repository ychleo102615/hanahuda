/**
 * JoinGameUseCase - Application Layer
 *
 * @description
 * 處理玩家加入遊戲的用例。
 * 實作 Server 中立的配對邏輯：
 * 1. 查找等待中的遊戲
 * 2. 若無等待中遊戲 → 建立新遊戲（WAITING 狀態）
 * 3. 若有等待中遊戲 → 加入成為 Player 2（IN_PROGRESS 狀態）
 *
 * 注意：不直接建立 AI 對手，AI 配對由 OpponentService 透過事件監聽處理（T056）
 *
 * @module server/application/use-cases/joinGameUseCase
 */

import { randomUUID } from 'crypto'
import type { Game } from '~~/server/domain/game/game'
import { createGame, addSecondPlayerAndStart, startRound } from '~~/server/domain/game/game'
import { createPlayer } from '~~/server/domain/game/player'
import { detectTeshi, detectKuttsuki } from '~~/server/domain/round/round'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { InternalEventPublisherPort } from '~~/server/application/ports/output/internalEventPublisherPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { EventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type {
  JoinGameInputPort,
  JoinGameInput,
  JoinGameOutput,
} from '~~/server/application/ports/input/joinGameInputPort'

/**
 * 初始事件延遲（毫秒）
 *
 * 給予客戶端時間建立 SSE 連線
 */
const INITIAL_EVENT_DELAY_MS = 100

/**
 * JoinGameUseCase
 *
 * 處理玩家加入遊戲的完整流程，實作 Server 中立的配對邏輯。
 *
 * 事件發布設計：
 * - 建立新遊戲時 → 發布 ROOM_CREATED 內部事件（通知 OpponentService）
 * - 加入現有遊戲時 → 發布 GameStarted SSE 事件
 */
export class JoinGameUseCase implements JoinGameInputPort {
  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: EventMapperPort,
    private readonly internalEventPublisher: InternalEventPublisherPort
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
        return this.handleReconnection(existingGame, playerId, sessionToken)
      }
    }

    // 2. 查找等待中的遊戲
    const waitingGame = this.gameStore.findWaitingGame()

    if (waitingGame) {
      // 3a. 加入現有遊戲
      return this.joinExistingGame(waitingGame, playerId, playerName)
    } else {
      // 3b. 建立新遊戲（WAITING 狀態）
      return this.createNewGame(playerId, playerName)
    }
  }

  /**
   * 處理重連
   *
   * @description
   * 1. 驗證玩家是否屬於此遊戲
   * 2. 檢查遊戲狀態
   * 3. 若遊戲 IN_PROGRESS → 排程發送 GameSnapshotRestore 事件
   * 4. 若遊戲 WAITING → 僅回傳連線資訊（等待對手）
   * 5. 若遊戲 FINISHED → 拋出錯誤
   *
   * @param game - 遊戲
   * @param playerId - 玩家 ID
   * @param sessionToken - 會話 Token
   * @returns 加入遊戲結果
   * @throws Error 如果遊戲已結束
   */
  private handleReconnection(game: Game, playerId: string, sessionToken: string): JoinGameOutput {
    console.log(`[JoinGameUseCase] Reconnection for game ${game.id}, player ${playerId}`)

    // 1. 驗證玩家是否屬於此遊戲
    const isPlayer = game.players.some((p) => p.id === playerId)
    if (!isPlayer) {
      throw new Error(`Player ${playerId} is not part of game ${game.id}`)
    }

    // 2. 檢查遊戲狀態
    if (game.status === 'FINISHED') {
      throw new Error(`Game ${game.id} has already finished`)
    }

    // 3. 若遊戲 IN_PROGRESS → 排程發送 GameSnapshotRestore 事件
    if (game.status === 'IN_PROGRESS') {
      this.scheduleSnapshotEvent(game, playerId)
    }

    // 4. 若遊戲 WAITING → 僅回傳連線資訊（等待對手）
    // （不需額外處理，直接回傳）

    return {
      gameId: game.id,
      sessionToken,
      playerId,
      sseEndpoint: `/api/v1/games/${game.id}/events`,
      reconnected: true,
    }
  }

  /**
   * 排程發送 GameSnapshotRestore 事件
   *
   * @description
   * 延遲發送，給 SSE 連線建立時間。
   *
   * @param game - 遊戲
   * @param playerId - 重連的玩家 ID
   */
  private scheduleSnapshotEvent(game: Game, playerId: string): void {
    setTimeout(() => {
      try {
        // 從記憶體取得最新的遊戲狀態（因為可能在延遲期間有更新）
        const currentGame = this.gameStore.get(game.id)
        if (!currentGame || currentGame.status !== 'IN_PROGRESS') {
          console.log(`[JoinGameUseCase] Game ${game.id} is no longer in progress, skipping snapshot`)
          return
        }

        // 建立並發送 GameSnapshotRestore 事件
        const snapshotEvent = this.eventMapper.toGameSnapshotRestoreEvent(currentGame)
        this.eventPublisher.publishToPlayer(game.id, playerId, snapshotEvent)

        console.log(`[JoinGameUseCase] GameSnapshotRestore event sent to player ${playerId} for game ${game.id}`)
      } catch (error) {
        console.error(
          `[JoinGameUseCase] Failed to send GameSnapshotRestore for game ${game.id}:`,
          error
        )
      }
    }, INITIAL_EVENT_DELAY_MS)
  }

  /**
   * 建立新遊戲（WAITING 狀態）
   *
   * 不發牌、不開始遊戲，等待第二位玩家加入。
   */
  private async createNewGame(playerId: string, playerName: string): Promise<JoinGameOutput> {
    const gameId = randomUUID()
    const sessionToken = randomUUID()

    const humanPlayer = createPlayer({
      id: playerId,
      name: playerName,
      isAi: false,
    })

    const game = createGame({
      id: gameId,
      sessionToken, // Game 的 sessionToken 為第一位玩家的 token
      player: humanPlayer,
    })

    // 儲存到記憶體和資料庫
    this.gameStore.set(game)
    await this.gameRepository.save(game)
    await this.gameRepository.saveSession(gameId, playerId, sessionToken)

    console.log(`[JoinGameUseCase] Created new WAITING game ${gameId} for player ${playerName}`)

    // 發布 ROOM_CREATED 內部事件（通知 OpponentService 有新房間需要 AI 加入）
    this.internalEventPublisher.publishRoomCreated({
      gameId: game.id,
      waitingPlayerId: playerId,
    })

    return {
      gameId: game.id,
      sessionToken,
      playerId,
      sseEndpoint: `/api/v1/games/${game.id}/events`,
      reconnected: false,
    }
  }

  /**
   * 加入現有遊戲（成為 Player 2）
   *
   * 將遊戲狀態改為 IN_PROGRESS，發牌，並推送初始事件。
   */
  private async joinExistingGame(
    waitingGame: Game,
    playerId: string,
    playerName: string
  ): Promise<JoinGameOutput> {
    const sessionToken = randomUUID()

    const secondPlayer = createPlayer({
      id: playerId,
      name: playerName,
      isAi: false,
    })

    // 加入遊戲並開始
    let game = addSecondPlayerAndStart(waitingGame, secondPlayer)

    // 發牌並開始第一局
    game = startRound(game)

    // 檢查 Teshi/Kuttsuki
    if (game.currentRound) {
      for (const playerState of game.currentRound.playerStates) {
        const teshiResult = detectTeshi(playerState.hand)
        if (teshiResult.hasTeshi) {
          console.log(
            `[JoinGameUseCase] Teshi detected for player ${playerState.playerId}, month: ${teshiResult.month}`
          )
        }
      }

      const kuttsukiResult = detectKuttsuki(game.currentRound.field)
      if (kuttsukiResult.hasKuttsuki) {
        console.log(`[JoinGameUseCase] Kuttsuki detected on field, month: ${kuttsukiResult.month}`)
      }
    }

    // 儲存到記憶體和資料庫
    this.gameStore.set(game)
    this.gameStore.addPlayerSession(sessionToken, game.id, playerId)
    await this.gameRepository.save(game)
    await this.gameRepository.saveSession(game.id, playerId, sessionToken)

    console.log(
      `[JoinGameUseCase] Player ${playerName} joined game ${game.id}, game is now IN_PROGRESS`
    )

    // 排程初始事件（延遲讓客戶端建立 SSE 連線）
    this.scheduleInitialEvents(game)

    return {
      gameId: game.id,
      sessionToken,
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
        console.error(
          `[JoinGameUseCase] Failed to publish initial events for game ${game.id}:`,
          error
        )
      }
    }, INITIAL_EVENT_DELAY_MS)
  }
}
