import type { ICardMatchingService } from '@/shared/services/ICardMatchingService'
import type { CardDefinition } from '../models/GameViewModel'

/**
 * UI Card Matching Service (Game UI BC)
 *
 * Implements card matching logic for UI layer.
 * Uses CardDefinitions from GameViewModel.
 *
 * Responsibilities:
 * - Find matching cards for UI highlighting
 * - Validate card matches for user selections
 * - Provide automatic match selection (priority-based)
 *
 * Design:
 * - Pure functions, no side effects
 * - Works with CardDefinitions (not Card entities)
 * - Independent of game-engine BC
 */
export class UICardMatchingService implements ICardMatchingService {
  constructor(private readonly cardDefinitions: readonly CardDefinition[]) {}

  /**
   * Find field cards that match the given card's suit
   */
  findMatches(cardId: string, fieldCardIds: readonly string[]): string[] {
    const sourceCard = this.getCardInfo(cardId)
    if (!sourceCard) {
      return []
    }

    return fieldCardIds.filter((fieldCardId) => {
      const fieldCard = this.getCardInfo(fieldCardId)
      return fieldCard && fieldCard.suit === sourceCard.suit
    })
  }

  /**
   * Check if two cards can match (same suit)
   */
  canMatch(cardId1: string, cardId2: string): boolean {
    const card1 = this.getCardInfo(cardId1)
    const card2 = this.getCardInfo(cardId2)

    if (!card1 || !card2) {
      return false
    }

    return card1.suit === card2.suit
  }

  /**
   * Get card information for matching logic
   */
  getCardInfo(
    cardId: string
  ): { readonly suit: number; readonly type: 'bright' | 'animal' | 'ribbon' | 'plain' } | null {
    const card = this.cardDefinitions.find((c) => c.id === cardId)
    if (!card) {
      return null
    }

    return {
      suit: card.suit,
      type: card.type,
    }
  }

  /**
   * Determine the best automatic selection when multiple matches exist
   *
   * Priority order (highest to lowest):
   * 1. Bright cards (20 points)
   * 2. Animal cards (10 points)
   * 3. Ribbon cards (5 points)
   * 4. Plain cards (1 point)
   *
   * Within same type, select the first card (arbitrary but consistent)
   */
  selectAutoMatch(sourceCardId: string, matchingFieldCardIds: readonly string[]): string {
    if (matchingFieldCardIds.length === 0) {
      throw new Error('No matching cards available for auto-selection')
    }

    if (matchingFieldCardIds.length === 1) {
      return matchingFieldCardIds[0]
    }

    // Get card definitions for all matching cards
    const matchingCards = matchingFieldCardIds
      .map((id) => {
        const card = this.cardDefinitions.find((c) => c.id === id)
        return card ? card : null
      })
      .filter((c): c is CardDefinition => c !== null)

    if (matchingCards.length === 0) {
      // Fallback: return first card if no definitions found
      return matchingFieldCardIds[0]
    }

    // Define type priority
    const typePriority: Record<string, number> = {
      bright: 4,
      animal: 3,
      ribbon: 2,
      plain: 1,
    }

    // Sort by priority (highest first), then by points (highest first)
    matchingCards.sort((a, b) => {
      const priorityDiff = (typePriority[b.type] || 0) - (typePriority[a.type] || 0)
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      return b.points - a.points
    })

    return matchingCards[0].id
  }

  /**
   * Get card display information (for UI rendering)
   */
  getCardDefinition(cardId: string): CardDefinition | undefined {
    return this.cardDefinitions.find((c) => c.id === cardId)
  }

  /**
   * Group cards by suit (for UI display)
   */
  groupCardsBySuit(cardIds: readonly string[]): Map<number, string[]> {
    const groups = new Map<number, string[]>()

    cardIds.forEach((cardId) => {
      const card = this.getCardInfo(cardId)
      if (card) {
        const existing = groups.get(card.suit) || []
        groups.set(card.suit, [...existing, cardId])
      }
    })

    return groups
  }

  /**
   * Calculate total points for a set of cards (for UI display)
   */
  calculatePoints(cardIds: readonly string[]): number {
    return cardIds.reduce((total, cardId) => {
      const card = this.cardDefinitions.find((c) => c.id === cardId)
      return total + (card?.points || 0)
    }, 0)
  }
}
