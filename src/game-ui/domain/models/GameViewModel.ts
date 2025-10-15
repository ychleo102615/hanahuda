import type { PlayerViewModel } from './PlayerViewModel'
import type { YakuResult } from '@/shared/events/base/YakuResult'

/**
 * Card Definition (UI-specific)
 *
 * Represents card metadata for UI rendering.
 * Derived from GameInitializedEvent.
 */
export interface CardDefinition {
  readonly id: string
  readonly suit: number
  readonly type: 'bright' | 'animal' | 'ribbon' | 'plain'
  readonly points: number
}

/**
 * Game Phase (UI-specific type)
 */
export type GamePhase = 'setup' | 'dealing' | 'playing' | 'koikoi' | 'round_end' | 'game_end'

/**
 * Pending Action (for multi-match selection)
 */
export interface PendingMatchSelection {
  readonly playerId: string
  readonly sourceCardId: string
  readonly sourceType: 'hand' | 'deck'
  readonly selectableFieldCardIds: readonly string[]
  readonly timeoutMs: number
  readonly startedAt: number
}

/**
 * Game View Model (Game UI BC)
 *
 * The central view model that maintains the UI state snapshot.
 * This model is built incrementally from integration events.
 *
 * Design principles:
 * - Immutable structure (returns new instances on updates)
 * - Event-sourced (built from GameInitializedEvent and incremental events)
 * - No dependency on game-engine BC
 * - Optimized for UI rendering
 */
export class GameViewModel {
  constructor(
    public readonly gameId: string,
    public readonly currentRound: number,
    public readonly phase: GamePhase,
    public readonly currentPlayerId: string,
    public readonly players: readonly PlayerViewModel[],
    public readonly fieldCardIds: readonly string[],
    public readonly deckCardCount: number,
    public readonly koikoiPlayerId: string | null,
    public readonly cardDefinitions: readonly CardDefinition[],
    public readonly lastEventSequence: number,
    public readonly pendingMatchSelection: PendingMatchSelection | null = null,
    public readonly recentYakuResults: readonly YakuResult[] = []
  ) {}

  /**
   * Get current player view model
   */
  get currentPlayer(): PlayerViewModel | undefined {
    return this.players.find((p) => p.id === this.currentPlayerId)
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): PlayerViewModel | undefined {
    return this.players.find((p) => p.id === playerId)
  }

  /**
   * Get card definition by ID
   */
  getCardDefinition(cardId: string): CardDefinition | undefined {
    return this.cardDefinitions.find((c) => c.id === cardId)
  }

  /**
   * Check if a match selection is pending
   */
  get hasSelectionPending(): boolean {
    return this.pendingMatchSelection !== null
  }

  /**
   * Check if game is over
   */
  get isGameOver(): boolean {
    return this.phase === 'game_end'
  }

  /**
   * Check if round is over
   */
  get isRoundOver(): boolean {
    return this.phase === 'round_end'
  }

  /**
   * Check if waiting for Koi-Koi decision
   */
  get isWaitingForKoikoi(): boolean {
    return this.phase === 'koikoi'
  }

  /**
   * Update with new player data (immutable)
   */
  withPlayers(players: readonly PlayerViewModel[]): GameViewModel {
    return new GameViewModel(
      this.gameId,
      this.currentRound,
      this.phase,
      this.currentPlayerId,
      players,
      this.fieldCardIds,
      this.deckCardCount,
      this.koikoiPlayerId,
      this.cardDefinitions,
      this.lastEventSequence,
      this.pendingMatchSelection,
      this.recentYakuResults
    )
  }

  /**
   * Update current player (immutable)
   */
  withCurrentPlayer(currentPlayerId: string): GameViewModel {
    return new GameViewModel(
      this.gameId,
      this.currentRound,
      this.phase,
      currentPlayerId,
      this.players,
      this.fieldCardIds,
      this.deckCardCount,
      this.koikoiPlayerId,
      this.cardDefinitions,
      this.lastEventSequence,
      this.pendingMatchSelection,
      this.recentYakuResults
    )
  }

  /**
   * Update field cards (immutable)
   */
  withFieldCards(fieldCardIds: readonly string[]): GameViewModel {
    return new GameViewModel(
      this.gameId,
      this.currentRound,
      this.phase,
      this.currentPlayerId,
      this.players,
      fieldCardIds,
      this.deckCardCount,
      this.koikoiPlayerId,
      this.cardDefinitions,
      this.lastEventSequence,
      this.pendingMatchSelection,
      this.recentYakuResults
    )
  }

  /**
   * Update phase (immutable)
   */
  withPhase(phase: GamePhase): GameViewModel {
    return new GameViewModel(
      this.gameId,
      this.currentRound,
      phase,
      this.currentPlayerId,
      this.players,
      this.fieldCardIds,
      this.deckCardCount,
      this.koikoiPlayerId,
      this.cardDefinitions,
      this.lastEventSequence,
      this.pendingMatchSelection,
      this.recentYakuResults
    )
  }

  /**
   * Update deck count (immutable)
   */
  withDeckCount(deckCardCount: number): GameViewModel {
    return new GameViewModel(
      this.gameId,
      this.currentRound,
      this.phase,
      this.currentPlayerId,
      this.players,
      this.fieldCardIds,
      deckCardCount,
      this.koikoiPlayerId,
      this.cardDefinitions,
      this.lastEventSequence,
      this.pendingMatchSelection,
      this.recentYakuResults
    )
  }

  /**
   * Update Koi-Koi player (immutable)
   */
  withKoikoiPlayer(koikoiPlayerId: string | null): GameViewModel {
    return new GameViewModel(
      this.gameId,
      this.currentRound,
      this.phase,
      this.currentPlayerId,
      this.players,
      this.fieldCardIds,
      this.deckCardCount,
      koikoiPlayerId,
      this.cardDefinitions,
      this.lastEventSequence,
      this.pendingMatchSelection,
      this.recentYakuResults
    )
  }

  /**
   * Update event sequence (immutable)
   */
  withEventSequence(sequenceNumber: number): GameViewModel {
    return new GameViewModel(
      this.gameId,
      this.currentRound,
      this.phase,
      this.currentPlayerId,
      this.players,
      this.fieldCardIds,
      this.deckCardCount,
      this.koikoiPlayerId,
      this.cardDefinitions,
      sequenceNumber,
      this.pendingMatchSelection,
      this.recentYakuResults
    )
  }

  /**
   * Update pending match selection (immutable)
   */
  withPendingMatchSelection(selection: PendingMatchSelection | null): GameViewModel {
    return new GameViewModel(
      this.gameId,
      this.currentRound,
      this.phase,
      this.currentPlayerId,
      this.players,
      this.fieldCardIds,
      this.deckCardCount,
      this.koikoiPlayerId,
      this.cardDefinitions,
      this.lastEventSequence,
      selection,
      this.recentYakuResults
    )
  }

  /**
   * Update recent yaku results (immutable)
   */
  withYakuResults(yakuResults: readonly YakuResult[]): GameViewModel {
    return new GameViewModel(
      this.gameId,
      this.currentRound,
      this.phase,
      this.currentPlayerId,
      this.players,
      this.fieldCardIds,
      this.deckCardCount,
      this.koikoiPlayerId,
      this.cardDefinitions,
      this.lastEventSequence,
      this.pendingMatchSelection,
      yakuResults
    )
  }

  /**
   * Update round number (immutable)
   */
  withRound(round: number): GameViewModel {
    return new GameViewModel(
      this.gameId,
      round,
      this.phase,
      this.currentPlayerId,
      this.players,
      this.fieldCardIds,
      this.deckCardCount,
      this.koikoiPlayerId,
      this.cardDefinitions,
      this.lastEventSequence,
      this.pendingMatchSelection,
      this.recentYakuResults
    )
  }

  /**
   * Clone with all properties (for complex updates)
   */
  clone(updates?: Partial<Omit<GameViewModel, 'currentPlayer' | 'getPlayer' | 'getCardDefinition' | 'hasSelectionPending' | 'isGameOver' | 'isRoundOver' | 'isWaitingForKoikoi'>>): GameViewModel {
    return new GameViewModel(
      updates?.gameId ?? this.gameId,
      updates?.currentRound ?? this.currentRound,
      updates?.phase ?? this.phase,
      updates?.currentPlayerId ?? this.currentPlayerId,
      updates?.players ?? this.players,
      updates?.fieldCardIds ?? this.fieldCardIds,
      updates?.deckCardCount ?? this.deckCardCount,
      updates?.koikoiPlayerId ?? this.koikoiPlayerId,
      updates?.cardDefinitions ?? this.cardDefinitions,
      updates?.lastEventSequence ?? this.lastEventSequence,
      updates?.pendingMatchSelection ?? this.pendingMatchSelection,
      updates?.recentYakuResults ?? this.recentYakuResults
    )
  }
}
