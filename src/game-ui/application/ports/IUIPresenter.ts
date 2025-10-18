import type { GameViewModel } from '../../domain/models/GameViewModel'
import type { YakuResult } from '@/shared/events/base/YakuResult'
import type { MatchResult } from '@/shared/events/base/MatchResult'

/**
 * UI Presenter Interface (Game UI BC - Output Port)
 *
 * Defines the contract for presenting game state to the UI layer.
 * This interface bridges the application layer with the presentation layer.
 *
 * Design Principles:
 * - Output Port for game-ui BC
 * - Implemented by presentation layer (VueGamePresenter)
 * - Contains methods already implemented in game-ui BC during initial development
 * - Preserves existing functionality to avoid breaking changes
 *
 * Note: This interface includes animation and enhanced UI methods that were
 * implemented as part of the game-ui BC. While these methods go beyond the
 * minimal interface from the old GamePresenter, they are retained to preserve
 * existing functionality and avoid regression during the BC separation refactoring.
 *
 * @see specs/002-game-ui-game/contracts/ports.md for detailed contract
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

  // ==================== User Feedback & Animations ====================

  /**
   * Present a card play animation
   * @param playerId Player who played the card
   * @param cardId Card being played
   * @param handMatch Match result for the hand card
   */
  presentCardPlayAnimation(playerId: string, cardId: string, handMatch: MatchResult): void

  /**
   * Present deck card reveal animation
   * @param cardId Card revealed from deck
   * @param deckMatch Match result for the deck card
   */
  presentDeckRevealAnimation(cardId: string, deckMatch: MatchResult): void

  /**
   * Present yaku achievement display
   * @param playerId Player who achieved the yaku
   * @param yakuResults Array of achieved yaku
   */
  presentYakuAchievement(playerId: string, yakuResults: readonly YakuResult[]): void

  /**
   * Present match selection UI (when multiple matches available)
   * @param sourceCardId Source card that has multiple matches
   * @param selectableCardIds Field cards that can be selected
   * @param timeoutMs Selection timeout in milliseconds
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
   * Present turn transition animation
   * @param fromPlayerId Previous player ID
   * @param toPlayerId Current player ID
   * @param reason Transition reason
   */
  presentTurnTransition(fromPlayerId: string, toPlayerId: string, reason: string): void

  // ==================== Dialogs ====================

  /**
   * Present Koi-Koi decision dialog
   * @param playerId Player making the decision
   * @param currentYaku Current yaku achieved
   * @param currentScore Current score
   */
  presentKoikoiDialog(playerId: string, currentYaku: readonly YakuResult[], currentScore: number): void

  /**
   * Clear Koi-Koi dialog
   */
  clearKoikoiDialog(): void

  /**
   * Present abandon game confirmation dialog
   * Returns a promise that resolves to true if user confirms, false otherwise
   * @param playerId Player requesting to abandon
   */
  presentAbandonConfirmation(playerId: string): Promise<boolean>

  // ==================== Game End ====================

  /**
   * Present round end summary
   * @param winnerId Winner player ID (null for draw)
   * @param winnerName Winner player name (null for draw)
   * @param score Round score
   * @param yakuResults Yaku achieved in the round
   */
  presentRoundEnd(
    winnerId: string | null,
    winnerName: string | null,
    score: number,
    yakuResults: readonly YakuResult[]
  ): void

  /**
   * Present game end summary
   * @param winnerId Winner player ID (null for draw)
   * @param winnerName Winner player name (null for draw)
   * @param finalScore Final score
   * @param totalRounds Total rounds played
   */
  presentGameEnd(
    winnerId: string | null,
    winnerName: string | null,
    finalScore: number,
    totalRounds: number
  ): void

  // ==================== Messages & Errors ====================

  /**
   * Present a general message to the user
   * @param messageKey i18n message key
   * @param params Message parameters
   */
  presentMessage(messageKey: string, params?: Record<string, any>): void

  /**
   * Present an error message
   * @param errorKey i18n error key
   * @param params Error parameters
   */
  presentError(errorKey: string, params?: Record<string, any>): void

  // ==================== Loading & Transitions ====================

  /**
   * Present loading state
   * @param isLoading Loading state
   * @param message Optional loading message
   */
  presentLoading(isLoading: boolean, message?: string): void

  // ==================== Cleanup ====================

  /**
   * Clear all UI states (for game reset)
   */
  clearAll(): void
}
