import { nanoid } from 'nanoid'
import type { GameRepository } from '@/application/ports/repositories/GameRepository'
import type { SetUpGameUseCase } from '@/application/usecases/SetUpGameUseCase'
import type { SetUpRoundUseCase } from '@/application/usecases/SetUpRoundUseCase'
import type { IntegrationEventPublisher } from '@/shared/events/integration-event-publisher'
import type {
  GameCreatedEventData,
  RoundStartedEventData,
  CardDTO,
  PlayerStateDTO,
} from '@/shared/events/integration-events'
import type { StartGameInputDTO, SetUpGameResult } from '@/application/dto/GameDTO'
import type { Card } from '@/domain/entities/Card'
import type { Player } from '@/domain/entities/Player'

export class GameEngineCoordinator {
  constructor(
    private gameRepository: GameRepository,
    private setUpGameUseCase: SetUpGameUseCase,
    private setUpRoundUseCase: SetUpRoundUseCase,
    private eventPublisher: IntegrationEventPublisher,
  ) {}

  async startNewGame(input: StartGameInputDTO): Promise<SetUpGameResult> {
    // 1. 創建遊戲
    const gameResult = await this.setUpGameUseCase.execute(input)
    if (!gameResult.success) {
      throw new Error(gameResult.error || 'Failed to create game')
    }

    // 2. 發布 GameCreatedEvent
    const gameCreatedEvent: GameCreatedEventData = {
      eventId: nanoid(),
      eventType: 'GameCreated',
      occurredAt: new Date().toISOString(),
      aggregateId: gameResult.gameId,
      version: 1,
      payload: {
        gameId: gameResult.gameId,
        players: [
          {
            id: 'player1',
            name: input.player1Name,
            isHuman: true,
          },
          {
            id: 'player2',
            name: input.player2Name,
            isHuman: false,
          },
        ],
      },
    }
    await this.eventPublisher.publish(gameCreatedEvent)

    // 3. 設置第一回合
    const roundResult = await this.setUpRoundUseCase.execute(gameResult.gameId)
    if (!roundResult.success || !roundResult.gameState) {
      throw new Error(roundResult.error || 'Failed to set up round')
    }

    // 4. 發布 RoundStartedEvent
    const gameState = roundResult.gameState
    const roundStartedEvent: RoundStartedEventData = {
      eventId: nanoid(),
      eventType: 'RoundStarted',
      occurredAt: new Date().toISOString(),
      aggregateId: gameResult.gameId,
      version: 1,
      payload: {
        gameId: gameResult.gameId,
        round: gameState.round,
        currentPlayerId: gameState.currentPlayer?.id || '',
        currentPlayerName: gameState.currentPlayer?.name || '',
        players: gameState.players.map((p) => this.mapPlayerToDTO(p)),
        fieldCards: gameState.fieldCards.map((c) => this.mapCardToDTO(c)),
        deckCount: gameState.deckCount,
      },
    }
    await this.eventPublisher.publish(roundStartedEvent)

    return {
      success: true,
      gameId: gameResult.gameId,
      gameState: roundResult.gameState,
    }
  }

  private mapCardToDTO(card: Card): CardDTO {
    return {
      id: card.id,
      suit: card.suit,
      type: card.type,
      points: card.points,
      name: card.name,
      month: card.month,
    }
  }

  private mapPlayerToDTO(player: Player): PlayerStateDTO {
    return {
      id: player.id,
      name: player.name,
      isHuman: player.isHuman,
      handCards: player.hand.map((c) => this.mapCardToDTO(c)),
      capturedCards: player.captured.map((c) => this.mapCardToDTO(c)),
      score: player.score,
    }
  }
}