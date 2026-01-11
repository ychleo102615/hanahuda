/**
 * Matchmaking Entry Entity
 *
 * @description
 * 代表一位在配對佇列中等待的玩家。
 * 每個 Entry 追蹤玩家的配對狀態和時間資訊。
 *
 * @module server/matchmaking/domain/matchmakingEntry
 */

import type { RoomTypeId } from '~~/shared/constants/roomTypes'

/**
 * Matchmaking Entry Status - 配對條目狀態
 */
export type MatchmakingEntryStatus =
  | 'SEARCHING' // 0-10s: 積極搜尋中
  | 'LOW_AVAILABILITY' // 10-15s: 線上玩家較少
  | 'MATCHED' // 已配對成功 (人類或機器人)
  | 'CANCELLED' // 玩家取消配對
  | 'EXPIRED' // 超時未配對 (有 bot fallback 應不會發生)

/**
 * Matchmaking Entry Properties
 */
export interface MatchmakingEntryProps {
  readonly id: string
  readonly playerId: string
  readonly playerName: string
  readonly roomType: RoomTypeId
  readonly enteredAt: Date
  status: MatchmakingEntryStatus
}

/**
 * Create Matchmaking Entry Input
 */
export interface CreateMatchmakingEntryInput {
  readonly id: string
  readonly playerId: string
  readonly playerName: string
  readonly roomType: RoomTypeId
  readonly enteredAt?: Date
}

/**
 * Matchmaking Entry Entity
 *
 * @description
 * 配對佇列中的玩家實體。追蹤玩家 ID、房間類型、狀態和進入時間。
 *
 * 業務規則:
 * - 同一玩家同時只能有一個 active entry
 * - Entry 在狀態變為 MATCHED、CANCELLED 或 EXPIRED 時從佇列移除
 * - Bot fallback 確保 EXPIRED 狀態在正常操作下不會發生
 */
export class MatchmakingEntry {
  private readonly props: MatchmakingEntryProps

  private constructor(props: MatchmakingEntryProps) {
    this.props = props
  }

  /**
   * 建立新的配對條目
   */
  static create(input: CreateMatchmakingEntryInput): MatchmakingEntry {
    if (!input.id || input.id.trim() === '') {
      throw new Error('Entry ID is required')
    }
    if (!input.playerId || input.playerId.trim() === '') {
      throw new Error('Player ID is required')
    }
    if (!input.playerName || input.playerName.trim() === '') {
      throw new Error('Player name is required')
    }
    if (input.playerName.length > 20) {
      throw new Error('Player name must be 20 characters or less')
    }
    if (!input.roomType) {
      throw new Error('Room type is required')
    }

    return new MatchmakingEntry({
      id: input.id,
      playerId: input.playerId,
      playerName: input.playerName,
      roomType: input.roomType,
      enteredAt: input.enteredAt ?? new Date(),
      status: 'SEARCHING',
    })
  }

  /**
   * 從現有資料重建 Entry (用於持久化恢復)
   */
  static reconstitute(props: MatchmakingEntryProps): MatchmakingEntry {
    return new MatchmakingEntry(props)
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get playerId(): string {
    return this.props.playerId
  }

  get playerName(): string {
    return this.props.playerName
  }

  get roomType(): RoomTypeId {
    return this.props.roomType
  }

  get enteredAt(): Date {
    return this.props.enteredAt
  }

  get status(): MatchmakingEntryStatus {
    return this.props.status
  }

  /**
   * 檢查是否仍在積極搜尋中
   */
  isSearching(): boolean {
    return this.props.status === 'SEARCHING' || this.props.status === 'LOW_AVAILABILITY'
  }

  /**
   * 檢查是否可以被配對
   */
  isMatchable(): boolean {
    return this.isSearching()
  }

  /**
   * 計算已等待時間 (秒)
   */
  getElapsedSeconds(now: Date = new Date()): number {
    return Math.floor((now.getTime() - this.props.enteredAt.getTime()) / 1000)
  }

  /**
   * 更新狀態為 LOW_AVAILABILITY
   */
  transitionToLowAvailability(): void {
    if (this.props.status !== 'SEARCHING') {
      throw new Error(`Cannot transition to LOW_AVAILABILITY from status: ${this.props.status}`)
    }
    this.props.status = 'LOW_AVAILABILITY'
  }

  /**
   * 更新狀態為 MATCHED
   */
  transitionToMatched(): void {
    if (!this.isSearching()) {
      throw new Error(`Cannot transition to MATCHED from status: ${this.props.status}`)
    }
    this.props.status = 'MATCHED'
  }

  /**
   * 更新狀態為 CANCELLED
   */
  transitionToCancelled(): void {
    if (!this.isSearching()) {
      throw new Error(`Cannot transition to CANCELLED from status: ${this.props.status}`)
    }
    this.props.status = 'CANCELLED'
  }

  /**
   * 更新狀態為 EXPIRED
   */
  transitionToExpired(): void {
    if (!this.isSearching()) {
      throw new Error(`Cannot transition to EXPIRED from status: ${this.props.status}`)
    }
    this.props.status = 'EXPIRED'
  }
}
