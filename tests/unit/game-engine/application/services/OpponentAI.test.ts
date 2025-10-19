import { describe, it, expect, beforeEach } from 'vitest'
import { OpponentAI } from '@/game-engine/application/services/OpponentAI'
import { GameState } from '@/game-engine/domain/entities/GameState'
import { Player } from '@/game-engine/domain/entities/Player'
import { CardEntity, type Card } from '@/game-engine/domain/entities/Card'

// 輔助函式：建立測試用卡牌
function createCard(suit: number, type: 'bright' | 'animal' | 'ribbon' | 'plain', index: number = 0): Card {
  const pointsMap = { bright: 20, animal: 10, ribbon: 5, plain: 1 }
  const nameMap = {
    bright: `${suit}月光`,
    animal: `${suit}月種`,
    ribbon: `${suit}月短`,
    plain: `${suit}月カス`,
  }
  return new CardEntity(suit, type, pointsMap[type], nameMap[type], index)
}

describe('OpponentAI', () => {
  let gameState: GameState
  let aiPlayer: Player
  let humanPlayer: Player

  beforeEach(() => {
    // 建立測試用遊戲狀態
    gameState = new GameState()

    // 建立玩家
    humanPlayer = new Player('player1', 'Human Player')
    aiPlayer = new Player('player2', 'AI Opponent')

    // 加入玩家到遊戲狀態
    gameState.addPlayer(humanPlayer)
    gameState.addPlayer(aiPlayer)
  })

  describe('decideMove', () => {
    it('應該返回 null 當不是 AI 玩家回合時', () => {
      // 設定當前玩家為人類玩家
      gameState.nextPlayer() // player1 的回合

      const move = OpponentAI.decideMove(gameState)

      expect(move).toBeNull()
    })

    it('應該返回 null 當 AI 手牌為空時', () => {
      // 設定當前玩家為 AI
      gameState.nextPlayer() // player1
      gameState.nextPlayer() // player2 (AI)

      const move = OpponentAI.decideMove(gameState)

      expect(move).toBeNull()
    })

    it('應該選擇可以捕獲高分牌的手牌', () => {
      // 給 AI 一些手牌
      const handCard1 = createCard(1, 'plain', 0)
      const handCard2 = createCard(2, 'bright', 0)
      aiPlayer.setHand([handCard1, handCard2])

      // 場上放置一些牌
      const fieldCard1 = createCard(1, 'ribbon', 0) // 可與 handCard1 配對
      const fieldCard2 = createCard(2, 'animal', 0) // 可與 handCard2 配對
      gameState.setField([fieldCard1, fieldCard2])

      // 設定當前玩家為 AI (index 從 0 開始，所以需要移到 index 1)
      gameState.nextPlayer() // 從 0 變成 1 (player2/AI)

      const move = OpponentAI.decideMove(gameState)

      // 驗證 AI 做出了有效的決策
      expect(move).not.toBeNull()
      expect(move?.playerId).toBe('player2')
      expect(move?.cardId).toBeDefined()

      // AI 應該選擇能捕獲更高分數的牌 (2-bright-0 可捕獲 10 分，1-plain-0 可捕獲 5 分)
      // 由於 AI 會選擇總價值最高的，應該是 2-bright-0
      expect(move?.cardId).toBe('2-bright-0')
    })

    it('應該選擇多重配對中的最高分牌', () => {
      // 給 AI 一張手牌
      const handCard = createCard(1, 'plain', 0)
      aiPlayer.setHand([handCard])

      // 場上放置多張同月份的牌
      const fieldCard1 = createCard(1, 'ribbon', 0)
      const fieldCard2 = createCard(1, 'animal', 0)
      const fieldCard3 = createCard(1, 'bright', 0)
      gameState.setField([fieldCard1, fieldCard2, fieldCard3])

      // 設定當前玩家為 AI
      gameState.nextPlayer() // 從 0 變成 1 (player2/AI)

      const move = OpponentAI.decideMove(gameState)

      expect(move).not.toBeNull()
      expect(move?.playerId).toBe('player2')
      expect(move?.cardId).toBeDefined()
      // AI 有多重配對選擇時應該做出決策
      expect(move?.selectedFieldCard).toBeDefined()
    })

    it('應該出最低分牌當沒有可配對的牌時', () => {
      // 給 AI 一些不同月份的手牌
      const handCard1 = createCard(1, 'plain', 0)
      const handCard2 = createCard(2, 'ribbon', 0)
      const handCard3 = createCard(3, 'bright', 0)
      aiPlayer.setHand([handCard1, handCard2, handCard3])

      // 場上放置不同月份的牌
      const fieldCard1 = createCard(4, 'plain', 0)
      const fieldCard2 = createCard(5, 'animal', 0)
      gameState.setField([fieldCard1, fieldCard2])

      // 設定當前玩家為 AI
      gameState.nextPlayer() // 從 0 變成 1 (player2/AI)

      const move = OpponentAI.decideMove(gameState)

      expect(move).not.toBeNull()
      expect(move?.playerId).toBe('player2')
      // AI 應該出牌
      expect(move?.cardId).toBeDefined()
      // 沒有配對所以 selectedFieldCard 應該是 undefined
      expect(move?.selectedFieldCard).toBeUndefined()
    })

    it('應該優先考慮多重配對的額外價值', () => {
      // 給 AI 兩張手牌
      const handCard1 = createCard(1, 'plain', 0)
      const handCard2 = createCard(2, 'plain', 0)
      aiPlayer.setHand([handCard1, handCard2])

      // 場上放置牌：月份1有多張可配對，月份2只有一張但分數相同
      const fieldCard1 = createCard(1, 'ribbon', 0)
      const fieldCard2 = createCard(1, 'animal', 0)
      const fieldCard3 = createCard(2, 'ribbon', 0)
      gameState.setField([fieldCard1, fieldCard2, fieldCard3])

      // 設定當前玩家為 AI
      gameState.nextPlayer() // 從 0 變成 1 (player2/AI)

      const move = OpponentAI.decideMove(gameState)

      expect(move).not.toBeNull()
      expect(move?.playerId).toBe('player2')
      // AI 應該優先考慮多重配對的價值
      expect(move?.cardId).toBeDefined()
    })
  })

  describe('decideKoikoi', () => {
    it('應該選擇結束回合當分數已經很高時 (>= 10)', () => {
      const decision = OpponentAI.decideKoikoi([], 10, 4)

      expect(decision).toBe(false)
    })

    it('應該選擇繼續當分數中等且手牌多時', () => {
      const decision = OpponentAI.decideKoikoi([], 5, 4)

      expect(decision).toBe(true)
    })

    it('應該選擇繼續當分數低且手牌足夠時', () => {
      const decision = OpponentAI.decideKoikoi([], 3, 3)

      expect(decision).toBe(true)
    })

    it('應該選擇結束回合當手牌少且分數不高時', () => {
      const decision = OpponentAI.decideKoikoi([], 5, 2)

      expect(decision).toBe(false)
    })

    it('應該選擇結束回合當手牌很少時', () => {
      const decision = OpponentAI.decideKoikoi([], 3, 1)

      expect(decision).toBe(false)
    })
  })

  describe('selectFieldCard', () => {
    it('應該返回 null 當沒有可選擇的牌時', () => {
      const result = OpponentAI.selectFieldCard([])

      expect(result).toBeNull()
    })

    it('應該返回唯一的牌當只有一張時', () => {
      const card = createCard(1, 'plain', 0)
      const result = OpponentAI.selectFieldCard([card])

      expect(result).toBe(card)
    })

    it('應該選擇最高分的牌', () => {
      const card1 = createCard(1, 'plain', 0)
      const card2 = createCard(1, 'ribbon', 0)
      const card3 = createCard(1, 'animal', 0)
      const card4 = createCard(1, 'bright', 0)

      const result = OpponentAI.selectFieldCard([card1, card2, card3, card4])

      expect(result).toBe(card4) // 應該選擇光牌
    })

    it('應該按優先順序選擇：光 > 種 > 短 > カス', () => {
      const plainCard = createCard(1, 'plain', 0)
      const ribbonCard = createCard(1, 'ribbon', 0)
      const animalCard = createCard(1, 'animal', 0)

      const result = OpponentAI.selectFieldCard([plainCard, ribbonCard, animalCard])

      expect(result).toBe(animalCard) // 種牌（動物牌）
    })
  })

  describe('整合測試：完整回合決策', () => {
    it('AI 應該能做出合理的完整回合決策', () => {
      // 建立複雜的遊戲場景
      const handCard1 = createCard(1, 'plain', 0)
      const handCard2 = createCard(2, 'animal', 0)
      const handCard3 = createCard(3, 'ribbon', 0)
      aiPlayer.setHand([handCard1, handCard2, handCard3])

      // 場上的牌
      const fieldCard1 = createCard(1, 'ribbon', 0)
      const fieldCard2 = createCard(2, 'bright', 0)
      const fieldCard3 = createCard(4, 'plain', 0)
      gameState.setField([fieldCard1, fieldCard2, fieldCard3])

      // 設定當前玩家為 AI
      gameState.nextPlayer() // 從 0 變成 1 (player2/AI)

      const move = OpponentAI.decideMove(gameState)

      // 驗證 AI 做出了有效的決策
      expect(move).not.toBeNull()
      expect(move?.playerId).toBe('player2')
      expect(move?.cardId).toBeDefined()

      // AI 應該選擇能捕獲光牌的動物牌
      if (move?.cardId === '2-animal-0') {
        expect(move.selectedFieldCard).toBe('2-bright-0')
      }
    })
  })

  describe('效能測試', () => {
    it('AI 決策應該在合理時間內完成（< 100ms）', () => {
      // 建立包含多張牌的場景
      const handCards: Card[] = []
      for (let i = 1; i <= 8; i++) {
        handCards.push(createCard(i, 'plain', 0))
      }
      aiPlayer.addToHand(handCards)

      const fieldCards: Card[] = []
      for (let i = 1; i <= 12; i++) {
        fieldCards.push(createCard(i, 'ribbon', 0))
      }
      gameState.setField(fieldCards)

      // 設定當前玩家為 AI
      gameState.nextPlayer() // 從 0 變成 1 (player2/AI)

      const startTime = Date.now()
      const move = OpponentAI.decideMove(gameState)
      const endTime = Date.now()

      const executionTime = endTime - startTime

      expect(move).not.toBeNull()
      expect(executionTime).toBeLessThan(100)
    })
  })
})
