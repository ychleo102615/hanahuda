/**
 * Yaku Result Structure
 *
 * Represents a yaku (role/hand) achievement in the game.
 * Used in integration events to communicate yaku-related changes.
 *
 * Protocol Buffers compatible - uses only primitive types.
 */
export interface YakuResult {
  /**
   * Yaku type identifier
   * Using string literals for Protocol Buffers compatibility
   */
  readonly yaku:
    | 'GOKO'        // 五光 (10 points)
    | 'SHIKO'       // 四光 (8 points)
    | 'AME_SHIKO'   // 雨四光 (7 points)
    | 'SANKO'       // 三光 (5 points)
    | 'INOSHIKACHO' // 猪鹿蝶 (5 points)
    | 'AKA_TAN'     // 赤短 (5 points)
    | 'AO_TAN'      // 青短 (5 points)
    | 'TANE'        // 種 (1+ points)
    | 'TAN'         // 短 (1+ points)
    | 'KASU'        // カス (1+ points)

  /** Points awarded for this yaku */
  readonly points: number

  /**
   * Card IDs that form this yaku (for UI highlighting)
   * Contains the specific cards that achieved this yaku
   */
  readonly cardIds: readonly string[]
}

/**
 * Type guard to check if an object is a YakuResult
 */
export function isYakuResult(obj: unknown): obj is YakuResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as any).yaku === 'string' &&
    typeof (obj as any).points === 'number' &&
    Array.isArray((obj as any).cardIds) &&
    (obj as any).cardIds.every((id: unknown) => typeof id === 'string')
  )
}
