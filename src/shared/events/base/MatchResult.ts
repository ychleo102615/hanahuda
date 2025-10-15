import type { YakuResult } from './YakuResult'

/**
 * Match Result Structure
 *
 * Represents the result of a card matching attempt.
 * Covers three scenarios:
 * 1. no_match: Card goes to field
 * 2. single_match: Automatic capture
 * 3. multiple_matches: Player must choose
 *
 * Protocol Buffers compatible - uses primitive types and optional fields.
 */
export interface MatchResult {
  /** Source card ID (from hand or deck) */
  readonly sourceCardId: string

  /** Source type */
  readonly sourceType: 'hand' | 'deck'

  /** Match type determines the flow */
  readonly matchType: 'no_match' | 'single_match' | 'multiple_matches'

  /**
   * Matched field card ID (for single_match)
   * undefined for no_match and multiple_matches
   */
  readonly matchedFieldCardId?: string

  /**
   * Captured card IDs (including source card)
   * Empty array for no_match
   */
  readonly capturedCardIds: readonly string[]

  /**
   * Selectable field card IDs (for multiple_matches)
   * undefined for other match types
   */
  readonly selectableFieldCardIds?: readonly string[]

  /**
   * Selected field card ID (after player choice)
   * Set when multiple_matches is resolved
   */
  readonly selectedFieldCardId?: string

  /**
   * Whether selection was automatic (timeout)
   * Only relevant for multiple_matches
   */
  readonly autoSelected?: boolean

  /**
   * Selection timeout in milliseconds (for multiple_matches)
   * Default is 10000ms (10 seconds)
   */
  readonly selectionTimeout?: number

  /**
   * Yaku achieved as result of this match
   * Can be empty array if no yaku achieved
   */
  readonly achievedYaku: readonly YakuResult[]
}

/**
 * Type guard to check if an object is a MatchResult
 */
export function isMatchResult(obj: unknown): obj is MatchResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).sourceCardId === 'string' &&
    ['hand', 'deck'].includes((obj as any).sourceType) &&
    ['no_match', 'single_match', 'multiple_matches'].includes((obj as any).matchType) &&
    Array.isArray((obj as any).capturedCardIds) &&
    Array.isArray((obj as any).achievedYaku)
  )
}
