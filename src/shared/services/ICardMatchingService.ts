/**
 * Card Matching Service Interface
 *
 * Defines the contract for finding matching cards on the field.
 * This is a domain service that both game-engine and game-ui BCs can implement
 * according to their specific needs.
 *
 * game-engine: Implements for actual game logic
 * game-ui: Implements for UI feedback (highlighting, animations)
 */
export interface ICardMatchingService {
  /**
   * Find field cards that match the given card's suit
   * @param cardId ID of the card to match
   * @param fieldCardIds Array of field card IDs to search in
   * @returns Array of matching field card IDs
   */
  findMatches(cardId: string, fieldCardIds: readonly string[]): string[]

  /**
   * Check if two cards can match (same suit)
   * @param cardId1 First card ID
   * @param cardId2 Second card ID
   * @returns true if cards can match
   */
  canMatch(cardId1: string, cardId2: string): boolean

  /**
   * Get card information for matching logic
   * @param cardId Card ID to get info for
   * @returns Card information needed for matching
   */
  getCardInfo(cardId: string): {
    readonly suit: number  // Month (1-12)
    readonly type: 'bright' | 'animal' | 'ribbon' | 'plain'
  } | null

  /**
   * Determine the best automatic selection when multiple matches exist
   * Used when player doesn't select within time limit
   * @param sourceCardId Card that has multiple matches
   * @param matchingFieldCardIds Available matching field cards
   * @returns ID of the automatically selected field card
   */
  selectAutoMatch(sourceCardId: string, matchingFieldCardIds: readonly string[]): string
}
