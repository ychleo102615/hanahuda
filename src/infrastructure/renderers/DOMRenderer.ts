import type { UIRenderer, RenderOptions, CardVisual, PlayerVisual, GameVisual } from '@/application/ports/presenters/UIRenderer'
import type { Card } from '@/domain/entities/Card'
import type { Player } from '@/domain/entities/Player'
import type { GameState } from '@/domain/entities/GameState'

export class DOMRenderer implements UIRenderer {
  private container: HTMLElement
  private renderOptions: RenderOptions | null = null
  private gameVisual: GameVisual | null = null
  private isAnimating = false
  private cardClickCallback: ((cardId: string) => void) | null = null
  private fieldCardClickCallback: ((cardId: string) => void) | null = null

  constructor(container: HTMLElement) {
    this.container = container
  }

  async initialize(container: HTMLElement, options: RenderOptions): Promise<void> {
    this.container = container
    this.renderOptions = options

    // Set up container styles
    this.container.style.position = 'relative'
    this.container.style.width = `${options.width}px`
    this.container.style.height = `${options.height}px`
    this.container.style.overflow = 'hidden'

    // Clear any existing content
    this.container.innerHTML = ''

    // Initialize game visual structure
    this.gameVisual = {
      fieldPosition: {
        x: options.width / 2 - 200,
        y: options.height / 2 - 100,
        width: 400,
        height: 200
      },
      deckPosition: {
        x: options.width - options.cardWidth - 20,
        y: 20
      },
      players: [],
      cards: []
    }
  }

  async render(gameState: GameState): Promise<void> {
    if (!this.renderOptions || !this.gameVisual) {
      throw new Error('Renderer not initialized')
    }

    // Update visual representation
    this.updateGameVisual(gameState)

    // Re-render all elements
    this.renderGameElements()
  }

  private updateGameVisual(gameState: GameState): void {
    if (!this.gameVisual || !this.renderOptions) return

    // Update cards visual information
    this.gameVisual.cards = []

    // Field cards
    gameState.field?.forEach((card, index) => {
      const cardVisual: CardVisual = {
        card,
        x: this.gameVisual!.fieldPosition.x + (index % 4) * (this.renderOptions!.cardWidth + 10),
        y: this.gameVisual!.fieldPosition.y + Math.floor(index / 4) * (this.renderOptions!.cardHeight + 10),
        width: this.renderOptions!.cardWidth,
        height: this.renderOptions!.cardHeight,
        rotation: 0,
        scale: 1,
        visible: true,
        interactive: true
      }
      this.gameVisual!.cards.push(cardVisual)
    })

    // Player cards
    gameState.players.forEach((player, playerIndex) => {
      const isBottomPlayer = playerIndex === 0
      const yPosition = isBottomPlayer
        ? this.renderOptions!.height - this.renderOptions!.cardHeight - 20
        : 20

      player.hand.forEach((card, cardIndex) => {
        const cardVisual: CardVisual = {
          card,
          x: 20 + cardIndex * (this.renderOptions!.cardWidth + 5),
          y: yPosition,
          width: this.renderOptions!.cardWidth,
          height: this.renderOptions!.cardHeight,
          rotation: 0,
          scale: 1,
          visible: true,
          interactive: isBottomPlayer // Only bottom player's cards are interactive
        }
        this.gameVisual!.cards.push(cardVisual)
      })
    })

    // Update player visual information
    this.gameVisual.players = gameState.players.map((player, index) => {
      const isBottomPlayer = index === 0
      return {
        player,
        handPosition: {
          x: 20,
          y: isBottomPlayer ? this.renderOptions!.height - this.renderOptions!.cardHeight - 20 : 20
        },
        capturedPosition: {
          x: 20,
          y: isBottomPlayer ? this.renderOptions!.height - 200 : 60
        },
        namePosition: {
          x: 20,
          y: isBottomPlayer ? this.renderOptions!.height - 240 : 40
        },
        scorePosition: {
          x: 120,
          y: isBottomPlayer ? this.renderOptions!.height - 240 : 40
        }
      }
    })
  }

  private renderGameElements(): void {
    if (!this.gameVisual || !this.renderOptions) return

    // Clear container
    this.container.innerHTML = ''

    // Render field area
    const fieldArea = document.createElement('div')
    fieldArea.style.position = 'absolute'
    fieldArea.style.left = `${this.gameVisual.fieldPosition.x}px`
    fieldArea.style.top = `${this.gameVisual.fieldPosition.y}px`
    fieldArea.style.width = `${this.gameVisual.fieldPosition.width}px`
    fieldArea.style.height = `${this.gameVisual.fieldPosition.height}px`
    fieldArea.style.border = '2px dashed #ccc'
    fieldArea.style.borderRadius = '8px'
    fieldArea.style.backgroundColor = 'rgba(0, 255, 0, 0.1)'
    this.container.appendChild(fieldArea)

    // Render cards
    this.gameVisual.cards.forEach(cardVisual => {
      const cardElement = this.createCardElement(cardVisual)
      this.container.appendChild(cardElement)
    })

    // Render player information
    this.gameVisual.players.forEach(playerVisual => {
      const playerInfo = this.createPlayerInfoElement(playerVisual)
      this.container.appendChild(playerInfo)
    })

    // Render deck
    const deckElement = this.createDeckElement()
    this.container.appendChild(deckElement)
  }

  private createCardElement(cardVisual: CardVisual): HTMLElement {
    const cardElement = document.createElement('div')
    cardElement.style.position = 'absolute'
    cardElement.style.left = `${cardVisual.x}px`
    cardElement.style.top = `${cardVisual.y}px`
    cardElement.style.width = `${cardVisual.width}px`
    cardElement.style.height = `${cardVisual.height}px`
    cardElement.style.backgroundColor = '#fff'
    cardElement.style.border = '1px solid #ccc'
    cardElement.style.borderRadius = '4px'
    cardElement.style.display = 'flex'
    cardElement.style.alignItems = 'center'
    cardElement.style.justifyContent = 'center'
    cardElement.style.fontSize = '10px'
    cardElement.style.textAlign = 'center'
    cardElement.style.cursor = cardVisual.interactive ? 'pointer' : 'default'
    cardElement.style.transform = `rotate(${cardVisual.rotation}deg) scale(${cardVisual.scale})`
    cardElement.style.visibility = cardVisual.visible ? 'visible' : 'hidden'
    cardElement.textContent = cardVisual.card.name
    cardElement.dataset.cardId = cardVisual.card.id

    if (cardVisual.interactive) {
      cardElement.addEventListener('click', () => {
        if (this.cardClickCallback) {
          this.cardClickCallback(cardVisual.card.id)
        }
      })
    }

    return cardElement
  }

  private createPlayerInfoElement(playerVisual: PlayerVisual): HTMLElement {
    const playerInfo = document.createElement('div')
    playerInfo.style.position = 'absolute'
    playerInfo.style.left = `${playerVisual.namePosition.x}px`
    playerInfo.style.top = `${playerVisual.namePosition.y}px`
    playerInfo.style.color = '#333'
    playerInfo.style.fontSize = '14px'
    playerInfo.style.fontWeight = 'bold'
    playerInfo.textContent = `${playerVisual.player.name} (Score: ${playerVisual.player.score})`

    return playerInfo
  }

  private createDeckElement(): HTMLElement {
    const deckElement = document.createElement('div')
    deckElement.style.position = 'absolute'
    deckElement.style.left = `${this.gameVisual!.deckPosition.x}px`
    deckElement.style.top = `${this.gameVisual!.deckPosition.y}px`
    deckElement.style.width = `${this.renderOptions!.cardWidth}px`
    deckElement.style.height = `${this.renderOptions!.cardHeight}px`
    deckElement.style.backgroundColor = '#654321'
    deckElement.style.border = '1px solid #333'
    deckElement.style.borderRadius = '4px'
    deckElement.style.display = 'flex'
    deckElement.style.alignItems = 'center'
    deckElement.style.justifyContent = 'center'
    deckElement.style.color = '#fff'
    deckElement.style.fontSize = '12px'
    deckElement.textContent = 'DECK'

    return deckElement
  }

  async animateCardMove(
    card: Card,
    fromPosition: { x: number; y: number },
    toPosition: { x: number; y: number },
    duration: number
  ): Promise<void> {
    this.isAnimating = true

    return new Promise((resolve) => {
      const cardElement = this.container.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement
      if (!cardElement) {
        this.isAnimating = false
        resolve()
        return
      }

      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        const currentX = fromPosition.x + (toPosition.x - fromPosition.x) * progress
        const currentY = fromPosition.y + (toPosition.y - fromPosition.y) * progress

        cardElement.style.left = `${currentX}px`
        cardElement.style.top = `${currentY}px`

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          this.isAnimating = false
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  highlightCards(cardIds: string[]): void {
    cardIds.forEach(cardId => {
      const cardElement = this.container.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement
      if (cardElement) {
        cardElement.style.boxShadow = '0 0 10px #FFD700'
        cardElement.style.borderColor = '#FFD700'
      }
    })
  }

  showCardSelection(cards: Card[], callback: (selectedCard: Card) => void): void {
    // Implementation would show a card selection overlay
    // For now, just call with first card as placeholder
    if (cards.length > 0) {
      callback(cards[0])
    }
  }

  async showYakuDisplay(yakuResults: unknown[]): Promise<void> {
    // Implementation would show yaku results in overlay
    console.log('Showing Yaku results:', yakuResults)
  }

  showKoikoiDialog(callback: (declared: boolean) => void): void {
    // Implementation would show koi-koi decision dialog
    const result = confirm('Declare Koi-Koi?')
    callback(result)
  }

  updatePlayerInfo(player: Player): void {
    // Find and update player info element
    const playerElements = this.container.querySelectorAll('[data-player-id]')
    playerElements.forEach(element => {
      if (element.getAttribute('data-player-id') === player.id) {
        element.textContent = `${player.name} (Score: ${player.score})`
      }
    })
  }

  updateFieldCards(cards: Card[]): void {
    // Remove existing field cards and re-render
    const fieldCards = this.container.querySelectorAll('[data-card-type="field"]')
    fieldCards.forEach(card => card.remove())

    // Re-render field cards
    if (this.gameVisual && this.renderOptions) {
      cards.forEach((card, index) => {
        const cardVisual: CardVisual = {
          card,
          x: this.gameVisual!.fieldPosition.x + (index % 4) * (this.renderOptions!.cardWidth + 10),
          y: this.gameVisual!.fieldPosition.y + Math.floor(index / 4) * (this.renderOptions!.cardHeight + 10),
          width: this.renderOptions!.cardWidth,
          height: this.renderOptions!.cardHeight,
          rotation: 0,
          scale: 1,
          visible: true,
          interactive: true
        }
        const cardElement = this.createCardElement(cardVisual)
        cardElement.dataset.cardType = 'field'
        this.container.appendChild(cardElement)
      })
    }
  }

  updateHandCards(playerId: string, cards: Card[]): void {
    // Implementation would update specific player's hand cards
    console.log(`Updating hand cards for player ${playerId}:`, cards)
  }

  setCardInteractive(cardId: string, interactive: boolean): void {
    const cardElement = this.container.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement
    if (cardElement) {
      cardElement.style.cursor = interactive ? 'pointer' : 'default'
      cardElement.style.opacity = interactive ? '1' : '0.6'
    }
  }

  onCardClick(callback: (cardId: string) => void): void {
    this.cardClickCallback = callback
  }

  onFieldCardClick(callback: (cardId: string) => void): void {
    this.fieldCardClickCallback = callback
  }

  resize(width: number, height: number): void {
    if (this.renderOptions) {
      this.renderOptions.width = width
      this.renderOptions.height = height
      this.container.style.width = `${width}px`
      this.container.style.height = `${height}px`
    }
  }

  destroy(): void {
    this.container.innerHTML = ''
    this.gameVisual = null
    this.renderOptions = null
    this.cardClickCallback = null
    this.fieldCardClickCallback = null
  }

  getCardPosition(cardId: string): { x: number; y: number } | null {
    const cardElement = this.container.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement
    if (cardElement) {
      return {
        x: parseInt(cardElement.style.left),
        y: parseInt(cardElement.style.top)
      }
    }
    return null
  }

  isAnimating(): boolean {
    return this.isAnimating
  }
}