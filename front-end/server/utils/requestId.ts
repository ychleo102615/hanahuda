/**
 * Request ID 工具函數
 *
 * @description
 * 為每個請求生成唯一的 ID，用於追蹤和日誌關聯。
 * 使用 H3 event context 在整個請求生命週期中傳遞。
 */

import type { H3Event } from 'h3'

const REQUEST_ID_KEY = 'requestId'
const REQUEST_ID_HEADER = 'X-Request-ID'

/**
 * 生成短隨機 ID
 *
 * @returns 8 字元的隨機 ID（base36 格式）
 *
 * @example
 * generateRequestId() // 'a1b2c3d4'
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `${timestamp.slice(-4)}${random}`
}

/**
 * 從 H3 Event 取得或建立 Request ID
 *
 * @param event - H3 事件物件
 * @returns Request ID 字串
 *
 * @description
 * 優先使用客戶端提供的 X-Request-ID header，
 * 若無則自動生成新的 ID。
 * ID 會存儲在 event.context 中供後續使用。
 */
export function getRequestId(event: H3Event): string {
  // 檢查是否已存在於 context
  if (event.context[REQUEST_ID_KEY]) {
    return event.context[REQUEST_ID_KEY] as string
  }

  // 檢查 header
  const headerRequestId = getHeader(event, REQUEST_ID_HEADER)
  if (headerRequestId) {
    event.context[REQUEST_ID_KEY] = headerRequestId
    return headerRequestId
  }

  // 生成新的 ID
  const newRequestId = generateRequestId()
  event.context[REQUEST_ID_KEY] = newRequestId
  return newRequestId
}

/**
 * 設置 Response 的 Request ID header
 *
 * @param event - H3 事件物件
 * @param requestId - Request ID
 *
 * @description
 * 將 Request ID 回傳給客戶端，便於客戶端追蹤。
 */
export function setRequestIdHeader(event: H3Event, requestId: string): void {
  setHeader(event, REQUEST_ID_HEADER, requestId)
}

/**
 * 初始化請求並設置 Request ID
 *
 * @param event - H3 事件物件
 * @returns Request ID
 *
 * @description
 * 在 API handler 開始時呼叫，自動取得或生成 Request ID，
 * 並設置 Response header。
 */
export function initRequestId(event: H3Event): string {
  const requestId = getRequestId(event)
  setRequestIdHeader(event, requestId)
  return requestId
}
