import { CARD_TYPES } from '@/shared/constants/gameConstants'

export type CardType = typeof CARD_TYPES[keyof typeof CARD_TYPES]

export interface Card {
  readonly id: string
  readonly suit: number
  readonly type: CardType
  readonly points: number
  readonly name: string
  readonly month: number
}

export class CardEntity implements Card {
  readonly id: string
  readonly suit: number
  readonly type: CardType
  readonly points: number
  readonly name: string
  readonly month: number

  constructor(
    suit: number,
    type: CardType,
    points: number,
    name: string,
    index: number = 0
  ) {
    this.id = `${suit}-${type}-${index}`
    this.suit = suit
    this.type = type
    this.points = points
    this.name = name
    this.month = suit
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

  equals(other: Card): boolean {
    return this.id === other.id
  }

  toString(): string {
    return `${this.name} (${this.suit}月 - ${this.type})`
  }
}