/**
 * WebSocket Responses Contract
 *
 * @description
 * WebSocket 命令回應定義。
 * Server → Client 的命令回應格式。
 *
 * @module shared/contracts/ws-responses
 */

// ============================================================================
// 回應類型
// ============================================================================

/**
 * WebSocket 命令回應錯誤
 */
export interface WsCommandError {
  readonly code: string
  readonly message: string
}

/**
 * WebSocket 命令回應
 *
 * @description
 * Server 對 Client 命令的回應。
 * 透過 `response_to` 關聯到原始命令的 `command_id`。
 */
export interface WsCommandResponse {
  /** 關聯的命令 ID */
  readonly response_to: string
  /** 命令是否成功執行 */
  readonly success: boolean
  /** 錯誤資訊（僅當 success 為 false 時存在） */
  readonly error?: WsCommandError
  /** 回應時間戳 */
  readonly timestamp: string
}

// ============================================================================
// 輔助函數
// ============================================================================

/**
 * 建立成功回應
 */
export function createSuccessResponse(commandId: string): WsCommandResponse {
  return {
    response_to: commandId,
    success: true,
    timestamp: new Date().toISOString(),
  }
}

/**
 * 建立錯誤回應
 */
export function createErrorResponse(
  commandId: string,
  code: string,
  message: string
): WsCommandResponse {
  return {
    response_to: commandId,
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * 檢查是否為 WebSocket 命令回應
 */
export function isWsCommandResponse(message: unknown): message is WsCommandResponse {
  return (
    typeof message === 'object' &&
    message !== null &&
    'response_to' in message &&
    'success' in message &&
    typeof (message as WsCommandResponse).response_to === 'string' &&
    typeof (message as WsCommandResponse).success === 'boolean'
  )
}
