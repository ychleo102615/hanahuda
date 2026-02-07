/**
 * PrivateRoom Aggregate Root
 *
 * @description
 * 代表一個私人遊戲房間。
 * 管理房間的生命週期：建立、加入、遊戲開始、過期、解散。
 *
 * 業務規則:
 * - 房間建立時產生唯一 Room ID (6 位英數字元，排除混淆字元)
 * - 房間有效期限為 10 分鐘
 * - 房間最多容納 2 位玩家
 * - 只有房主可以解散房間
 * - 房間滿人後等待雙方 SSE 連線就位，再轉換為遊戲狀態
 * - shareUrl 不在 Domain 層，由 API Adapter 層組裝
 *
 * @module server/matchmaking/domain/privateRoom
 */

import { randomUUID } from 'node:crypto'
import { customAlphabet } from 'nanoid'
import type { RoomTypeId } from '~~/shared/constants/roomTypes'

/**
 * Room ID 生成器
 *
 * 排除混淆字元: 0, O, 1, I, l
 */
const ROOM_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const generateRoomId = customAlphabet(ROOM_ID_ALPHABET, 6)

/**
 * 房間有效期限 (毫秒)
 */
const ROOM_EXPIRATION_MS = 10 * 60 * 1000

/**
 * PrivateRoom Status
 */
export type PrivateRoomStatus =
  | 'WAITING'     // 等待訪客加入
  | 'FULL'        // 訪客已加入，等待雙方 SSE 連線就位
  | 'IN_GAME'     // 遊戲進行中
  | 'EXPIRED'     // 已過期
  | 'DISSOLVED'   // 已解散

/**
 * PrivateRoom Properties
 */
export interface PrivateRoomProps {
  readonly id: string
  readonly roomId: string
  readonly hostId: string
  readonly hostName: string
  readonly roomType: RoomTypeId
  readonly createdAt: Date
  readonly expiresAt: Date
  status: PrivateRoomStatus
  guestId: string | null
  guestName: string | null
  gameId: string | null
}

/**
 * Create PrivateRoom Input
 */
export interface CreatePrivateRoomInput {
  readonly hostId: string
  readonly hostName: string
  readonly roomType: RoomTypeId
  readonly createdAt?: Date
}

/**
 * PrivateRoom Aggregate Root
 */
export class PrivateRoom {
  private readonly props: PrivateRoomProps

  private constructor(props: PrivateRoomProps) {
    this.props = props
  }

  /**
   * 建立新的私人房間
   */
  static create(input: CreatePrivateRoomInput): PrivateRoom {
    if (!input.hostId || input.hostId.trim() === '') {
      throw new Error('Host ID is required')
    }
    if (!input.hostName || input.hostName.trim() === '') {
      throw new Error('Host name is required')
    }
    if (!input.roomType) {
      throw new Error('Room type is required')
    }

    const createdAt = input.createdAt ?? new Date()
    const expiresAt = new Date(createdAt.getTime() + ROOM_EXPIRATION_MS)

    return new PrivateRoom({
      id: randomUUID(),
      roomId: generateRoomId(),
      hostId: input.hostId,
      hostName: input.hostName,
      roomType: input.roomType,
      createdAt,
      expiresAt,
      status: 'WAITING',
      guestId: null,
      guestName: null,
      gameId: null,
    })
  }

  /**
   * 從現有資料重建 PrivateRoom (用於持久化恢復)
   */
  static reconstitute(props: PrivateRoomProps): PrivateRoom {
    return new PrivateRoom(props)
  }

  // =========================================================================
  // Getters
  // =========================================================================

  get id(): string {
    return this.props.id
  }

  get roomId(): string {
    return this.props.roomId
  }

  get hostId(): string {
    return this.props.hostId
  }

  get hostName(): string {
    return this.props.hostName
  }

  get roomType(): RoomTypeId {
    return this.props.roomType
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get expiresAt(): Date {
    return this.props.expiresAt
  }

  get status(): PrivateRoomStatus {
    return this.props.status
  }

  get guestId(): string | null {
    return this.props.guestId
  }

  get guestName(): string | null {
    return this.props.guestName
  }

  get gameId(): string | null {
    return this.props.gameId
  }

  // =========================================================================
  // Queries
  // =========================================================================

  /**
   * 檢查房間是否為活躍狀態 (WAITING, FULL, IN_GAME)
   */
  isActive(): boolean {
    return this.props.status === 'WAITING'
      || this.props.status === 'FULL'
      || this.props.status === 'IN_GAME'
  }

  /**
   * 檢查指定玩家是否在此房間中
   */
  hasPlayer(playerId: string): boolean {
    return this.props.hostId === playerId || this.props.guestId === playerId
  }

  /**
   * 檢查指定玩家是否為房主
   */
  isHost(playerId: string): boolean {
    return this.props.hostId === playerId
  }

  // =========================================================================
  // State Transitions
  // =========================================================================

  /**
   * 訪客加入房間 (WAITING → FULL)
   */
  join(guestId: string, guestName: string): void {
    if (this.props.status !== 'WAITING') {
      throw new Error(`Cannot join room in status: ${this.props.status}`)
    }
    if (!guestId || guestId.trim() === '') {
      throw new Error('Guest ID is required')
    }
    if (!guestName || guestName.trim() === '') {
      throw new Error('Guest name is required')
    }
    if (guestId === this.props.hostId) {
      throw new Error('Cannot join own room')
    }

    this.props.guestId = guestId
    this.props.guestName = guestName
    this.props.status = 'FULL'
  }

  /**
   * 開始遊戲 (FULL → IN_GAME)
   */
  startGame(gameId: string): void {
    if (this.props.status !== 'FULL') {
      throw new Error(`Cannot start game in status: ${this.props.status}`)
    }
    if (!gameId || gameId.trim() === '') {
      throw new Error('Game ID is required')
    }

    this.props.gameId = gameId
    this.props.status = 'IN_GAME'
  }

  /**
   * 房間過期 (WAITING/FULL → EXPIRED)
   */
  expire(): void {
    if (this.props.status !== 'WAITING' && this.props.status !== 'FULL') {
      throw new Error(`Cannot expire room in status: ${this.props.status}`)
    }
    this.props.status = 'EXPIRED'
  }

  /**
   * 解散房間 (WAITING/FULL → DISSOLVED)
   */
  dissolve(): void {
    if (this.props.status !== 'WAITING' && this.props.status !== 'FULL') {
      throw new Error(`Cannot dissolve room in status: ${this.props.status}`)
    }
    this.props.status = 'DISSOLVED'
  }
}
