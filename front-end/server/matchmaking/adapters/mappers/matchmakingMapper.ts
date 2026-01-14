/**
 * Matchmaking Mapper
 *
 * @description
 * Domain 物件與 DTO 之間的轉換器。
 *
 * @module server/matchmaking/adapters/mappers/matchmakingMapper
 */

import type { MatchmakingEntry } from '../../domain/matchmakingEntry'
import type { MatchmakingStatusCode } from '../../domain/matchmakingStatus'
import { STATUS_MESSAGES } from '../../domain/matchmakingStatus'
import type { MatchResult } from '../../domain/matchResult'

/**
 * Enter Matchmaking Response DTO
 */
export interface EnterMatchmakingResponseDto {
  readonly success: boolean
  readonly entry_id?: string
  readonly message: string
  readonly error_code?: string
}

/**
 * Cancel Matchmaking Response DTO
 */
export interface CancelMatchmakingResponseDto {
  readonly success: boolean
  readonly message: string
  readonly error_code?: string
}

/**
 * Matchmaking Status Event DTO
 */
export interface MatchmakingStatusEventDto {
  readonly event_type: 'MatchmakingStatus'
  readonly entry_id: string
  readonly status: MatchmakingStatusCode
  readonly message: string
  readonly elapsed_seconds: number
}

/**
 * Match Found Event DTO
 */
export interface MatchFoundEventDto {
  readonly event_type: 'MatchFound'
  readonly game_id: string
  readonly opponent_name: string
  readonly is_bot: boolean
}

/**
 * Matchmaking Cancelled Event DTO
 */
export interface MatchmakingCancelledEventDto {
  readonly event_type: 'MatchmakingCancelled'
}

/**
 * Matchmaking Error DTO
 */
export interface MatchmakingErrorDto {
  readonly success: false
  readonly error_code: string
  readonly message: string
}

/**
 * Matchmaking Mapper
 */
export const MatchmakingMapper = {
  /**
   * 轉換 Enter Matchmaking 成功回應
   */
  toEnterSuccessDto(entryId: string, message: string): EnterMatchmakingResponseDto {
    return {
      success: true,
      entry_id: entryId,
      message,
    }
  },

  /**
   * 轉換 Enter Matchmaking 錯誤回應
   */
  toEnterErrorDto(errorCode: string, message: string): EnterMatchmakingResponseDto {
    return {
      success: false,
      error_code: errorCode,
      message,
    }
  },

  /**
   * 轉換 Cancel Matchmaking 成功回應
   */
  toCancelSuccessDto(message: string): CancelMatchmakingResponseDto {
    return {
      success: true,
      message,
    }
  },

  /**
   * 轉換 Cancel Matchmaking 錯誤回應
   */
  toCancelErrorDto(errorCode: string, message: string): CancelMatchmakingResponseDto {
    return {
      success: false,
      error_code: errorCode,
      message,
    }
  },

  /**
   * 轉換配對狀態事件
   */
  toStatusEventDto(
    entry: MatchmakingEntry,
    now: Date = new Date()
  ): MatchmakingStatusEventDto {
    const statusCode: MatchmakingStatusCode =
      entry.status === 'LOW_AVAILABILITY' ? 'LOW_AVAILABILITY' : 'SEARCHING'

    return {
      event_type: 'MatchmakingStatus',
      entry_id: entry.id,
      status: statusCode,
      message: STATUS_MESSAGES[statusCode],
      elapsed_seconds: entry.getElapsedSeconds(now),
    }
  },

  /**
   * 轉換配對成功事件
   */
  toMatchFoundEventDto(
    gameId: string,
    opponentName: string,
    isBot: boolean
  ): MatchFoundEventDto {
    return {
      event_type: 'MatchFound',
      game_id: gameId,
      opponent_name: opponentName,
      is_bot: isBot,
    }
  },

  /**
   * 轉換配對取消事件
   */
  toCancelledEventDto(): MatchmakingCancelledEventDto {
    return {
      event_type: 'MatchmakingCancelled',
    }
  },

  /**
   * 轉換錯誤 DTO
   */
  toErrorDto(errorCode: string, message: string): MatchmakingErrorDto {
    return {
      success: false,
      error_code: errorCode,
      message,
    }
  },

  /**
   * 從 MatchResult 取得配對資訊
   */
  fromMatchResult(
    matchResult: MatchResult,
    gameId: string,
    forPlayerId: string
  ): MatchFoundEventDto {
    const _opponentId = matchResult.getOpponentId(forPlayerId)
    // Note: 對手名稱需要從外部提供，因為 MatchResult 不包含名稱
    return {
      event_type: 'MatchFound',
      game_id: gameId,
      opponent_name: 'Opponent', // 應由呼叫者提供實際名稱
      is_bot: matchResult.isBotMatch(),
    }
  },
}
