import type { Card } from '../entities/Card'
import type { Player } from '../entities/Player'
import type { GameState } from '../entities/GameState'

export interface CardVisual {
  card: Card
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scale: number
  visible: boolean
  interactive: boolean
}

export interface PlayerVisual {
  player: Player
  handPosition: { x: number; y: number }
  capturedPosition: { x: number; y: number }
  namePosition: { x: number; y: number }
  scorePosition: { x: number; y: number }
}

export interface GameVisual {
  fieldPosition: { x: number; y: number; width: number; height: number }
  deckPosition: { x: number; y: number }
  players: PlayerVisual[]
  cards: CardVisual[]
}

export interface RenderOptions {
  width: number
  height: number
  cardWidth: number
  cardHeight: number
  animationDuration: number
  showDebugInfo: boolean
}

export interface UIRenderer {
  initialize(container: HTMLElement, options: RenderOptions): Promise<void>
  
  render(gameState: GameState): Promise<void>
  
  animateCardMove(
    card: Card,
    fromPosition: { x: number; y: number },
    toPosition: { x: number; y: number },
    duration: number
  ): Promise<void>
  
  highlightCards(cardIds: string[]): void
  
  showCardSelection(cards: Card[], callback: (selectedCard: Card) => void): void
  
  showYakuDisplay(yakuResults: unknown[]): Promise<void>
  
  showKoikoiDialog(callback: (declared: boolean) => void): void
  
  updatePlayerInfo(player: Player): void
  
  updateFieldCards(cards: Card[]): void
  
  updateHandCards(playerId: string, cards: Card[]): void
  
  setCardInteractive(cardId: string, interactive: boolean): void
  
  onCardClick(callback: (cardId: string) => void): void
  
  onFieldCardClick(callback: (cardId: string) => void): void
  
  resize(width: number, height: number): void
  
  destroy(): void
  
  getCardPosition(cardId: string): { x: number; y: number } | null
  
  isAnimating(): boolean
}