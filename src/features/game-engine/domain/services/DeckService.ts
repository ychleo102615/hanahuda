import type { Card, CardType } from '../entities/Card'
import { CardEntity } from '../entities/Card'
import { HANAFUDA_CARDS, GAME_SETTINGS } from '@/shared/constants/gameConstants'
import type { GameState } from '../entities/GameState'

export class DeckService {
  /**
   * 創建洗好的花牌牌組
   */
  createShuffledDeck(): Card[] {
    const cards: Card[] = []

    // 創建所有花牌
    Object.values(HANAFUDA_CARDS).forEach((monthData) => {
      monthData.CARDS.forEach((cardData, index) => {
        const card = new CardEntity(
          cardData.suit,
          cardData.type as CardType,
          cardData.points,
          cardData.name,
          index,
        )
        cards.push(card)
      })
    })

    // Fisher-Yates 洗牌算法
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[cards[i], cards[j]] = [cards[j], cards[i]]
    }

    return cards
  }

  /**
   * 發牌到遊戲狀態（玩家手牌和場地）
   * @param gameState 遊戲狀態
   */
  dealCards(gameState: GameState): void {
    const deck = gameState.deck
    if (deck.length < this.calculateRequiredCards(gameState.players.length)) {
      throw new Error('Not enough cards in deck to deal')
    }

    const workingDeck = [...deck]
    const fieldCards: Card[] = []

    // 發牌到場地
    for (let i = 0; i < GAME_SETTINGS.CARDS_ON_FIELD; i++) {
      const card = workingDeck.pop()
      if (card) fieldCards.push(card)
    }

    // 透過 GameState 發手牌（保護聚合邊界）
    gameState.players.forEach((player) => {
      const hand: Card[] = []
      for (let i = 0; i < GAME_SETTINGS.CARDS_PER_PLAYER; i++) {
        const card = workingDeck.pop()
        if (card) hand.push(card)
      }
      gameState.dealHandToPlayer(player.id, hand)
    })

    // 更新遊戲狀態
    gameState.setDeck(workingDeck)
    gameState.setField(fieldCards)
  }

  /**
   * 計算發牌所需的總牌數
   */
  private calculateRequiredCards(playerCount: number): number {
    return GAME_SETTINGS.CARDS_ON_FIELD + (playerCount * GAME_SETTINGS.CARDS_PER_PLAYER)
  }
}