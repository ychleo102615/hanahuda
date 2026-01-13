/**
 * WebSocket Commands Schema
 *
 * @description
 * 使用 Zod 定義 WebSocket 命令的 Schema，用於 Server 端驗證。
 * 與 ws-commands.ts 的型別定義保持同步。
 *
 * @module shared/contracts/ws-commands.schema
 */

import { z } from 'zod'
import type { WsCommand } from './ws-commands'

// ============================================================================
// Payload Schemas
// ============================================================================

/**
 * PING 命令 payload schema
 */
export const PingPayloadSchema = z.object({}).strict()

/**
 * PLAY_CARD 命令 payload schema
 */
export const PlayCardPayloadSchema = z.object({
  game_id: z.string().min(1, 'game_id is required'),
  card_id: z.string().min(1, 'card_id is required'),
  target_card_id: z.string().min(1).optional(),
})

/**
 * SELECT_TARGET 命令 payload schema
 */
export const SelectTargetPayloadSchema = z.object({
  game_id: z.string().min(1, 'game_id is required'),
  source_card_id: z.string().min(1, 'source_card_id is required'),
  target_card_id: z.string().min(1, 'target_card_id is required'),
})

/**
 * MAKE_DECISION 命令 payload schema
 */
export const MakeDecisionPayloadSchema = z.object({
  game_id: z.string().min(1, 'game_id is required'),
  decision: z.enum(['KOI_KOI', 'END_ROUND'], {
    message: 'decision must be KOI_KOI or END_ROUND',
  }),
})

/**
 * CONFIRM_CONTINUE 命令 payload schema
 */
export const ConfirmContinuePayloadSchema = z.object({
  game_id: z.string().min(1, 'game_id is required'),
  decision: z.enum(['CONTINUE', 'LEAVE'], {
    message: 'decision must be CONTINUE or LEAVE',
  }),
})

/**
 * LEAVE_GAME 命令 payload schema
 */
export const LeaveGamePayloadSchema = z.object({
  game_id: z.string().min(1, 'game_id is required'),
})

// ============================================================================
// Command Schemas
// ============================================================================

/**
 * 基礎命令欄位 schema
 */
const BaseCommandFields = {
  command_id: z.string().min(1, 'command_id is required'),
}

/**
 * PING 命令 schema
 */
const PingCommandSchema = z.object({
  ...BaseCommandFields,
  type: z.literal('PING'),
  payload: PingPayloadSchema,
})

/**
 * PLAY_CARD 命令 schema
 */
const PlayCardCommandSchema = z.object({
  ...BaseCommandFields,
  type: z.literal('PLAY_CARD'),
  payload: PlayCardPayloadSchema,
})

/**
 * SELECT_TARGET 命令 schema
 */
const SelectTargetCommandSchema = z.object({
  ...BaseCommandFields,
  type: z.literal('SELECT_TARGET'),
  payload: SelectTargetPayloadSchema,
})

/**
 * MAKE_DECISION 命令 schema
 */
const MakeDecisionCommandSchema = z.object({
  ...BaseCommandFields,
  type: z.literal('MAKE_DECISION'),
  payload: MakeDecisionPayloadSchema,
})

/**
 * CONFIRM_CONTINUE 命令 schema
 */
const ConfirmContinueCommandSchema = z.object({
  ...BaseCommandFields,
  type: z.literal('CONFIRM_CONTINUE'),
  payload: ConfirmContinuePayloadSchema,
})

/**
 * LEAVE_GAME 命令 schema
 */
const LeaveGameCommandSchema = z.object({
  ...BaseCommandFields,
  type: z.literal('LEAVE_GAME'),
  payload: LeaveGamePayloadSchema,
})

// ============================================================================
// Combined Schema (Discriminated Union)
// ============================================================================

/**
 * WebSocket 命令 schema（Discriminated Union）
 *
 * 使用 type 欄位作為判別器，自動選擇對應的 payload schema。
 */
export const WsCommandSchema = z.discriminatedUnion('type', [
  PingCommandSchema,
  PlayCardCommandSchema,
  SelectTargetCommandSchema,
  MakeDecisionCommandSchema,
  ConfirmContinueCommandSchema,
  LeaveGameCommandSchema,
])

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * 驗證結果類型
 */
export type WsCommandValidationResult =
  | { success: true; data: WsCommand }
  | { success: false; error: z.ZodError }

/**
 * 驗證 WebSocket 命令
 *
 * @param data - 待驗證的資料
 * @returns 驗證結果
 *
 * @example
 * ```typescript
 * const result = validateWsCommand(data)
 * if (result.success) {
 *   // result.data 是有效的 WsCommand
 * } else {
 *   // result.error 包含驗證錯誤
 * }
 * ```
 */
export function validateWsCommand(data: unknown): WsCommandValidationResult {
  const result = WsCommandSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data as WsCommand }
  }
  return { success: false, error: result.error }
}

/**
 * 格式化 Zod 錯誤訊息
 *
 * @param error - Zod 錯誤物件
 * @returns 格式化的錯誤訊息字串
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join('; ')
}
