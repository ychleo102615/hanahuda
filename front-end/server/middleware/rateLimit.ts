/**
 * Rate Limit Middleware
 *
 * @description
 * Nitro 中間件，為 API 端點實施請求限速。
 * 依據 contracts/rest-api.md 規格：
 * - join: 10 req/min
 * - turns: 60 req/min
 *
 * @example
 * 此中間件會自動套用至所有 /api/v1/games/ 路徑下的請求
 */

import { rateLimiter } from '~~/server/utils/rateLimiter'
import { createLogger } from '~~/server/utils/logger'
import { getRequestId } from '~~/server/utils/requestId'
import { HTTP_TOO_MANY_REQUESTS } from '#shared/constants'

const logger = createLogger('Middleware:RateLimit')

/**
 * 取得客戶端識別鍵
 *
 * 優先使用：
 * 1. X-Forwarded-For header（經過 proxy 時）
 * 2. 連線的 remoteAddress
 * 3. 預設值 'unknown'
 */
function getClientKey(event: Parameters<typeof defineEventHandler>[0] extends (e: infer E) => unknown ? E : never): string {
  // 嘗試從 header 取得真實 IP（經過反向代理時）
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  if (forwardedFor) {
    // X-Forwarded-For 可能包含多個 IP，取第一個（原始客戶端）
    return forwardedFor.split(',')[0].trim()
  }

  // 嘗試從 socket 取得 IP
  const remoteAddress = event.node.req.socket?.remoteAddress
  if (remoteAddress) {
    return remoteAddress
  }

  return 'unknown'
}

/**
 * 判斷端點類型
 *
 * @param path - 請求路徑
 * @returns 端點類型：'join' | 'turns' | null
 */
function getEndpointType(path: string): 'join' | 'turns' | null {
  // /api/v1/games/join
  if (path.endsWith('/join')) {
    return 'join'
  }

  // /api/v1/games/{gameId}/turns/* 或 /api/v1/games/{gameId}/rounds/*
  if (path.includes('/turns/') || path.includes('/rounds/')) {
    return 'turns'
  }

  return null
}

export default defineEventHandler((event) => {
  const path = event.path

  // 只處理 API 路徑
  if (!path.startsWith('/api/v1/games')) {
    return
  }

  // 判斷端點類型
  const endpointType = getEndpointType(path)
  if (!endpointType) {
    // 不需要限速的端點（如 SSE events, snapshot GET）
    return
  }

  // 取得客戶端識別鍵
  const clientKey = getClientKey(event)
  const requestId = getRequestId(event)

  // 檢查 rate limit
  const result = rateLimiter.check(clientKey, endpointType)

  // 設置 Rate Limit 相關 headers
  setHeader(event, 'X-RateLimit-Limit', result.remaining >= 0 ? String(result.remaining + 1) : 'unlimited')
  setHeader(event, 'X-RateLimit-Remaining', String(Math.max(0, result.remaining)))
  if (result.resetAt > 0) {
    setHeader(event, 'X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)))
  }

  if (!result.allowed) {
    // 超過限制
    logger.warn('Rate limit exceeded', {
      clientKey,
      endpointType,
      path,
      retryAfter: result.retryAfter,
      requestId,
    })

    setHeader(event, 'Retry-After', String(result.retryAfter))
    setResponseStatus(event, HTTP_TOO_MANY_REQUESTS)

    return {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please wait ${result.retryAfter} seconds before retrying.`,
        retry_after: result.retryAfter,
      },
      timestamp: new Date().toISOString(),
    }
  }

  // 允許請求繼續
  return
})
