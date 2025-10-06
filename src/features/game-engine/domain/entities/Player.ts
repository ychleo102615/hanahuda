import type { Card } from './Card'

export interface PlayerInfo {
  readonly id: string
  readonly name: string
  readonly isHuman: boolean
}

export class Player implements PlayerInfo {
  readonly id: string
  readonly name: string
  readonly isHuman: boolean
  
  private _hand: Card[] = []
  private _captured: Card[] = []
  private _score: number = 0
  private _roundScore: number = 0

  constructor(id: string, name: string, isHuman: boolean = true) {
    this.id = id
    this.name = name
    this.isHuman = isHuman
  }

  get hand(): readonly Card[] {
    return [...this._hand]
  }

  get captured(): readonly Card[] {
    return [...this._captured]
  }

  get score(): number {
    return this._score
  }

  get roundScore(): number {
    return this._roundScore
  }

  get handCount(): number {
    return this._hand.length
  }

  get capturedCount(): number {
    return this._captured.length
  }

  addToHand(card: Card): void {
    this._hand.push(card)
  }

  removeFromHand(cardId: number): Card | null {
    const index = this._hand.findIndex(c => c.id === cardId)
    if (index !== -1) {
      return this._hand.splice(index, 1)[0]
    }
    return null
  }

  addToCaptured(cards: Card[]): void {
    this._captured.push(...cards)
  }

  setHand(cards: Card[]): void {
    this._hand = [...cards]
  }

  clearHand(): void {
    this._hand = []
  }

  clearCaptured(): void {
    this._captured = []
  }

  addScore(points: number): void {
    this._score += points
  }

  setRoundScore(points: number): void {
    this._roundScore = points
  }

  resetRound(): void {
    this._roundScore = 0
    this.clearHand()
    this.clearCaptured()
  }

  hasCard(cardId: number): boolean {
    return this._hand.some(c => c.id === cardId)
  }

  canPlayCard(cardId: number): boolean {
    return this.hasCard(cardId)
  }

  clone(): Player {
    const cloned = new Player(this.id, this.name, this.isHuman)
    cloned._hand = [...this._hand]
    cloned._captured = [...this._captured]
    cloned._score = this._score
    cloned._roundScore = this._roundScore
    return cloned
  }

  toString(): string {
    return `${this.name} (Score: ${this._score}, Hand: ${this._hand.length}, Captured: ${this._captured.length})`
  }
}