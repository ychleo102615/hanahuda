import type { Card } from '@/domain/entities/Card'
import type { IPlayer } from '@/application/ports/repositories/PlayerInterface'
import type { YakuResult } from '@/domain/entities/Yaku'

export interface PlayCardInputDTO {
  playerId: string
  cardId: string
  selectedFieldCards?: string[]
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