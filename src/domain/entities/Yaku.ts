/**
 * @deprecated This file is deprecated. Import from @/game-engine/domain/entities/Yaku instead.
 * This re-export exists only for backward compatibility during migration.
 */

export type { YakuRule, YakuResult } from '@/game-engine/domain/entities/Yaku'
export { Yaku } from '@/game-engine/domain/entities/Yaku'

// For backward compatibility, also export constants
export { YAKU_COMBINATIONS, CARD_TYPES } from '@/shared/constants/gameConstants'
