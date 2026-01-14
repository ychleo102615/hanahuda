/**
 * WebSocket Commands Contract
 *
 * @description
 * WebSocket 雙向通訊命令定義。
 * Client → Server 的命令格式。
 *
 * @module shared/contracts/ws-commands
 */

import type { RoomTypeId } from '../constants/roomTypes'

// ============================================================================
// 命令類型
// ============================================================================

/**
 * WebSocket 命令類型
 */
export const WS_COMMAND_TYPES = [
  'PING',
  'JOIN_MATCHMAKING',
  'CANCEL_MATCHMAKING',
  'PLAY_CARD',
  'SELECT_TARGET',
  'MAKE_DECISION',
  'CONFIRM_CONTINUE',
  'LEAVE_GAME',
] as const

/**
 * WebSocket 命令類型
 */
export type WsCommandType = (typeof WS_COMMAND_TYPES)[number]

// ============================================================================
// 命令 Payload 定義
// ============================================================================

/**
 * PING 命令 payload（無需額外資料）
 *
 * 使用 Record<string, never> 表示空物件。
 */
export type PingPayload = Record<string, never>

/**
 * JOIN_MATCHMAKING 命令 payload
 */
export interface JoinMatchmakingPayload {
  readonly room_type: RoomTypeId
}

/**
 * CANCEL_MATCHMAKING 命令 payload（無需額外資料）
 */
export type CancelMatchmakingPayload = Record<string, never>

/**
 * PLAY_CARD 命令 payload
 */
export interface PlayCardPayload {
  readonly game_id: string
  readonly card_id: string
  readonly target_card_id?: string
}

/**
 * SELECT_TARGET 命令 payload
 */
export interface SelectTargetPayload {
  readonly game_id: string
  readonly source_card_id: string
  readonly target_card_id: string
}

/**
 * MAKE_DECISION 命令 payload
 */
export interface MakeDecisionPayload {
  readonly game_id: string
  readonly decision: 'KOI_KOI' | 'END_ROUND'
}

/**
 * CONFIRM_CONTINUE 命令 payload
 */
export interface ConfirmContinuePayload {
  readonly game_id: string
  readonly decision: 'CONTINUE' | 'LEAVE'
}

/**
 * LEAVE_GAME 命令 payload
 */
export interface LeaveGamePayload {
  readonly game_id: string
}

// ============================================================================
// 命令型別定義
// ============================================================================

/**
 * 基礎命令介面
 */
interface BaseWsCommand<T extends WsCommandType, P> {
  readonly command_id: string
  readonly type: T
  readonly payload: P
}

/**
 * PING 命令
 */
export type PingCommand = BaseWsCommand<'PING', PingPayload>

/**
 * JOIN_MATCHMAKING 命令
 */
export type JoinMatchmakingCommand = BaseWsCommand<'JOIN_MATCHMAKING', JoinMatchmakingPayload>

/**
 * CANCEL_MATCHMAKING 命令
 */
export type CancelMatchmakingCommand = BaseWsCommand<'CANCEL_MATCHMAKING', CancelMatchmakingPayload>

/**
 * PLAY_CARD 命令
 */
export type PlayCardCommand = BaseWsCommand<'PLAY_CARD', PlayCardPayload>

/**
 * SELECT_TARGET 命令
 */
export type SelectTargetCommand = BaseWsCommand<'SELECT_TARGET', SelectTargetPayload>

/**
 * MAKE_DECISION 命令
 */
export type MakeDecisionCommand = BaseWsCommand<'MAKE_DECISION', MakeDecisionPayload>

/**
 * CONFIRM_CONTINUE 命令
 */
export type ConfirmContinueCommand = BaseWsCommand<'CONFIRM_CONTINUE', ConfirmContinuePayload>

/**
 * LEAVE_GAME 命令
 */
export type LeaveGameCommand = BaseWsCommand<'LEAVE_GAME', LeaveGamePayload>

/**
 * 所有 WebSocket 命令的聯合類型
 */
export type WsCommand =
  | PingCommand
  | JoinMatchmakingCommand
  | CancelMatchmakingCommand
  | PlayCardCommand
  | SelectTargetCommand
  | MakeDecisionCommand
  | ConfirmContinueCommand
  | LeaveGameCommand

// ============================================================================
// 輔助函數
// ============================================================================

/**
 * 建立 PING 命令
 */
export function createPingCommand(commandId: string): PingCommand {
  return {
    command_id: commandId,
    type: 'PING',
    payload: {},
  }
}

/**
 * 建立 JOIN_MATCHMAKING 命令
 */
export function createJoinMatchmakingCommand(
  commandId: string,
  roomType: RoomTypeId
): JoinMatchmakingCommand {
  return {
    command_id: commandId,
    type: 'JOIN_MATCHMAKING',
    payload: {
      room_type: roomType,
    },
  }
}

/**
 * 建立 CANCEL_MATCHMAKING 命令
 */
export function createCancelMatchmakingCommand(commandId: string): CancelMatchmakingCommand {
  return {
    command_id: commandId,
    type: 'CANCEL_MATCHMAKING',
    payload: {},
  }
}

/**
 * 建立 PLAY_CARD 命令
 */
export function createPlayCardCommand(
  commandId: string,
  gameId: string,
  cardId: string,
  targetCardId?: string
): PlayCardCommand {
  return {
    command_id: commandId,
    type: 'PLAY_CARD',
    payload: {
      game_id: gameId,
      card_id: cardId,
      ...(targetCardId && { target_card_id: targetCardId }),
    },
  }
}

/**
 * 建立 SELECT_TARGET 命令
 */
export function createSelectTargetCommand(
  commandId: string,
  gameId: string,
  sourceCardId: string,
  targetCardId: string
): SelectTargetCommand {
  return {
    command_id: commandId,
    type: 'SELECT_TARGET',
    payload: {
      game_id: gameId,
      source_card_id: sourceCardId,
      target_card_id: targetCardId,
    },
  }
}

/**
 * 建立 MAKE_DECISION 命令
 */
export function createMakeDecisionCommand(
  commandId: string,
  gameId: string,
  decision: 'KOI_KOI' | 'END_ROUND'
): MakeDecisionCommand {
  return {
    command_id: commandId,
    type: 'MAKE_DECISION',
    payload: {
      game_id: gameId,
      decision,
    },
  }
}

/**
 * 建立 CONFIRM_CONTINUE 命令
 */
export function createConfirmContinueCommand(
  commandId: string,
  gameId: string,
  decision: 'CONTINUE' | 'LEAVE'
): ConfirmContinueCommand {
  return {
    command_id: commandId,
    type: 'CONFIRM_CONTINUE',
    payload: {
      game_id: gameId,
      decision,
    },
  }
}

/**
 * 建立 LEAVE_GAME 命令
 */
export function createLeaveGameCommand(commandId: string, gameId: string): LeaveGameCommand {
  return {
    command_id: commandId,
    type: 'LEAVE_GAME',
    payload: {
      game_id: gameId,
    },
  }
}
