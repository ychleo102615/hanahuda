/**
 * Game Creation Handler
 *
 * @description
 * 訂閱 Matchmaking BC 的 MATCH_FOUND 事件，建立遊戲。
 *
 * 事件處理流程:
 * - HUMAN match: 直接建立雙人遊戲
 * - BOT match: 建立等待遊戲，發布 ROOM_CREATED 觸發 Opponent BC
 *
 * @module server/core-game/adapters/event-subscriber/gameCreationHandler
 */

import {
  internalEventBus,
  playerEventBus,
  createMatchmakingEvent,
  type MatchFoundPayload,
  type Unsubscribe,
} from '~~/server/shared/infrastructure/event-bus'
import type { JoinGameInputPort } from '../../application/ports/input/joinGameInputPort'
import type { InternalEventPublisherPort } from '../../application/ports/output/internalEventPublisherPort'

/**
 * Game Creation Handler
 *
 * @description
 * 監聽 MATCH_FOUND 事件並建立遊戲。
 */
export class GameCreationHandler {
  private unsubscribe: Unsubscribe | null = null

  constructor(
    private readonly joinGameUseCase: JoinGameInputPort,
    private readonly internalEventPublisher: InternalEventPublisherPort
  ) {}

  /**
   * 啟動監聽
   */
  start(): void {
    if (this.unsubscribe) {
      return // 已啟動
    }

    this.unsubscribe = internalEventBus.onMatchFound(async (payload) => {
      await this.handleMatchFound(payload)
    })
  }

  /**
   * 停止監聽
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  /**
   * 處理配對成功事件
   */
  private async handleMatchFound(payload: MatchFoundPayload): Promise<void> {
    if (payload.matchType === 'HUMAN') {
      await this.handleHumanMatch(payload)
    } else {
      await this.handleBotMatch(payload)
    }
  }

  /**
   * 處理人類對戰配對
   *
   * @description
   * 1. Player1 建立遊戲 (WAITING 狀態)
   * 2. Player2 加入遊戲 (IN_PROGRESS 狀態)
   * 3. 發布 MatchFound 到 PlayerEventBus（包含有效 game_id）
   */
  private async handleHumanMatch(payload: MatchFoundPayload): Promise<void> {
    // Player1 建立遊戲
    const player1Result = await this.joinGameUseCase.execute({
      playerId: payload.player1Id,
      playerName: payload.player1Name,
      roomType: payload.roomType,
    })

    if (player1Result.status !== 'game_waiting') {
      console.error('[GameCreationHandler] Failed to create game for player1:', player1Result)
      return
    }

    // Player2 加入遊戲
    const player2Result = await this.joinGameUseCase.execute({
      playerId: payload.player2Id,
      playerName: payload.player2Name,
      gameId: player1Result.gameId,
    })

    if (player2Result.status !== 'game_started') {
      console.error('[GameCreationHandler] Failed to join game for player2:', player2Result)
      return
    }

    // 遊戲建立成功後，發布 MatchFound 到 PlayerEventBus（解決 game_id 時序問題）
    const gameId = player1Result.gameId

    // 通知 Player1
    const event1 = createMatchmakingEvent('MatchFound', {
      game_id: gameId,
      opponent_name: payload.player2Name,
      is_bot: false,
    })
    playerEventBus.publishToPlayer(payload.player1Id, event1)

    // 通知 Player2
    const event2 = createMatchmakingEvent('MatchFound', {
      game_id: gameId,
      opponent_name: payload.player1Name,
      is_bot: false,
    })
    playerEventBus.publishToPlayer(payload.player2Id, event2)

    console.info(
      '[GameCreationHandler] Human match game created:',
      gameId,
      `(${payload.player1Name} vs ${payload.player2Name})`
    )
  }

  /**
   * 處理機器人配對
   *
   * @description
   * 1. Player 建立遊戲 (WAITING 狀態)
   * 2. 發布 ROOM_CREATED 事件，觸發 Opponent BC 加入
   * 3. 發布 MatchFound 到 PlayerEventBus（包含有效 game_id）
   */
  private async handleBotMatch(payload: MatchFoundPayload): Promise<void> {
    // Player 建立遊戲
    const result = await this.joinGameUseCase.execute({
      playerId: payload.player1Id,
      playerName: payload.player1Name,
      roomType: payload.roomType,
    })

    if (result.status !== 'game_waiting') {
      console.error('[GameCreationHandler] Failed to create game for bot match:', result)
      return
    }

    // 注意：ROOM_CREATED 事件已由 JoinGameUseCase 發布，此處不需重複發布

    // 遊戲建立成功後，發布 MatchFound 到 PlayerEventBus
    const matchFoundEvent = createMatchmakingEvent('MatchFound', {
      game_id: result.gameId,
      opponent_name: 'Computer',
      is_bot: true,
    })
    playerEventBus.publishToPlayer(payload.player1Id, matchFoundEvent)

    console.info(
      '[GameCreationHandler] Bot match game created:',
      result.gameId,
      `(${payload.player1Name} vs Bot)`
    )
  }
}

/**
 * 單例實例
 */
let instance: GameCreationHandler | null = null

/**
 * 初始化 GameCreationHandler
 */
export function initGameCreationHandler(
  joinGameUseCase: JoinGameInputPort,
  internalEventPublisher: InternalEventPublisherPort
): GameCreationHandler {
  if (instance) {
    instance.stop()
  }

  instance = new GameCreationHandler(joinGameUseCase, internalEventPublisher)
  instance.start()
  return instance
}

/**
 * 取得 GameCreationHandler 實例
 */
export function getGameCreationHandler(): GameCreationHandler | null {
  return instance
}
