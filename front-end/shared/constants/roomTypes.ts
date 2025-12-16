/**
 * 房間類型配置
 *
 * @description
 * 定義遊戲房間類型與對應的規則配置。
 * 每種房間類型有不同的回合數和遊戲規則。
 *
 * @module shared/constants/roomTypes
 */

import type { Ruleset, YakuSetting, SpecialRules } from '../contracts/shared'

/**
 * 房間類型 ID
 */
export type RoomTypeId = 'QUICK' | 'STANDARD' | 'MARATHON'

/**
 * 房間類型配置
 */
export interface RoomTypeConfig {
  readonly id: RoomTypeId
  readonly name: string
  readonly description: string
  readonly ruleset: Ruleset
}

/**
 * 預設役種設定
 */
export const DEFAULT_YAKU_SETTINGS: ReadonlyArray<YakuSetting> = Object.freeze([
  { yaku_type: 'GOKO', base_points: 15, enabled: true },
  { yaku_type: 'SHIKO', base_points: 8, enabled: true },
  { yaku_type: 'AME_SHIKO', base_points: 7, enabled: true },
  { yaku_type: 'SANKO', base_points: 6, enabled: true },
  { yaku_type: 'TSUKIMI_ZAKE', base_points: 5, enabled: true },
  { yaku_type: 'HANAMI_ZAKE', base_points: 5, enabled: true },
  { yaku_type: 'INO_SHIKA_CHO', base_points: 5, enabled: true },
  { yaku_type: 'TANE', base_points: 1, enabled: true },
  { yaku_type: 'AKATAN_AOTAN', base_points: 10, enabled: true },
  { yaku_type: 'AKATAN', base_points: 5, enabled: true },
  { yaku_type: 'AOTAN', base_points: 5, enabled: true },
  { yaku_type: 'TANZAKU', base_points: 1, enabled: true },
  { yaku_type: 'KASU', base_points: 1, enabled: true },
])

/**
 * 預設特殊規則
 */
export const DEFAULT_SPECIAL_RULES: SpecialRules = Object.freeze({
  teshi_enabled: true,
  field_kuttsuki_enabled: true,
})

/**
 * 預設牌堆總數（標準花札 48 張）
 */
export const DEFAULT_TOTAL_DECK_CARDS = 48

/**
 * 建立規則集
 *
 * @param totalRounds - 總回合數
 * @returns 完整的規則集
 */
function createRuleset(totalRounds: number): Ruleset {
  return Object.freeze({
    total_rounds: totalRounds,
    yaku_settings: DEFAULT_YAKU_SETTINGS,
    special_rules: DEFAULT_SPECIAL_RULES,
    total_deck_cards: DEFAULT_TOTAL_DECK_CARDS,
  })
}

/**
 * 房間類型配置表
 */
export const ROOM_TYPES: Readonly<Record<RoomTypeId, RoomTypeConfig>> = Object.freeze({
  QUICK: Object.freeze({
    id: 'QUICK',
    name: 'Quick Match',
    description: '2 rounds, fast game',
    ruleset: createRuleset(2),
  }),
  STANDARD: Object.freeze({
    id: 'STANDARD',
    name: 'Standard Match',
    description: '6 rounds, balanced game',
    ruleset: createRuleset(6),
  }),
  MARATHON: Object.freeze({
    id: 'MARATHON',
    name: 'Marathon Match',
    description: '12 rounds, full game',
    ruleset: createRuleset(12),
  }),
})

/**
 * 預設房間類型 ID
 */
export const DEFAULT_ROOM_TYPE_ID: RoomTypeId = 'QUICK'

/**
 * 驗證房間類型 ID 是否有效
 *
 * @param id - 要驗證的 ID
 * @returns 是否為有效的房間類型 ID
 */
export function isValidRoomTypeId(id: string): id is RoomTypeId {
  return id === 'QUICK' || id === 'STANDARD' || id === 'MARATHON'
}

/**
 * 取得房間類型配置
 *
 * @param roomTypeId - 房間類型 ID
 * @returns 房間類型配置
 */
export function getRoomTypeConfig(roomTypeId: RoomTypeId): RoomTypeConfig {
  return ROOM_TYPES[roomTypeId]
}

/**
 * 取得規則集
 *
 * @param roomTypeId - 房間類型 ID
 * @returns 規則集
 */
export function getRuleset(roomTypeId: RoomTypeId): Ruleset {
  return ROOM_TYPES[roomTypeId].ruleset
}
