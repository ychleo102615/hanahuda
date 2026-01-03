/**
 * Player Aggregate Root
 *
 * @description
 * 玩家身份的聚合根，統一管理訪客與註冊玩家。
 *
 * 參考: specs/010-player-account/data-model.md#1.1-Player
 */

// =============================================================================
// Value Objects
// =============================================================================

/**
 * Player ID - UUID v4 branded type
 */
export type PlayerId = string & { readonly _brand: unique symbol }

// UUID v4 validation regex
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * 驗證 Player ID 是否為有效的 UUID v4
 */
export function isValidPlayerId(id: string): id is PlayerId {
  return UUID_V4_REGEX.test(id)
}

/**
 * 驗證顯示名稱是否有效（1-50 字元）
 */
export function isValidDisplayName(name: string): boolean {
  return name.length >= 1 && name.length <= 50
}

// =============================================================================
// Player Aggregate
// =============================================================================

/**
 * Player 資料結構
 */
export interface Player {
  readonly id: PlayerId
  readonly displayName: string
  readonly isGuest: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * 建立 Player 的參數
 */
export interface CreatePlayerParams {
  id: PlayerId
  displayName: string
  isGuest: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * 建立 Player
 *
 * @throws Error 如果 id 或 displayName 無效
 */
export function createPlayer(params: CreatePlayerParams): Player {
  if (!isValidPlayerId(params.id)) {
    throw new Error(`Invalid player ID: ${params.id}`)
  }

  if (!isValidDisplayName(params.displayName)) {
    throw new Error(`Invalid display name: must be 1-50 characters`)
  }

  return Object.freeze({
    id: params.id,
    displayName: params.displayName,
    isGuest: params.isGuest,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
  })
}

// =============================================================================
// Guest Player Factory
// =============================================================================

/**
 * 生成 Guest 顯示名稱 (Guest_XXXX)
 *
 * 使用 4 位大寫英數字
 */
function generateGuestDisplayName(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `Guest_${suffix}`
}

/**
 * 建立訪客玩家
 *
 * 自動生成 UUID 與 Guest_XXXX 格式的顯示名稱
 */
export function createGuestPlayer(): Player {
  const now = new Date()
  const id = crypto.randomUUID() as PlayerId

  return createPlayer({
    id,
    displayName: generateGuestDisplayName(),
    isGuest: true,
    createdAt: now,
    updatedAt: now,
  })
}

// =============================================================================
// Registered Player Factory
// =============================================================================

/**
 * 建立註冊玩家的參數
 */
export interface CreateRegisteredPlayerParams {
  id: PlayerId
  displayName: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 建立註冊玩家
 *
 * 用於 OAuth 登入直接建立帳號的情況
 */
export function createRegisteredPlayer(params: CreateRegisteredPlayerParams): Player {
  return createPlayer({
    id: params.id,
    displayName: params.displayName,
    isGuest: false,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
  })
}

// =============================================================================
// Player State Transitions
// =============================================================================

/**
 * 將訪客玩家升級為註冊玩家
 *
 * @param player - 原始訪客玩家
 * @param newDisplayName - 新的顯示名稱（通常為帳號名稱）
 * @throws Error 如果 player 不是訪客
 */
export function upgradeToRegistered(player: Player, newDisplayName: string): Player {
  if (!player.isGuest) {
    throw new Error('Cannot upgrade non-guest player')
  }

  if (!isValidDisplayName(newDisplayName)) {
    throw new Error(`Invalid display name: must be 1-50 characters`)
  }

  return createPlayer({
    id: player.id,
    displayName: newDisplayName,
    isGuest: false,
    createdAt: player.createdAt,
    updatedAt: new Date(),
  })
}
