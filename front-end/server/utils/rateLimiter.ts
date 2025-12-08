/**
 * Rate Limiter 工具
 *
 * @description
 * 基於滑動視窗的請求限速器，用於保護 API 免受濫用。
 * 使用記憶體儲存，適用於單伺服器 MVP 階段。
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter()
 *
 * // 檢查請求是否允許
 * const result = limiter.check('192.168.1.1', 'join')
 * if (!result.allowed) {
 *   // 返回 429 Too Many Requests
 * }
 * ```
 */

/**
 * Rate Limit 配置
 */
export interface RateLimitConfig {
  /** 時間窗口（毫秒） */
  windowMs: number
  /** 窗口內最大請求數 */
  maxRequests: number
}

/**
 * Rate Limit 檢查結果
 */
export interface RateLimitResult {
  /** 是否允許請求 */
  allowed: boolean
  /** 剩餘請求數 */
  remaining: number
  /** 重置時間（毫秒時間戳） */
  resetAt: number
  /** 重試等待時間（秒） */
  retryAfter: number
}

/**
 * 預設的 Rate Limit 配置
 *
 * 依據 contracts/rest-api.md 規格：
 * - join: 10 req/min
 * - turns: 60 req/min
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  join: {
    windowMs: 60 * 1000,  // 1 分鐘
    maxRequests: 10,
  },
  turns: {
    windowMs: 60 * 1000,  // 1 分鐘
    maxRequests: 60,
  },
}

/**
 * Rate Limiter 介面
 */
export interface RateLimiter {
  /**
   * 檢查請求是否允許
   *
   * @param key - 識別鍵（通常是 IP 或 playerId）
   * @param endpoint - 端點類型（join, turns）
   * @returns 檢查結果
   */
  check(key: string, endpoint: string): RateLimitResult

  /**
   * 重置指定鍵的計數
   *
   * @param key - 識別鍵
   * @param endpoint - 端點類型（可選，不指定則重置所有）
   */
  reset(key: string, endpoint?: string): void

  /**
   * 清理過期的記錄
   */
  cleanup(): void

  /**
   * 取得統計資訊
   */
  getStats(): { totalKeys: number; totalRequests: number }
}

/**
 * 建立 Rate Limiter 實例
 *
 * @returns Rate Limiter 實例
 */
export function createRateLimiter(): RateLimiter {
  // 儲存結構: Map<`${key}:${endpoint}`, timestamp[]>
  const requests = new Map<string, number[]>()

  // 自動清理計時器
  let cleanupTimer: ReturnType<typeof setInterval> | null = null

  /**
   * 取得複合鍵
   */
  function getCompositeKey(key: string, endpoint: string): string {
    return `${key}:${endpoint}`
  }

  /**
   * 清理過期的請求記錄
   */
  function cleanupExpiredRequests(compositeKey: string, config: RateLimitConfig): number[] {
    const now = Date.now()
    const windowStart = now - config.windowMs
    const timestamps = requests.get(compositeKey) || []
    const validTimestamps = timestamps.filter((ts) => ts > windowStart)

    if (validTimestamps.length === 0) {
      requests.delete(compositeKey)
    } else {
      requests.set(compositeKey, validTimestamps)
    }

    return validTimestamps
  }

  return {
    check(key: string, endpoint: string): RateLimitResult {
      const config = RATE_LIMITS[endpoint]
      if (!config) {
        // 未設定限制的端點，預設允許
        return {
          allowed: true,
          remaining: -1,
          resetAt: 0,
          retryAfter: 0,
        }
      }

      const compositeKey = getCompositeKey(key, endpoint)
      const now = Date.now()
      const windowStart = now - config.windowMs

      // 清理過期記錄並取得有效的請求時間戳
      const validTimestamps = cleanupExpiredRequests(compositeKey, config)
      const currentCount = validTimestamps.length

      // 計算重置時間
      const oldestTimestamp = validTimestamps[0] || now
      const resetAt = oldestTimestamp + config.windowMs

      if (currentCount >= config.maxRequests) {
        // 超過限制
        const retryAfter = Math.ceil((resetAt - now) / 1000)
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter: Math.max(1, retryAfter),
        }
      }

      // 允許請求，記錄時間戳
      validTimestamps.push(now)
      requests.set(compositeKey, validTimestamps)

      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetAt,
        retryAfter: 0,
      }
    },

    reset(key: string, endpoint?: string): void {
      if (endpoint) {
        requests.delete(getCompositeKey(key, endpoint))
      } else {
        // 重置該 key 的所有端點
        for (const compositeKey of requests.keys()) {
          if (compositeKey.startsWith(`${key}:`)) {
            requests.delete(compositeKey)
          }
        }
      }
    },

    cleanup(): void {
      const now = Date.now()

      for (const [compositeKey, timestamps] of requests.entries()) {
        // 取得該 key 對應的端點配置
        const endpoint = compositeKey.split(':').pop() || ''
        const config = RATE_LIMITS[endpoint]

        if (!config) {
          requests.delete(compositeKey)
          continue
        }

        const windowStart = now - config.windowMs
        const validTimestamps = timestamps.filter((ts) => ts > windowStart)

        if (validTimestamps.length === 0) {
          requests.delete(compositeKey)
        } else {
          requests.set(compositeKey, validTimestamps)
        }
      }
    },

    getStats(): { totalKeys: number; totalRequests: number } {
      let totalRequests = 0
      for (const timestamps of requests.values()) {
        totalRequests += timestamps.length
      }
      return {
        totalKeys: requests.size,
        totalRequests,
      }
    },
  }
}

/**
 * 全域 Rate Limiter 實例
 */
export const rateLimiter = createRateLimiter()

// 每分鐘清理一次過期記錄
setInterval(() => {
  rateLimiter.cleanup()
}, 60 * 1000)
