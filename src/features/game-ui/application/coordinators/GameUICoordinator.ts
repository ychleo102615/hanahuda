import type { GamePresenter } from '@/application/ports/presenters/GamePresenter'
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type { GameEngineCoordinator } from '@/features/game-engine/application/usecases/GameEngineCoordinator'
import type { IntegrationEventSubscriber } from '@/shared/events/integration-event-subscriber'
import type {
  GameCreatedEventData,
  RoundStartedEventData,
} from '@/shared/events/integration-events'
import type { StartGameInputDTO } from '@/application/dto/GameDTO'

export class GameUICoordinator {
  constructor(
    private gameEngineCoordinator: GameEngineCoordinator,
    private gameRepository: GameRepository,
    private presenter: GamePresenter,
    private eventSubscriber: IntegrationEventSubscriber,
  ) {
    this.subscribeToEvents()
  }

  private subscribeToEvents(): void {
    // 訂閱遊戲創建事件
    this.eventSubscriber.subscribe<GameCreatedEventData>('GameCreated', (event) =>
      this.handleGameCreated(event),
    )

    // 訂閱回合開始事件
    this.eventSubscriber.subscribe<RoundStartedEventData>('RoundStarted', (event) =>
      this.handleRoundStarted(event),
    )
  }

  private async handleGameCreated(event: GameCreatedEventData): Promise<void> {
    // 通知 UI 遊戲已創建
    this.presenter.presentStartGameResult({
      gameId: event.payload.gameId,
      success: true,
    })
  }

  private async handleRoundStarted(event: RoundStartedEventData): Promise<void> {
    // 獲取完整的遊戲狀態
    const gameState = await this.gameRepository.getGameState(event.payload.gameId)

    if (gameState) {
      // 將 GameState 轉換為 DTO 格式
      const gameStateDTO = {
        gameId: event.payload.gameId,
        players: [...gameState.players],
        currentPlayer: gameState.currentPlayer,
        fieldCards: [...gameState.field],
        deckCount: gameState.deckCount,
        round: gameState.round,
        phase: gameState.phase,
        isGameOver: gameState.isGameOver,
        lastMove: gameState.lastMove
          ? {
              playerId: gameState.lastMove.playerId,
              cardPlayed: gameState.lastMove.capturedCards[0] || null,
              cardsMatched: gameState.lastMove.matchedCards,
            }
          : undefined,
        roundResult: gameState.roundResult
          ? {
              winner: gameState.roundResult.winner,
              score: gameState.roundResult.score,
              yakuResults: gameState.roundResult.yakuResults,
              koikoiDeclared: gameState.roundResult.koikoiDeclared,
            }
          : undefined,
        koikoiPlayer: gameState.koikoiPlayer || undefined,
      }

      this.presenter.presentGameState(gameStateDTO)
      this.presenter.presentGameMessage('game.messages.gameStarted', {
        playerName: event.payload.currentPlayerName,
      })
    }
  }

  /**
   * UI 層的公開方法：開始新遊戲
   */
  async startNewGame(input: StartGameInputDTO): Promise<string> {
    try {
      // UI 準備
      this.presenter.clearYakuDisplay()
      this.presenter.presentKoikoiDialog(false)
      this.presenter.presentCardSelection(null, null)
      this.presenter.presentGameMessage('game.messages.startingGame')

      // 調用遊戲引擎（事件處理器會自動更新 UI）
      const result = await this.gameEngineCoordinator.startNewGame(input)
      return result.gameId
    } catch (error) {
      this.presenter.presentStartGameResult({
        gameId: '',
        success: false,
        error: String(error),
      })
      this.presenter.presentError('errors.startGameFailed', { error: String(error) })
      throw error
    }
  }
}