import type { Card } from './Card'
import { Player } from './Player'
import type { YakuResult } from './Yaku'

export type GamePhase = 'setup' | 'dealing' | 'playing' | 'koikoi' | 'round_end' | 'game_end'
export type GameAction = 'play_card' | 'capture_cards' | 'declare_koikoi' | 'end_round'

export interface GameMove {
  readonly playerId: string
  readonly cardId: string
  readonly matchedCards: Card[]
  readonly capturedCards: Card[]
  readonly timestamp: Date
}

export interface RoundResult {
  readonly winner: Player | null
  readonly yakuResults: YakuResult[]
  readonly score: number
  readonly koikoiDeclared: boolean
}

export class GameState {
  private _players: Player[] = []
  private _deck: Card[] = []
  private _field: Card[] = []
  private _currentPlayerIndex: number = 0
  private _phase: GamePhase = 'setup'
  private _round: number = 1
  private _moves: GameMove[] = []
  private _lastMove: GameMove | null = null
  private _koikoiPlayer: string | null = null
  private _roundResult: RoundResult | null = null

  constructor() {}

  get players(): readonly Player[] {
    return [...this._players]
  }

  get deck(): readonly Card[] {
    return [...this._deck]
  }

  get field(): readonly Card[] {
    return [...this._field]
  }

  get currentPlayer(): Player | null {
    if (this._players.length === 0 || this._currentPlayerIndex >= this._players.length) {
      return null
    }
    return this._players[this._currentPlayerIndex]
  }

  get currentPlayerIndex(): number {
    return this._currentPlayerIndex
  }

  get phase(): GamePhase {
    return this._phase
  }

  get round(): number {
    return this._round
  }

  get moves(): readonly GameMove[] {
    return [...this._moves]
  }

  get lastMove(): GameMove | null {
    return this._lastMove
  }

  get koikoiPlayer(): string | null {
    return this._koikoiPlayer
  }

  get roundResult(): RoundResult | null {
    return this._roundResult
  }

  get isGameOver(): boolean {
    return this._phase === 'game_end'
  }

  get deckCount(): number {
    return this._deck.length
  }

  get fieldCount(): number {
    return this._field.length
  }

  addPlayer(player: Player): void {
    this._players.push(player)
  }

  setDeck(cards: Card[]): void {
    this._deck = [...cards]
  }

  setField(cards: Card[]): void {
    this._field = [...cards]
  }

  drawCard(): Card | null {
    return this._deck.pop() || null
  }

  addToField(cards: Card[]): void {
    this._field.push(...cards)
  }

  removeFromField(cardIds: string[]): Card[] {
    const removed: Card[] = []
    cardIds.forEach(id => {
      const index = this._field.findIndex(c => c.id === id)
      if (index !== -1) {
        removed.push(...this._field.splice(index, 1))
      }
    })
    return removed
  }

  getFieldMatches(card: Card): Card[] {
    return this._field.filter(fieldCard => card.suit === fieldCard.suit)
  }

  setPhase(phase: GamePhase): void {
    this._phase = phase
  }

  nextPlayer(): void {
    this._currentPlayerIndex = (this._currentPlayerIndex + 1) % this._players.length
  }

  setCurrentPlayer(index: number): void {
    if (index >= 0 && index < this._players.length) {
      this._currentPlayerIndex = index
    }
  }

  addMove(move: GameMove): void {
    this._moves.push(move)
    this._lastMove = move
  }

  setKoikoiPlayer(playerId: string | null): void {
    this._koikoiPlayer = playerId
  }

  setRoundResult(result: RoundResult): void {
    this._roundResult = result
  }

  nextRound(): void {
    this._round++
    this._moves = []
    this._lastMove = null
    this._koikoiPlayer = null
    this._roundResult = null
    this._players.forEach(player => player.resetRound())
  }

  reset(): void {
    this._players = []
    this._deck = []
    this._field = []
    this._currentPlayerIndex = 0
    this._phase = 'setup'
    this._round = 1
    this._moves = []
    this._lastMove = null
    this._koikoiPlayer = null
    this._roundResult = null
  }

  getPlayerById(id: string): Player | null {
    return this._players.find(p => p.id === id) || null
  }

  getOpponent(playerId: string): Player | null {
    return this._players.find(p => p.id !== playerId) || null
  }

  canPlayerAct(playerId: string): boolean {
    return this.currentPlayer?.id === playerId && 
           (this._phase === 'playing' || this._phase === 'koikoi')
  }

  clone(): GameState {
    const cloned = new GameState()
    cloned._players = this._players.map(p => p.clone())
    cloned._deck = [...this._deck]
    cloned._field = [...this._field]
    cloned._currentPlayerIndex = this._currentPlayerIndex
    cloned._phase = this._phase
    cloned._round = this._round
    cloned._moves = [...this._moves]
    cloned._lastMove = this._lastMove
    cloned._koikoiPlayer = this._koikoiPlayer
    cloned._roundResult = this._roundResult
    return cloned
  }
}