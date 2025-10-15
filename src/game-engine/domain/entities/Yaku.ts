import type { Card, CardType } from './Card'
import { YAKU_COMBINATIONS, CARD_TYPES } from '@/shared/constants/gameConstants'

export interface YakuRule {
  readonly name: string
  readonly points: number
  readonly requiredCards: readonly CardType[]
  readonly minCount?: number
  readonly specific?: readonly number[]
  readonly excludeCards?: readonly number[]
  readonly includeCards?: readonly number[]
}

export interface YakuResult {
  readonly yaku: YakuRule
  readonly cards: Card[]
  readonly points: number
}

export class Yaku {
  static checkYaku(capturedCards: readonly Card[]): YakuResult[] {
    const results: YakuResult[] = []

    const brightCards = capturedCards.filter(c => c.type === CARD_TYPES.BRIGHT)
    const animalCards = capturedCards.filter(c => c.type === CARD_TYPES.ANIMAL)
    const ribbonCards = capturedCards.filter(c => c.type === CARD_TYPES.RIBBON)
    const plainCards = capturedCards.filter(c => c.type === CARD_TYPES.PLAIN)

    // Check bright card yaku with proper November card handling
    if (brightCards.length >= 5) {
      results.push({
        yaku: YAKU_COMBINATIONS.GOKO,
        cards: brightCards,
        points: YAKU_COMBINATIONS.GOKO.points
      })
    } else if (brightCards.length === 4) {
      const hasNovemberBright = brightCards.some(card => card.suit === 11)
      if (hasNovemberBright) {
        // 雨四光 (Ame-Shiko) - includes November bright card
        results.push({
          yaku: YAKU_COMBINATIONS.AME_SHIKO,
          cards: brightCards,
          points: YAKU_COMBINATIONS.AME_SHIKO.points
        })
      } else {
        // 四光 (Shiko) - excludes November bright card
        results.push({
          yaku: YAKU_COMBINATIONS.SHIKO,
          cards: brightCards,
          points: YAKU_COMBINATIONS.SHIKO.points
        })
      }
    } else if (brightCards.length === 3) {
      const hasNovemberBright = brightCards.some(card => card.suit === 11)
      if (!hasNovemberBright) {
        // 三光 (Sanko) - only valid without November bright card
        results.push({
          yaku: YAKU_COMBINATIONS.SANKO,
          cards: brightCards,
          points: YAKU_COMBINATIONS.SANKO.points
        })
      }
    }

    const inoShikaCho = Yaku.checkInoShikaCho(animalCards)
    if (inoShikaCho.length > 0) {
      results.push({
        yaku: YAKU_COMBINATIONS.INO_SHIKA_CHO,
        cards: inoShikaCho,
        points: YAKU_COMBINATIONS.INO_SHIKA_CHO.points
      })
    }

    const akaTan = Yaku.checkAkaTan(ribbonCards)
    if (akaTan.length > 0) {
      results.push({
        yaku: YAKU_COMBINATIONS.AKA_TAN,
        cards: akaTan,
        points: YAKU_COMBINATIONS.AKA_TAN.points
      })
    }

    const aoTan = Yaku.checkAoTan(ribbonCards)
    if (aoTan.length > 0) {
      results.push({
        yaku: YAKU_COMBINATIONS.AO_TAN,
        cards: aoTan,
        points: YAKU_COMBINATIONS.AO_TAN.points
      })
    }

    if (animalCards.length >= 5) {
      results.push({
        yaku: YAKU_COMBINATIONS.TANE,
        cards: animalCards,
        points: YAKU_COMBINATIONS.TANE.points + (animalCards.length - 5)
      })
    }

    if (ribbonCards.length >= 5) {
      results.push({
        yaku: YAKU_COMBINATIONS.TAN,
        cards: ribbonCards,
        points: YAKU_COMBINATIONS.TAN.points + (ribbonCards.length - 5)
      })
    }

    if (plainCards.length >= 10) {
      results.push({
        yaku: YAKU_COMBINATIONS.KASU,
        cards: plainCards,
        points: YAKU_COMBINATIONS.KASU.points + (plainCards.length - 10)
      })
    }

    return results
  }

  private static checkInoShikaCho(animalCards: Card[]): Card[] {
    const required = [7, 10, 6]
    const found = required.map(month =>
      animalCards.find(card => card.month === month)
    ).filter(Boolean) as Card[]

    return found.length === 3 ? found : []
  }

  private static checkAkaTan(ribbonCards: Card[]): Card[] {
    const required = [1, 2, 3]
    const found = required.map(month =>
      ribbonCards.find(card => card.month === month)
    ).filter(Boolean) as Card[]

    return found.length === 3 ? found : []
  }

  private static checkAoTan(ribbonCards: Card[]): Card[] {
    const required = [6, 9, 10]
    const found = required.map(month =>
      ribbonCards.find(card => card.month === month)
    ).filter(Boolean) as Card[]

    return found.length === 3 ? found : []
  }

  static calculateTotalScore(yakuResults: YakuResult[]): number {
    return yakuResults.reduce((total, result) => total + result.points, 0)
  }

  static hasWinningCombination(yakuResults: YakuResult[]): boolean {
    return yakuResults.length > 0
  }
}
