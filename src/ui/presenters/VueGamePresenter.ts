import type { GamePresenter } from '@/application/ports/presenters/GamePresenter'
import type {
  GameStateOutputDTO,
  PlayCardOutputDTO,
  KoikoiDecisionOutputDTO,
  StartGameOutputDTO,
} from '@/application/dto/GameDTO'
import type { YakuResult } from '@/domain/entities/Yaku'
import type { useGameStore } from '@/ui/stores/gameStore'
import type { Card } from '@/domain/entities/Card'
import type { LocaleService } from '@/infrastructure/services/LocaleService'

export class VueGamePresenter implements GamePresenter {
  constructor(
    private gameStore: ReturnType<typeof useGameStore>,
    private localeService: LocaleService,
  ) {}

  presentGameState(gameState: GameStateOutputDTO): void {
    this.gameStore.updateGameState({
      gameId: gameState.gameId,
      gameStarted: true,
      players: gameState.players,
      currentPlayer: gameState.currentPlayer,
      fieldCards: gameState.fieldCards,
      deckCount: gameState.deckCount,
      round: gameState.round,
      phase: gameState.phase,
      isGameOver: gameState.isGameOver,
      lastMove: gameState.lastMove,
      roundResult: gameState.roundResult,
      koikoiPlayer: gameState.koikoiPlayer,
    })
  }

  presentPlayCardResult(result: PlayCardOutputDTO): void {
    if (result.success) {
      // Clear selections after successful play
      this.gameStore.clearSelections()

      // Update Yaku display if any
      if (result.yakuResults.length > 0) {
        this.gameStore.setYakuDisplay(result.yakuResults)
      }
    }

    // Clear any previous errors if play was successful
    if (result.success) {
      this.gameStore.clearError()
    } else if (result.error) {
      this.gameStore.setError(result.error)
    }
  }

  presentStartGameResult(result: StartGameOutputDTO): void {
    if (result.success) {
      this.gameStore.setGameStarted(true)
      this.gameStore.clearError()
    } else if (result.error) {
      this.gameStore.setError(result.error)
    }
  }

  presentKoikoiDecision(result: KoikoiDecisionOutputDTO): void {
    if (result.success) {
      this.gameStore.setShowKoikoiDialog(false)
      this.gameStore.setYakuDisplay([])
      this.gameStore.clearError()
    } else if (result.error) {
      this.gameStore.setError(result.error)
    }
  }

  presentYakuDisplay(yakuResults: YakuResult[]): void {
    this.gameStore.setYakuDisplay(yakuResults)
  }

  presentGameMessage(messageKey: string, params?: Record<string, string | number>): void {
    this.gameStore.setGameMessage(messageKey, params)
    this.gameStore.clearError() // Clear error when showing regular message
  }

  presentError(errorKey: string, params?: Record<string, string | number>): void {
    const translatedError = this.localeService.translate(errorKey, params)
    this.gameStore.setError(translatedError)
  }

  presentKoikoiDialog(show: boolean): void {
    this.gameStore.setShowKoikoiDialog(show)
  }

  presentGameEnd(winner: string | null, finalScore: number): void {
    const messageKey = winner ? 'game.messages.gameWon' : 'game.messages.gameDraw'
    const params = winner ? { winner, finalScore } : undefined

    this.gameStore.setGameMessage(messageKey, params)
    this.gameStore.setGameOver(true)
    this.gameStore.setPhase('game_end')
  }

  presentRoundEnd(winner: string | null, score: number): void {
    const messageKey = winner ? 'game.messages.roundWon' : 'game.messages.roundDraw'
    const params = winner ? { winner, score } : undefined

    this.gameStore.setGameMessage(messageKey, params)
    this.gameStore.setPhase('round_end')
  }

  // Additional helper methods for Vue-specific UI updates
  presentLoading(isLoading: boolean): void {
    this.gameStore.setLoading(isLoading)
  }

  presentCardSelection(handCard: Card | null, fieldCard: Card | null): void {
    this.gameStore.setSelectedHandCard(handCard)
    this.gameStore.setSelectedFieldCard(fieldCard)
  }

  clearYakuDisplay(): void {
    this.gameStore.setYakuDisplay([])
  }

  clearError(): void {
    this.gameStore.clearError()
  }

  presentGameReset(): void {
    this.gameStore.resetGame()
  }

  resetPresenter(): void {
    this.gameStore.resetGame()
  }
}
