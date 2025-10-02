import type { GamePresenter } from '@/application/ports/presenters/GamePresenter'
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type { GameEngineCoordinator } from '@/features/game-engine/application/usecases/GameEngineCoordinator'
import type { IntegrationEventSubscriber } from '@/shared/events/integration-event-subscriber'
import type {
  GameCreatedEventData,
  RoundStartedEventData,
  CardPlayedEventData,
  YakuAchievedEventData,
  PlayerTurnChangedEventData,
  KoikoiDecisionMadeEventData,
  RoundEndedEventData,
  GameEndedEventData,
} from '@/shared/events/integration-events'
import type {
  StartGameInputDTO,
  PlayCardInputDTO,
  KoikoiDecisionInputDTO,
} from '@/application/dto/GameDTO'

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

    // 訂閱出牌事件
    this.eventSubscriber.subscribe<CardPlayedEventData>('CardPlayed', (event) =>
      this.handleCardPlayed(event),
    )

    // 訂閱役種達成事件
    this.eventSubscriber.subscribe<YakuAchievedEventData>('YakuAchieved', (event) =>
      this.handleYakuAchieved(event),
    )

    // 訂閱玩家切換事件
    this.eventSubscriber.subscribe<PlayerTurnChangedEventData>('PlayerTurnChanged', (event) =>
      this.handlePlayerTurnChanged(event),
    )

    // 訂閱 Koikoi 決策事件
    this.eventSubscriber.subscribe<KoikoiDecisionMadeEventData>(
      'KoikoiDecisionMade',
      (event) => this.handleKoikoiDecisionMade(event),
    )

    // 訂閱回合結束事件
    this.eventSubscriber.subscribe<RoundEndedEventData>('RoundEnded', (event) =>
      this.handleRoundEnded(event),
    )

    // 訂閱遊戲結束事件
    this.eventSubscriber.subscribe<GameEndedEventData>('GameEnded', (event) =>
      this.handleGameEnded(event),
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

  private async handleCardPlayed(event: CardPlayedEventData): Promise<void> {
    // 獲取更新後的遊戲狀態
    const gameState = await this.gameRepository.getGameState(event.payload.gameId)
    if (!gameState) return

    // 更新 UI 遊戲狀態
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
      roundResult: gameState.roundResult,
      koikoiPlayer: gameState.koikoiPlayer || undefined,
    }

    this.presenter.presentGameState(gameStateDTO)

    // 顯示出牌消息
    if (event.payload.capturedCards.length > 0) {
      this.presenter.presentGameMessage('game.messages.cardPlayed', {
        cardName: event.payload.playedCard.name
          ? `cards.names.${event.payload.playedCard.name}`
          : '',
        capturedCount: event.payload.capturedCards.length,
      })
    }
  }

  private handleYakuAchieved(event: YakuAchievedEventData): void {
    // 顯示役種
    this.presenter.presentYakuDisplay(
      event.payload.yakuResults.map((yaku) => ({
        yaku: { name: yaku.name, points: yaku.score },
        points: yaku.score,
        cards: [], // 簡化：不傳遞卡牌詳情
      })),
    )

    // 如果可以宣告 Koikoi，顯示對話框
    if (event.payload.canDeclareKoikoi) {
      this.presenter.presentKoikoiDialog(true)
      this.presenter.presentGameMessage('game.messages.koikoiAchieved')
    } else {
      this.presenter.presentGameMessage('game.messages.roundAutoEnd')
    }
  }

  private handlePlayerTurnChanged(event: PlayerTurnChangedEventData): void {
    // 通知 UI 玩家切換
    this.presenter.presentGameMessage('game.messages.playerTurnChanged', {
      playerName: event.payload.currentPlayerName,
    })
  }

  private async handleKoikoiDecisionMade(event: KoikoiDecisionMadeEventData): Promise<void> {
    // 清理 UI 狀態
    this.presenter.clearYakuDisplay()
    this.presenter.presentKoikoiDialog(false)

    // 獲取更新後的遊戲狀態
    const gameState = await this.gameRepository.getGameState(event.payload.gameId)
    if (!gameState) return

    // 更新 UI 遊戲狀態
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
      roundResult: gameState.roundResult,
      koikoiPlayer: gameState.koikoiPlayer || undefined,
    }

    this.presenter.presentGameState(gameStateDTO)

    // 顯示決策結果消息
    if (event.payload.continueGame) {
      this.presenter.presentGameMessage('game.messages.koikoiDeclared')
    } else {
      this.presenter.presentGameMessage('game.messages.roundEnded')
    }
  }

  private handleRoundEnded(event: RoundEndedEventData): void {
    // 顯示回合結束結果
    if (event.payload.winnerId) {
      this.presenter.presentRoundEnd(event.payload.winnerName!, event.payload.score)
    } else {
      // 平局
      this.presenter.presentGameMessage('game.messages.roundDrawNoPoints')
      if (event.payload.yakuResults.length > 0) {
        this.presenter.presentYakuDisplay(
          event.payload.yakuResults.map((yaku) => ({
            yaku: { name: yaku.name, points: yaku.score },
            points: yaku.score,
            cards: [], // 簡化
          })),
        )
      }
    }
  }

  private handleGameEnded(event: GameEndedEventData): void {
    // 顯示遊戲結束結果
    const finalScore = event.payload.winnerId
      ? event.payload.finalScores.find((s) => s.playerId === event.payload.winnerId)?.score || 0
      : 0

    this.presenter.presentGameEnd(event.payload.winnerName, finalScore)
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

  /**
   * UI 層的公開方法：出牌
   */
  async playCard(gameId: string, input: PlayCardInputDTO): Promise<void> {
    try {
      // 調用遊戲引擎（事件處理器會自動更新 UI）
      const result = await this.gameEngineCoordinator.playCard(gameId, input)

      if (!result.success && result.error) {
        this.presenter.presentError(result.error)
      }
    } catch (error) {
      this.presenter.presentError('errors.playCardFailed', { error: String(error) })
      throw error
    }
  }

  /**
   * UI 層的公開方法：Koikoi 決策
   */
  async makeKoikoiDecision(gameId: string, input: KoikoiDecisionInputDTO): Promise<void> {
    try {
      // 調用遊戲引擎（事件處理器會自動更新 UI）
      await this.gameEngineCoordinator.makeKoikoiDecision(gameId, input)

      // 如果選擇不繼續，觸發 endRound
      if (!input.declareKoikoi) {
        await this.gameEngineCoordinator.endRound(gameId)
      }
    } catch (error) {
      this.presenter.presentError('errors.koikoiDecisionFailed', { error: String(error) })
      throw error
    }
  }

  /**
   * UI 層的公開方法：開始下一回合
   */
  async startNextRound(gameId: string): Promise<void> {
    try {
      // UI 準備
      this.presenter.clearYakuDisplay()
      this.presenter.presentKoikoiDialog(false)

      // 調用遊戲引擎（事件處理器會自動更新 UI）
      await this.gameEngineCoordinator.startNextRound(gameId)
    } catch (error) {
      this.presenter.presentError('errors.startNextRoundFailed', { error: String(error) })
      throw error
    }
  }
}