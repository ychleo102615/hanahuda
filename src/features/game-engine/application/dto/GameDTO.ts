import type { Card } from '@/features/game-engine/domain/entities/Card'
import type { IPlayer } from '@/features/game-engine/application/ports/repositories/PlayerInterface'
import type { YakuResult } from '@/features/game-engine/domain/entities/Yaku'

/**
 * 出牌請求 DTO
 */
export interface PlayCardInputDTO {
  playerId: string
  cardId: string
  selectedFieldCard?: string
}

/**
 * PlayCardUseCase 內部使用的請求格式（與 InputDTO 相同）
 */
export interface PlayCardRequest {
  playerId: string
  cardId: string
  selectedFieldCard?: string
}

/**
 * PlayCardUseCase 內部使用的結果格式
 */
export interface PlayCardResult {
  success: boolean
  playedCard?: Card
  capturedCards: Card[]
  nextPhase: 'playing' | 'koikoi' | 'round_end'
  yakuResults: YakuResult[]
  error?: string
}

export interface PlayCardOutputDTO {
  success: boolean
  playedCard?: Card
  capturedCards: Card[]
  nextPhase: string
  yakuResults: YakuResult[]
  error?: string
}

export interface StartGameInputDTO {
  player1Name: string
  player2Name: string
}

export interface StartGameOutputDTO {
  gameId: string
  success: boolean
  error?: string
}

export interface GameStateOutputDTO {
  gameId: string
  players: IPlayer[]
  currentPlayer: IPlayer | null
  fieldCards: Card[]
  deckCount: number
  round: number
  phase: string
  isGameOver: boolean
  lastMove?: {
    playerId: string
    cardPlayed: Card
    cardsMatched: Card[]
  }
  roundResult?: {
    winner: IPlayer | null
    score: number
    yakuResults: YakuResult[]
    koikoiDeclared: boolean
  }
  koikoiPlayer?: string
}

export interface KoikoiDecisionInputDTO {
  playerId: string
  declareKoikoi: boolean
}

export interface KoikoiDecisionOutputDTO {
  success: boolean
  nextPhase: string
  error?: string
}

export interface CalculateScoreInputDTO {
  player1Cards: Card[]
  player2Cards: Card[]
  koikoiPlayer?: string
}

export interface CalculateScoreOutputDTO {
  winner: 'player1' | 'player2' | null
  player1Score: number
  player2Score: number
  player1Yaku: YakuResult[]
  player2Yaku: YakuResult[]
}

export interface SetUpGameResult {
  success: boolean
  gameId: string
  gameState?: GameStateOutputDTO
  error?: string
}