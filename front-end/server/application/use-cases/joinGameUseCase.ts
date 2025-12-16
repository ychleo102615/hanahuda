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
import {
  createGame,
  addSecondPlayerAndStart,
  startRound,
  getDefaultRuleset,
  determineWinner,
  createPlayer,
  type Game,
} from '~~/server/domain/game'
import { detectTeshi, detectKuttsuki } from '~~/server/domain/round'
import type { RoomTypeId } from '#shared/constants/roomTypes'
import type { GameRepositoryPort } from '~~/server/application/ports/output/gameRepositoryPort'
import type { EventPublisherPort } from '~~/server/application/ports/output/eventPublisherPort'
import type { InternalEventPublisherPort } from '~~/server/application/ports/output/internalEventPublisherPort'
import type { GameStorePort } from '~~/server/application/ports/output/gameStorePort'
import type { EventMapperPort } from '~~/server/application/ports/output/eventMapperPort'
import type { GameTimeoutPort } from '~~/server/application/ports/output/gameTimeoutPort'
import type { TurnFlowService } from '~~/server/application/services/turnFlowService'
import type {
  JoinGameInputPort,
  JoinGameInput,
  JoinGameOutput,
  JoinGameSuccessOutput,
  JoinGameWaitingOutput,
  JoinGameStartedOutput,
  JoinGameSnapshotOutput,
} from '~~/server/application/ports/input/joinGameInputPort'
import { gameConfig } from '~~/server/utils/config'

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
  private turnFlowService?: TurnFlowService

  constructor(
    private readonly gameRepository: GameRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly gameStore: GameStorePort,
    private readonly eventMapper: EventMapperPort,
    private readonly internalEventPublisher: InternalEventPublisherPort,
    private readonly gameTimeoutManager: GameTimeoutPort
  ) {}

  /**
   * 設定 TurnFlowService（用於解決循環依賴）
   */
  setTurnFlowService(service: TurnFlowService): void {
    this.turnFlowService = service
  }

  /**
   * 執行加入遊戲用例
   *
   * @param input - 加入遊戲參數
   * @returns 遊戲資訊
   */
  async execute(input: JoinGameInput): Promise<JoinGameOutput> {
    const { playerId, playerName, sessionToken, gameId, roomType } = input

    // 1. 重連模式：如果提供了 gameId，明確表示要重連特定遊戲
    if (gameId) {
      return this.handleReconnectionMode(gameId, playerId, playerName, sessionToken)
    }

    // 2. 新遊戲模式：沒有提供 gameId，開始新遊戲
    // 注意：即使有 sessionToken，也不查詢舊遊戲，直接開始新遊戲流程
    console.log(`[JoinGameUseCase] New game mode for player ${playerName}`)

    // 3. 查找等待中的遊戲
    const waitingGame = this.gameStore.findWaitingGame()

    if (waitingGame) {
      // 3a. 加入現有遊戲
      return this.joinExistingGame(waitingGame, playerId, playerName)
    } else {
      // 3b. 建立新遊戲（WAITING 狀態）
      return this.createNewGame(playerId, playerName, roomType)
    }
  }

  /**
   * 處理重連模式
   *
   * @description
   * 當前端明確提供 gameId 時，表示要重連特定遊戲。
   * 此時需要檢查遊戲狀態，返回對應的結果。
   *
   * @param gameId - 要重連的遊戲 ID
   * @param playerId - 玩家 ID
   * @param playerName - 玩家名稱
   * @param sessionToken - 會話 Token
   * @returns 加入遊戲結果
   */
  private async handleReconnectionMode(
    gameId: string,
    playerId: string,
    playerName: string,
    sessionToken?: string
  ): Promise<JoinGameOutput> {
    console.log(`[JoinGameUseCase] Reconnection mode for game ${gameId}, player ${playerId}`)

    // 1. 先查記憶體
    const memoryGame = this.gameStore.get(gameId)
    if (memoryGame) {
      // 驗證玩家身份
      const isPlayer = memoryGame.players.some((p) => p.id === playerId)
      if (!isPlayer) {
        console.log(`[JoinGameUseCase] Player ${playerId} not in game ${gameId}, rejecting reconnection`)
        // 玩家不屬於此遊戲，返回過期
        return { status: 'game_expired', gameId }
      }

      // 玩家身份驗證通過，執行重連
      const token = sessionToken || this.findPlayerSessionToken(gameId, playerId)
      if (!token) {
        console.log(`[JoinGameUseCase] No session token for player ${playerId} in game ${gameId}`)
        return { status: 'game_expired', gameId }
      }

      return this.handleReconnection(memoryGame, playerId, playerName, token)
    }

    // 2. 記憶體沒有，查資料庫
    const dbGame = await this.gameRepository.findById(gameId)
    if (!dbGame) {
      console.log(`[JoinGameUseCase] Game ${gameId} not found`)
      return { status: 'game_expired', gameId }
    }

    // 3. 根據遊戲狀態返回結果
    if (dbGame.status === 'FINISHED') {
      console.log(`[JoinGameUseCase] Game ${gameId} already finished`)
      const winnerId = determineWinner(dbGame)
      return {
        status: 'game_finished',
        gameId: dbGame.id,
        winnerId,
        finalScores: dbGame.cumulativeScores.map((s) => ({
          playerId: s.player_id,
          score: s.score,
        })),
        roundsPlayed: dbGame.roundsPlayed,
        totalRounds: dbGame.totalRounds,
      }
    }

    // 4. 遊戲在 DB 但不在記憶體 → 已過期
    console.log(`[JoinGameUseCase] Game ${gameId} expired (in DB but not in memory)`)
    return { status: 'game_expired', gameId }
  }

  /**
   * 查找玩家的 session token（從 gameStore 的 session map）
   */
  private findPlayerSessionToken(gameId: string, playerId: string): string | undefined {
    // gameStore 可能有方法可以查詢，但目前沒有
    // 這裡暫時返回 undefined，讓呼叫方處理
    return undefined
  }

  /**
   * 處理重連
   *
   * SSE-First 架構：
   * - 若遊戲 IN_PROGRESS → 返回 snapshot（包含完整遊戲狀態）
   * - 若遊戲 WAITING → 返回 game_waiting（等待對手）
   * - 若遊戲 FINISHED → 不應該到達這裡（已在 handleReconnectionMode 處理）
   *
   * @param game - 遊戲
   * @param playerId - 玩家 ID
   * @param playerName - 玩家名稱
   * @param sessionToken - 會話 Token
   * @returns 加入遊戲結果
   */
  private handleReconnection(
    game: Game,
    playerId: string,
    playerName: string,
    sessionToken: string
  ): JoinGameSnapshotOutput | JoinGameWaitingOutput {
    console.log(`[JoinGameUseCase] Reconnection for game ${game.id}, player ${playerId}`)

    // 1. 若遊戲 WAITING → 返回 game_waiting（等待對手）
    if (game.status === 'WAITING') {
      console.log(`[JoinGameUseCase] Game ${game.id} is WAITING, returning game_waiting`)
      return {
        status: 'game_waiting',
        gameId: game.id,
        sessionToken,
        playerId,
        playerName,
        timeoutSeconds: gameConfig.action_timeout_seconds,
      }
    }

    // 2. 若遊戲 IN_PROGRESS → 返回 snapshot
    // 取得剩餘超時秒數
    const remainingSeconds = this.gameTimeoutManager.getRemainingSeconds(game.id)

    // 建立遊戲快照
    const snapshot = this.eventMapper.toGameSnapshotRestoreEvent(
      game,
      remainingSeconds ?? undefined
    )

    console.log(`[JoinGameUseCase] Returning snapshot for game ${game.id}, remaining: ${remainingSeconds}s`)

    return {
      status: 'snapshot',
      gameId: game.id,
      sessionToken,
      playerId,
      snapshot,
    }
  }

  /**
   * 建立新遊戲（WAITING 狀態）
   *
   * 不發牌、不開始遊戲，等待第二位玩家加入。
   * SSE-First 架構：返回 game_waiting 狀態。
   *
   * @param playerId - 玩家 ID
   * @param playerName - 玩家名稱
   * @param roomType - 房間類型（可選，預設從 config 取得）
   */
  private async createNewGame(
    playerId: string,
    playerName: string,
    roomType?: RoomTypeId
  ): Promise<JoinGameWaitingOutput> {
    const gameId = randomUUID()
    const sessionToken = randomUUID()

    const humanPlayer = createPlayer({
      id: playerId,
      name: playerName,
      isAi: false,
    })

    // 取得規則集：優先使用傳入的 roomType，否則使用 config 預設值
    const effectiveRoomType = roomType ?? gameConfig.default_room_type
    const ruleset = getDefaultRuleset(effectiveRoomType)

    const game = createGame({
      id: gameId,
      sessionToken, // Game 的 sessionToken 為第一位玩家的 token
      player: humanPlayer,
      ruleset,
    })

    // 儲存到記憶體和資料庫
    this.gameStore.set(game)
    await this.gameRepository.save(game)

    console.log(`[JoinGameUseCase] Created new WAITING game ${gameId} for player ${playerName}`)

    // 發布 ROOM_CREATED 內部事件（通知 OpponentService 有新房間需要 AI 加入）
    this.internalEventPublisher.publishRoomCreated({
      gameId: game.id,
      waitingPlayerId: playerId,
    })

    // SSE-First: 返回 game_waiting 狀態（前端顯示等待畫面）
    return {
      status: 'game_waiting',
      gameId: game.id,
      sessionToken,
      playerId,
      playerName,
      timeoutSeconds: gameConfig.action_timeout_seconds,
    }
  }

  /**
   * 加入現有遊戲（成為 Player 2）
   *
   * 將遊戲狀態改為 IN_PROGRESS，發牌，並推送初始事件。
   * SSE-First 架構：返回 game_started 狀態。
   *
   * 注意：scheduleInitialEvents 仍會執行，發送 GameStarted 和 RoundDealt 給所有玩家。
   * InitialState 只是告訴當前連線的玩家初始狀態，GameStarted/RoundDealt 是廣播事件。
   */
  private async joinExistingGame(
    waitingGame: Game,
    playerId: string,
    playerName: string
  ): Promise<JoinGameStartedOutput> {
    const sessionToken = randomUUID()

    const secondPlayer = createPlayer({
      id: playerId,
      name: playerName,
      isAi: false,
    })

    // 加入遊戲並開始
    let game = addSecondPlayerAndStart(waitingGame, secondPlayer)

    // 發牌並開始第一局（可使用測試牌組）
    game = startRound(game, gameConfig.use_test_deck)

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

    console.log(
      `[JoinGameUseCase] Player ${playerName} joined game ${game.id}, game is now IN_PROGRESS`
    )

    // 排程初始事件（延遲讓客戶端建立 SSE 連線）
    // GameStarted 和 RoundDealt 會廣播給所有玩家
    this.scheduleInitialEvents(game)

    // SSE-First: 返回 game_started 狀態
    return {
      status: 'game_started',
      gameId: game.id,
      sessionToken,
      playerId,
      players: game.players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        isAi: p.isAi,
      })),
      ruleset: {
        totalRounds: game.ruleset.total_rounds,
        targetScore: game.ruleset.target_score,
      },
      startingPlayerId: game.currentRound?.activePlayerId ?? game.players[0]?.id ?? '',
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

        // 啟動第一位玩家的操作超時計時器
        const firstPlayerId = game.currentRound?.activePlayerId
        if (firstPlayerId) {
          this.turnFlowService?.startTimeoutForPlayer(game.id, firstPlayerId, 'AWAITING_HAND_PLAY')
        }

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
