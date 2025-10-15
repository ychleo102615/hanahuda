/**
 * Integration Event Base Interface
 *
 * All integration events between game-engine and game-ui Bounded Contexts
 * must extend this interface. This ensures consistent event structure and
 * enables features like event sequencing and loss detection.
 *
 * Design principles:
 * - Protocol Buffers compatible (uses primitive types and numbers for timestamps)
 * - Event types use past tense naming (CardPlayed, GameInitialized)
 * - Sequence numbers enable ordering and loss detection
 * - Immutable readonly properties
 */
export interface IntegrationEvent {
  /**
   * Event unique identifier (UUID)
   * Used for event deduplication and correlation
   */
  readonly eventId: string

  /**
   * Event type identifier (past tense naming)
   * Examples: 'GameInitialized', 'CardPlayed', 'RoundEnded'
   */
  readonly eventType: string

  /**
   * Event occurrence timestamp (Unix timestamp in milliseconds)
   * Using number instead of Date for Protocol Buffers compatibility
   */
  readonly timestamp: number

  /**
   * Event sequence number for ordering and loss detection
   * game-ui can detect missing events by checking for gaps in sequence
   */
  readonly sequenceNumber: number
}

/**
 * Type guard to check if an object is an IntegrationEvent
 */
export function isIntegrationEvent(obj: unknown): obj is IntegrationEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).eventId === 'string' &&
    typeof (obj as any).eventType === 'string' &&
    typeof (obj as any).timestamp === 'number' &&
    typeof (obj as any).sequenceNumber === 'number'
  )
}
