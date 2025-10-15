import type { IEventPublisher } from '@/shared/events/ports/IEventPublisher'

/**
 * Game Engine Event Publisher Port
 *
 * This port interface defines what the game-engine BC needs from
 * the infrastructure layer to publish integration events.
 *
 * It re-exports the shared IEventPublisher interface to maintain
 * clean dependency boundaries while allowing the game-engine BC
 * to depend on the shared contract.
 *
 * The actual implementation will be provided by the infrastructure
 * layer (EventBusAdapter) and injected via dependency injection.
 */
export type { IEventPublisher }

/**
 * Re-export for convenience
 * This allows game-engine use cases to import from their own ports
 * rather than directly from shared, maintaining BC boundaries.
 */
export type IEngineEventPublisher = IEventPublisher
