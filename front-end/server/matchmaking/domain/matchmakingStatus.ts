/**
 * Matchmaking Status Value Object
 *
 * @description
 * 代表配對狀態資訊，用於透過 WebSocket 傳送給客戶端。
 *
 * @module server/matchmaking/domain/matchmakingStatus
 */

/**
 * Matchmaking Status Code - 配對狀態碼
 */
export type MatchmakingStatusCode =
  | 'SEARCHING' // "Searching for opponent..."
  | 'LOW_AVAILABILITY' // "Few players online. Still searching..."
  | 'MATCHED_HUMAN' // "Opponent found!"
  | 'MATCHED_BOT' // "Matched with computer opponent"
  | 'CANCELLED' // "Matchmaking cancelled"
  | 'ERROR' // Error occurred

/**
 * Status Messages - 狀態訊息 (英文)
 */
export const STATUS_MESSAGES: Readonly<Record<MatchmakingStatusCode, string>> = Object.freeze({
  SEARCHING: 'Searching for opponent...',
  LOW_AVAILABILITY: 'Few players online. Still searching...',
  MATCHED_HUMAN: 'Opponent found!',
  MATCHED_BOT: 'Matched with computer opponent',
  CANCELLED: 'Matchmaking cancelled',
  ERROR: 'An error occurred',
})

/**
 * Matchmaking Status Properties
 */
export interface MatchmakingStatusProps {
  readonly status: MatchmakingStatusCode
  readonly message: string
  readonly elapsedSeconds: number
}

/**
 * Create Matchmaking Status Input
 */
export interface CreateMatchmakingStatusInput {
  readonly status: MatchmakingStatusCode
  readonly message?: string
  readonly elapsedSeconds: number
}

/**
 * Matchmaking Status Value Object
 *
 * @description
 * 不可變的配對狀態物件。包含狀態碼、訊息和已等待時間。
 */
export class MatchmakingStatus {
  private readonly props: MatchmakingStatusProps

  private constructor(props: MatchmakingStatusProps) {
    this.props = Object.freeze(props)
  }

  /**
   * 建立配對狀態
   */
  static create(input: CreateMatchmakingStatusInput): MatchmakingStatus {
    if (!input.status) {
      throw new Error('Status is required')
    }
    if (input.elapsedSeconds < 0) {
      throw new Error('Elapsed seconds cannot be negative')
    }

    return new MatchmakingStatus({
      status: input.status,
      message: input.message ?? STATUS_MESSAGES[input.status],
      elapsedSeconds: input.elapsedSeconds,
    })
  }

  /**
   * 建立搜尋中狀態
   */
  static searching(elapsedSeconds: number): MatchmakingStatus {
    return MatchmakingStatus.create({
      status: 'SEARCHING',
      elapsedSeconds,
    })
  }

  /**
   * 建立低可用性狀態
   */
  static lowAvailability(elapsedSeconds: number): MatchmakingStatus {
    return MatchmakingStatus.create({
      status: 'LOW_AVAILABILITY',
      elapsedSeconds,
    })
  }

  /**
   * 建立人類配對成功狀態
   */
  static matchedHuman(elapsedSeconds: number): MatchmakingStatus {
    return MatchmakingStatus.create({
      status: 'MATCHED_HUMAN',
      elapsedSeconds,
    })
  }

  /**
   * 建立機器人配對狀態
   */
  static matchedBot(elapsedSeconds: number): MatchmakingStatus {
    return MatchmakingStatus.create({
      status: 'MATCHED_BOT',
      elapsedSeconds,
    })
  }

  /**
   * 建立已取消狀態
   */
  static cancelled(elapsedSeconds: number): MatchmakingStatus {
    return MatchmakingStatus.create({
      status: 'CANCELLED',
      elapsedSeconds,
    })
  }

  /**
   * 建立錯誤狀態
   */
  static error(message: string, elapsedSeconds: number): MatchmakingStatus {
    return MatchmakingStatus.create({
      status: 'ERROR',
      message,
      elapsedSeconds,
    })
  }

  // Getters
  get status(): MatchmakingStatusCode {
    return this.props.status
  }

  get message(): string {
    return this.props.message
  }

  get elapsedSeconds(): number {
    return this.props.elapsedSeconds
  }

  /**
   * 檢查是否仍在搜尋中
   */
  isSearching(): boolean {
    return this.props.status === 'SEARCHING' || this.props.status === 'LOW_AVAILABILITY'
  }

  /**
   * 檢查是否已配對成功
   */
  isMatched(): boolean {
    return this.props.status === 'MATCHED_HUMAN' || this.props.status === 'MATCHED_BOT'
  }

  /**
   * 檢查是否已終止 (配對、取消或錯誤)
   */
  isTerminal(): boolean {
    return (
      this.props.status === 'MATCHED_HUMAN' ||
      this.props.status === 'MATCHED_BOT' ||
      this.props.status === 'CANCELLED' ||
      this.props.status === 'ERROR'
    )
  }
}
