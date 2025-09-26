import type {
  GameStateOutputDTO,
  PlayCardOutputDTO,
  KoikoiDecisionOutputDTO,
  StartGameOutputDTO
} from '@/application/dto/GameDTO'
import type { YakuResult } from '@/domain/entities/Yaku'
import type { Card } from '@/domain/entities/Card'

export interface GamePresenter {
  presentGameState(gameState: GameStateOutputDTO): void

  presentPlayCardResult(result: PlayCardOutputDTO): void

  presentStartGameResult(result: StartGameOutputDTO): void

  presentKoikoiDecision(result: KoikoiDecisionOutputDTO): void

  presentYakuDisplay(yakuResults: YakuResult[]): void

  presentGameMessage(messageKey: string, params?: Record<string, string | number>): void

  presentError(errorKey: string, params?: Record<string, string | number>): void

  presentKoikoiDialog(show: boolean): void

  presentGameEnd(winner: string | null, finalScore: number): void

  presentRoundEnd(winner: string | null, score: number): void

  // UI state management methods
  clearYakuDisplay(): void

  presentCardSelection(handCard: Card | null, fieldCard: Card | null): void
}