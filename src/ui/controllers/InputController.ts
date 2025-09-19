import type { Card } from '@/domain/entities/Card'

export interface InputHandler {
  onHandCardSelected(card: Card): void
  onFieldCardSelected(card: Card): void
  onPlayCardAction(): void
  onKoikoiDecision(continueGame: boolean): void
  onNextRoundAction(): void
  onNewGameAction(): void
}

export class InputController {
  private selectedHandCard: Card | null = null
  private selectedFieldCard: Card | null = null
  private handlers: InputHandler[] = []

  addHandler(handler: InputHandler): void {
    this.handlers.push(handler)
  }

  removeHandler(handler: InputHandler): void {
    const index = this.handlers.indexOf(handler)
    if (index > -1) {
      this.handlers.splice(index, 1)
    }
  }

  handleHandCardSelected(card: Card): void {
    this.selectedHandCard = card
    this.selectedFieldCard = null // Clear field selection when hand card changes

    this.handlers.forEach(handler => {
      handler.onHandCardSelected(card)
    })
  }

  handleFieldCardSelected(card: Card): void {
    this.selectedFieldCard = card

    this.handlers.forEach(handler => {
      handler.onFieldCardSelected(card)
    })
  }

  handlePlayCardAction(): void {
    if (!this.selectedHandCard) {
      return // Cannot play without selected hand card
    }

    this.handlers.forEach(handler => {
      handler.onPlayCardAction()
    })
  }

  handleKoikoiDecision(continueGame: boolean): void {
    this.handlers.forEach(handler => {
      handler.onKoikoiDecision(continueGame)
    })
  }

  handleNextRoundAction(): void {
    this.handlers.forEach(handler => {
      handler.onNextRoundAction()
    })
  }

  handleNewGameAction(): void {
    // Clear selections when starting new game
    this.clearSelections()

    this.handlers.forEach(handler => {
      handler.onNewGameAction()
    })
  }

  getSelectedHandCard(): Card | null {
    return this.selectedHandCard
  }

  getSelectedFieldCard(): Card | null {
    return this.selectedFieldCard
  }

  clearSelections(): void {
    this.selectedHandCard = null
    this.selectedFieldCard = null
  }

  canPlayCard(): boolean {
    return this.selectedHandCard !== null
  }

  canSelectFieldCard(): boolean {
    return this.selectedHandCard !== null
  }

  // Utility methods for validation
  isValidCardSelection(card: Card, availableCards: Card[]): boolean {
    return availableCards.some(availableCard => availableCard.id === card.id)
  }

  isValidFieldSelection(fieldCard: Card, handCard: Card): boolean {
    // Basic matching logic - can be extended with domain rules
    return fieldCard.suit === handCard.suit
  }
}