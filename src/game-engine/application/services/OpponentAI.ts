import type { GameState } from '@/domain/entities/GameState'
import type { PlayCardRequest } from '@/application/ports/repositories/GameRepository'

/**
 * Opponent AI Service (Game Engine BC)
 *
 * Moved from the original application layer to game-engine BC.
 * This service handles AI decision making for computer opponents.
 *
 * Responsibilities:
 * - Analyze game state for AI opponent
 * - Choose optimal card to play based on strategy
 * - Handle field card selection when multiple matches exist
 * - Provide Koi-Koi decision logic for AI
 *
 * Note: This is a domain service that doesn't need event publishing
 * as it only provides decision recommendations - actual game actions
 * are handled by use cases.
 */
export class OpponentAI {
  /**
   * Decide the AI opponent's next move
   * @param gameState - Current game state
   * @returns Play card request or null if no valid move
   */
  static decideMove(gameState: GameState): PlayCardRequest | null {
    if (!gameState.currentPlayer || gameState.currentPlayer.id !== 'player2') {
      return null
    }

    const opponent = gameState.currentPlayer
    if (opponent.hand.length === 0) {
      return null
    }

    // Enhanced AI strategy: prioritize cards that will capture valuable cards
    const handCards = [...opponent.hand]

    // Sort hand cards by potential value captured
    const cardValues = handCards.map(handCard => {
      const matches = gameState.getFieldMatches(handCard)
      let totalValue = 0

      if (matches.length > 0) {
        // Calculate total points of capturable cards
        totalValue = matches.reduce((sum, card) => sum + card.points, 0)
        // Bonus for capturing multiple cards
        if (matches.length > 1) {
          totalValue += 5 // bonus for choice
        }
      }

      return {
        card: handCard,
        matches,
        value: totalValue
      }
    })

    // Sort by value (descending)
    cardValues.sort((a, b) => b.value - a.value)

    // Play the most valuable move
    const bestMove = cardValues[0]

    if (bestMove.matches.length > 0) {
      // If multiple matches, choose the highest value card
      const bestMatch = bestMove.matches.reduce((best, current) =>
        current.points > best.points ? current : best
      )

      return {
        playerId: opponent.id,
        cardId: bestMove.card.id,
        selectedFieldCard: bestMatch.id,
      }
    }

    // If no matches, play the card with lowest value to minimize loss
    const lowestValueCard = handCards.reduce((lowest, current) =>
      current.points < lowest.points ? current : lowest
    )

    return {
      playerId: opponent.id,
      cardId: lowestValueCard.id,
    }
  }

  /**
   * Decide whether AI should declare Koi-Koi or end the round
   * @param yakuResults - Current yaku achieved by AI
   * @param currentScore - Current round score
   * @param handCount - Number of cards remaining in hand
   * @returns true to continue (Koi-Koi), false to end round
   */
  static decideKoikoi(
    yakuResults: any[],
    currentScore: number,
    handCount: number
  ): boolean {
    // Conservative AI strategy

    // If score is already high, be more cautious
    if (currentScore >= 10) {
      return false // Take the safe win
    }

    // If many cards left in hand, more opportunities for higher scores
    if (handCount >= 4 && currentScore >= 5) {
      return true // Take the risk for higher score
    }

    // If low score and many cards, take the risk
    if (currentScore <= 3 && handCount >= 3) {
      return true
    }

    // Default: be conservative and take current score
    return false
  }

  /**
   * Select field card when AI has multiple matching options
   * @param matches - Available field cards to match
   * @returns Selected field card
   */
  static selectFieldCard(matches: any[]): any {
    if (matches.length === 0) {
      return null
    }

    if (matches.length === 1) {
      return matches[0]
    }

    // Choose highest value card
    return matches.reduce((best, current) =>
      current.points > best.points ? current : best
    )
  }
}
