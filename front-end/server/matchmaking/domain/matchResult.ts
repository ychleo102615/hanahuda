/**
 * Match Result Value Object
 *
 * @description
 * 代表一次成功配對的結果。
 * 這是 Domain Layer 的 Value Object，只包含核心配對資訊。
 *
 * Note: playerName 被刻意排除在此 VO 之外。
 * 名稱是表現層關注點，已存在於 MatchmakingEntry 中。
 * 發布事件時 (如 MatchFoundPayload)，名稱在 Use Case/Adapter 層組裝。
 *
 * @module server/matchmaking/domain/matchResult
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'

/**
 * Match Type - 配對類型
 */
export type MatchType = 'HUMAN' | 'BOT'

/**
 * Match Result Properties
 */
export interface MatchResultProps {
  readonly player1Id: string
  readonly player2Id: string
  readonly roomType: RoomTypeId
  readonly matchType: MatchType
  readonly matchedAt: Date
}

/**
 * Create Match Result Input
 */
export interface CreateMatchResultInput {
  readonly player1Id: string
  readonly player2Id: string
  readonly roomType: RoomTypeId
  readonly matchType: MatchType
  readonly matchedAt?: Date
}

/**
 * Match Result Value Object
 *
 * @description
 * 不可變的配對結果物件。包含兩位玩家的 ID、房間類型、配對類型和時間。
 */
export class MatchResult {
  private readonly props: MatchResultProps

  private constructor(props: MatchResultProps) {
    this.props = Object.freeze(props)
  }

  /**
   * 建立新的配對結果
   */
  static create(input: CreateMatchResultInput): MatchResult {
    if (!input.player1Id || input.player1Id.trim() === '') {
      throw new Error('Player 1 ID is required')
    }
    if (!input.player2Id || input.player2Id.trim() === '') {
      throw new Error('Player 2 ID is required')
    }
    if (input.player1Id === input.player2Id) {
      throw new Error('Player 1 and Player 2 cannot be the same')
    }
    if (!input.roomType) {
      throw new Error('Room type is required')
    }
    if (!input.matchType) {
      throw new Error('Match type is required')
    }

    return new MatchResult({
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      roomType: input.roomType,
      matchType: input.matchType,
      matchedAt: input.matchedAt ?? new Date(),
    })
  }

  /**
   * 建立人類對戰配對結果
   */
  static createHumanMatch(
    player1Id: string,
    player2Id: string,
    roomType: RoomTypeId,
    matchedAt?: Date
  ): MatchResult {
    return MatchResult.create({
      player1Id,
      player2Id,
      roomType,
      matchType: 'HUMAN',
      matchedAt,
    })
  }

  /**
   * 建立機器人配對結果
   */
  static createBotMatch(
    playerId: string,
    botId: string,
    roomType: RoomTypeId,
    matchedAt?: Date
  ): MatchResult {
    return MatchResult.create({
      player1Id: playerId,
      player2Id: botId,
      roomType,
      matchType: 'BOT',
      matchedAt,
    })
  }

  // Getters
  get player1Id(): string {
    return this.props.player1Id
  }

  get player2Id(): string {
    return this.props.player2Id
  }

  get roomType(): RoomTypeId {
    return this.props.roomType
  }

  get matchType(): MatchType {
    return this.props.matchType
  }

  get matchedAt(): Date {
    return this.props.matchedAt
  }

  /**
   * 檢查是否為人類對戰
   */
  isHumanMatch(): boolean {
    return this.props.matchType === 'HUMAN'
  }

  /**
   * 檢查是否為機器人配對
   */
  isBotMatch(): boolean {
    return this.props.matchType === 'BOT'
  }

  /**
   * 檢查指定玩家是否參與此配對
   */
  includesPlayer(playerId: string): boolean {
    return this.props.player1Id === playerId || this.props.player2Id === playerId
  }

  /**
   * 取得配對中的另一位玩家
   */
  getOpponentId(playerId: string): string | undefined {
    if (this.props.player1Id === playerId) {
      return this.props.player2Id
    }
    if (this.props.player2Id === playerId) {
      return this.props.player1Id
    }
    return undefined
  }
}
