import type { Card } from '@/features/game-engine/domain/entities/Card'

export interface IPlayer {
  readonly id: string
  readonly name: string
  readonly isHuman: boolean
  readonly hand: readonly Card[]
  readonly captured: readonly Card[]
  readonly score: number
  readonly roundScore: number
  readonly handCount: number
  readonly capturedCount: number
}