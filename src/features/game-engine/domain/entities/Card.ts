import { CARD_TYPES } from '@/shared/constants/gameConstants'

export type CardType = typeof CARD_TYPES[keyof typeof CARD_TYPES]

export interface Card {
  readonly id: number
  readonly suit: number
  readonly type: CardType
  readonly points: number
}

/**
 * Card - 值對象（Value Object）
 *
 * 職責：表示一張花牌，不可變，通過屬性值判斷相等性
 *
 * 設計原則：
 * - 不可變：所有屬性都是 readonly
 * - 數字標識：id 為數字 (1-48)，定義在 gameConstants.ts
 * - 值比較：equals 方法基於業務屬性
 * - 最小屬性：僅保留核心業務屬性（id, suit, type, points）
 */
export class CardEntity implements Card {
  readonly id: number
  readonly suit: number
  readonly type: CardType
  readonly points: number

  constructor(
    id: number,
    suit: number,
    type: CardType,
    points: number
  ) {
    this.id = id
    this.suit = suit
    this.type = type
    this.points = points
  }

  isBright(): boolean {
    return this.type === CARD_TYPES.BRIGHT
  }

  isAnimal(): boolean {
    return this.type === CARD_TYPES.ANIMAL
  }

  isRibbon(): boolean {
    return this.type === CARD_TYPES.RIBBON
  }

  isPlain(): boolean {
    return this.type === CARD_TYPES.PLAIN
  }

  canMatch(other: Card): boolean {
    return this.suit === other.suit
  }

  /**
   * 值對象相等性比較 - 基於 ID
   * 在花牌遊戲中，id 是唯一的業務標識符
   */
  equals(other: Card): boolean {
    return this.id === other.id
  }

  toString(): string {
    return `Card#${this.id} (${this.suit}月 - ${this.type}, ${this.points}點)`
  }
}