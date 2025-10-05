import type { Card } from '@/features/game-engine/domain/entities/Card'
import { Player } from '@/features/game-engine/domain/entities/Player'
import type { GameState } from '@/features/game-engine/domain/entities/GameState'
import type { YakuResult } from '@/features/game-engine/domain/entities/Yaku'

export interface PlayCardRequest {
  playerId: string
  cardId: string
  selectedFieldCard?: string
}

export interface PlayCardResult {
  success: boolean
  playedCard?: Card
  capturedCards: Card[]
  nextPhase: 'playing' | 'koikoi' | 'round_end'
  yakuResults: YakuResult[]
  error?: string
}

export interface GameRepository {
  createGame(): Promise<string>
  
  joinGame(gameId: string, player: Player): Promise<boolean>
  
  startGame(gameId: string): Promise<GameState>
  
  getGameState(gameId: string): Promise<GameState | null>
  
  playCard(gameId: string, request: PlayCardRequest): Promise<PlayCardResult>
  
  declareKoikoi(gameId: string, playerId: string): Promise<boolean>
  
  endRound(gameId: string): Promise<GameState>
  
  shuffleDeck(): Promise<Card[]>
  
  dealCards(gameId: string): Promise<GameState>
  
  calculateScore(capturedCards: readonly Card[]): Promise<{
    yakuResults: YakuResult[]
    totalScore: number
  }>
  
  saveGame(gameId: string, gameState: GameState): Promise<boolean>
  
  loadGame(gameId: string): Promise<GameState | null>
  
  deleteGame(gameId: string): Promise<boolean>

  clearAllGames(): Promise<boolean>
}