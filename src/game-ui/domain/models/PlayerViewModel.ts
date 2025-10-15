/**
 * Player View Model (Game UI BC)
 *
 * Represents a player's state in the UI layer.
 * This is a value object that holds immutable player data.
 *
 * Design:
 * - Immutable structure (readonly properties)
 * - Derived from integration events
 * - No business logic, pure data representation
 */
export interface PlayerViewModel {
  /** Player unique identifier */
  readonly id: string

  /** Player display name */
  readonly name: string

  /** Hand card IDs */
  readonly handCardIds: readonly string[]

  /** Captured card IDs */
  readonly capturedCardIds: readonly string[]

  /** Total score across all rounds */
  readonly totalScore: number

  /** Current round score */
  readonly roundScore: number

  /** Whether this is the current player's turn */
  readonly isCurrentPlayer: boolean

  /** Whether this player declared Koi-Koi */
  readonly hasKoikoi: boolean

  /** Whether this is a human player (vs AI) */
  readonly isHuman: boolean
}

/**
 * Factory function to create a PlayerViewModel from event data
 */
export function createPlayerViewModel(
  id: string,
  name: string,
  handCardIds: readonly string[],
  capturedCardIds: readonly string[],
  totalScore: number,
  roundScore: number,
  isCurrentPlayer: boolean,
  hasKoikoi: boolean,
  isHuman: boolean = true
): PlayerViewModel {
  return {
    id,
    name,
    handCardIds,
    capturedCardIds,
    totalScore,
    roundScore,
    isCurrentPlayer,
    hasKoikoi,
    isHuman,
  }
}

/**
 * Update player with new data (returns new instance)
 */
export function updatePlayerViewModel(
  player: PlayerViewModel,
  updates: Partial<Omit<PlayerViewModel, 'id' | 'name' | 'isHuman'>>
): PlayerViewModel {
  return {
    ...player,
    ...updates,
  }
}
