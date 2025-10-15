import type { Card } from '../entities/Card'
import type { ICardMatchingService } from '@/shared/services/ICardMatchingService'
import { HANAFUDA_CARDS } from '@/shared/constants/gameConstants'

/**
 * Game Engine Card Matching Service
 *
 * Implements card matching logic for the game engine.
 * This service handles finding matches, automatic selection priority,
 * and card information lookup based on card IDs.
 */
export class EngineCardMatchingService implements ICardMatchingService {
  /**
   * Find field cards that match the given card's suit
   */
  findMatches(cardId: string, fieldCardIds: readonly string[]): string[] {
    const sourceCardInfo = this.getCardInfo(cardId)
    if (!sourceCardInfo) return []

    return fieldCardIds.filter(fieldCardId => {
      const fieldCardInfo = this.getCardInfo(fieldCardId)
      return fieldCardInfo && fieldCardInfo.suit === sourceCardInfo.suit
    })
  }

  /**
   * Check if two cards can match (same suit)
   */
  canMatch(cardId1: string, cardId2: string): boolean {
    const card1Info = this.getCardInfo(cardId1)
    const card2Info = this.getCardInfo(cardId2)

    if (!card1Info || !card2Info) return false

    return card1Info.suit === card2Info.suit
  }

  /**
   * Get card information for matching logic
   */
  getCardInfo(cardId: string): {
    readonly suit: number
    readonly type: 'bright' | 'animal' | 'ribbon' | 'plain'
  } | null {
    // Parse card ID format: "{suit}-{type}-{index}"
    const parts = cardId.split('-')
    if (parts.length !== 3) return null

    const suit = parseInt(parts[0])
    const type = parts[1] as 'bright' | 'animal' | 'ribbon' | 'plain'

    // Validate suit range
    if (suit < 1 || suit > 12) return null

    // Validate type
    if (!['bright', 'animal', 'ribbon', 'plain'].includes(type)) return null

    return { suit, type }
  }

  /**
   * Determine the best automatic selection when multiple matches exist
   * Priority: bright (20) > animal (10) > ribbon (5) > plain (1)
   * Within same type, select first one in field order
   */
  selectAutoMatch(sourceCardId: string, matchingFieldCardIds: readonly string[]): string {
    if (matchingFieldCardIds.length === 0) {
      throw new Error('No matching field cards provided for auto selection')
    }

    if (matchingFieldCardIds.length === 1) {
      return matchingFieldCardIds[0]
    }

    // Get card info for all matching cards with their points
    const cardInfos = matchingFieldCardIds.map(cardId => {
      const info = this.getCardInfo(cardId)
      if (!info) return null

      // Get points based on type
      const points = this.getCardPoints(info.type)

      return {
        cardId,
        ...info,
        points
      }
    }).filter(Boolean) as Array<{
      cardId: string
      suit: number
      type: 'bright' | 'animal' | 'ribbon' | 'plain'
      points: number
    }>

    if (cardInfos.length === 0) {
      // Fallback to first card if no valid info found
      return matchingFieldCardIds[0]
    }

    // Sort by points (descending), then by original field order (ascending)
    cardInfos.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points // Higher points first
      }
      // If same points, maintain original field order
      const aIndex = matchingFieldCardIds.indexOf(a.cardId)
      const bIndex = matchingFieldCardIds.indexOf(b.cardId)
      return aIndex - bIndex
    })

    return cardInfos[0].cardId
  }

  /**
   * Get card points based on type
   */
  private getCardPoints(type: 'bright' | 'animal' | 'ribbon' | 'plain'): number {
    switch (type) {
      case 'bright': return 20
      case 'animal': return 10
      case 'ribbon': return 5
      case 'plain': return 1
      default: return 0
    }
  }
}
