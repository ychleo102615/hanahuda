import type { GameViewModel } from '../../domain/models/GameViewModel'
import type { YakuResult } from '@/shared/events/base/YakuResult'
import type { MatchResult } from '@/shared/events/base/MatchResult'

/**
 * UI Presenter Interface (Game UI BC - Output Port)
 *
 * Defines the contract for presenting game state to the UI layer.
 * This interface bridges the application layer with the presentation layer.
 *
 * Design:
 * - Output Port for game-ui BC
 * - Implemented by presentation layer (VueGamePresenter)
 * - Methods are organized by UI concern (state, feedback, dialogs)
 */
export interface IUIPresenter {
  // ==================== State Presentation ====================

  /**
   * Present the complete game view model to the UI
   * Called after game initialization or state sync
   */
  presentGameState(gameViewModel: GameViewModel): void

  /**
   * Present a partial state update (for incremental changes)
   * More efficient than full state presentation
   */
  presentStateUpdate(updates: Partial<GameViewModel>): void

  // ==================== User Feedback ====================

  /**
   * Present a card play animation
   */
  presentCardPlayAnimation(playerId: string, cardId: string, handMatch: MatchResult): void

  /**
   * Present deck card reveal animation
   */
  presentDeckRevealAnimation(cardId: string, deckMatch: MatchResult): void

  /**
   * Present yaku achievement display
   */
  presentYakuAchievement(playerId: string, yakuResults: readonly YakuResult[]): void

  /**
   * Present match selection UI (when multiple matches available)
   */
  presentMatchSelection(
    sourceCardId: string,
    selectableCardIds: readonly string[],
    timeoutMs: number
  ): void

  /**
   * Clear match selection UI
   */
  clearMatchSelection(): void

  /**
   * Present a general message to the user
   */
  presentMessage(messageKey: string, params?: Record<string, any>): void

  /**
   * Present an error message
   */
  presentError(errorKey: string, params?: Record<string, any>): void

  // ==================== Dialogs ====================

  /**
   * Present Koi-Koi decision dialog
   */
  presentKoikoiDialog(playerId: string, currentYaku: readonly YakuResult[], currentScore: number): void

  /**
   * Clear Koi-Koi dialog
   */
  clearKoikoiDialog(): void

  /**
   * Present round end summary
   */
  presentRoundEnd(
    winnerId: string | null,
    winnerName: string | null,
    score: number,
    yakuResults: readonly YakuResult[]
  ): void

  /**
   * Present game end summary
   */
  presentGameEnd(
    winnerId: string | null,
    winnerName: string | null,
    finalScore: number,
    totalRounds: number
  ): void

  // ==================== Loading & Transitions ====================

  /**
   * Present loading state
   */
  presentLoading(isLoading: boolean, message?: string): void

  /**
   * Present turn transition animation
   */
  presentTurnTransition(fromPlayerId: string, toPlayerId: string, reason: string): void

  // ==================== Cleanup ====================

  /**
   * Clear all UI states (for game reset)
   */
  clearAll(): void
}
