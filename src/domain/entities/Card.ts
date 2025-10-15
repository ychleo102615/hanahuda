/**
 * @deprecated This file is deprecated. Import from @/game-engine/domain/entities/Card instead.
 * This re-export exists only for backward compatibility during migration.
 */

export type { Card, CardType } from '@/game-engine/domain/entities/Card'
export { CardEntity } from '@/game-engine/domain/entities/Card'

// Preserve CARD_TYPES for backward compatibility
export { CARD_TYPES } from '@/shared/constants/gameConstants'
