/**
 * WebSocket Rate Limiter
 *
 * @description
 * 應用層的 WebSocket 命令限流器。
 * 使用滑動視窗算法限制每個玩家的命令發送頻率。
 *
 * @module server/gateway/wsRateLimiter
 */

import { logger } from '../utils/logger'

// ============================================================================
// Types
// ============================================================================

/**
 * Rate Limit 配置
 */
interface RateLimitConfig {
  /** 視窗時間（毫秒） */
  readonly windowMs: number
  /** 視窗內最大請求數 */
  readonly maxRequests: number
}

/**
 * Rate Limit 條目
 */
interface RateLimitEntry {
  /** 當前視窗內的請求數 */
  count: number
  /** 視窗開始時間 */
  windowStart: number
}

/**
 * Rate Limit 檢查結果
 */
export interface RateLimitResult {
  /** 是否允許請求 */
  readonly allowed: boolean
  /** 重試等待秒數（僅當 allowed=false 時有值） */
  readonly retryAfter?: number
  /** 剩餘請求數 */
  readonly remaining: number
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 預設 Rate Limit 配置
 *
 * 每秒最多 10 個命令，對於卡牌遊戲來說已經很寬鬆。
 * 正常遊戲操作（打牌、選擇目標、決策）不可能超過這個頻率。
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 1000,     // 1 秒
  maxRequests: 10,    // 每秒最多 10 個命令
}

/**
 * 清理間隔（毫秒）
 */
const CLEANUP_INTERVAL_MS = 10000  // 10 秒

// ============================================================================
// WsRateLimiter Class
// ============================================================================

/**
 * WebSocket 命令限流器
 *
 * @description
 * 使用固定視窗算法實現簡單的限流。
 * 當視窗過期時自動重置計數。
 *
 * @example
 * ```typescript
 * const result = wsRateLimiter.check(playerId)
 * if (!result.allowed) {
 *   // 回傳 RATE_LIMIT_EXCEEDED 錯誤
 * }
 * ```
 */
class WsRateLimiter {
  private readonly limits = new Map<string, RateLimitEntry>()
  private readonly config: RateLimitConfig
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: RateLimitConfig = DEFAULT_CONFIG) {
    this.config = config
    this.startCleanupTimer()
  }

  /**
   * 檢查是否允許請求
   *
   * @param playerId - 玩家 ID
   * @returns Rate Limit 檢查結果
   */
  check(playerId: string): RateLimitResult {
    const now = Date.now()
    const entry = this.limits.get(playerId)

    // 無記錄或視窗已過期 → 新視窗
    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      this.limits.set(playerId, { count: 1, windowStart: now })
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
      }
    }

    // 檢查是否超過限制
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.windowStart + this.config.windowMs - now) / 1000)
      return {
        allowed: false,
        retryAfter: Math.max(retryAfter, 1),
        remaining: 0,
      }
    }

    // 增加計數
    entry.count++
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
    }
  }

  /**
   * 重置指定玩家的限流狀態
   *
   * @param playerId - 玩家 ID
   */
  reset(playerId: string): void {
    this.limits.delete(playerId)
  }

  /**
   * 清理過期的限流條目
   *
   * @description
   * 移除超過兩個視窗時間的條目，避免記憶體洩漏。
   */
  cleanup(): void {
    const now = Date.now()
    const expiredThreshold = this.config.windowMs * 2
    let cleanedCount = 0

    for (const [playerId, entry] of this.limits) {
      if (now - entry.windowStart >= expiredThreshold) {
        this.limits.delete(playerId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.info('WsRateLimiter cleanup', { cleanedCount, remaining: this.limits.size })
    }
  }

  /**
   * 取得當前追蹤的玩家數
   */
  get size(): number {
    return this.limits.size
  }

  /**
   * 啟動定期清理計時器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, CLEANUP_INTERVAL_MS)

    // 避免 Node.js 因為這個計時器無法退出
    this.cleanupTimer.unref()
  }

  /**
   * 停止清理計時器（用於測試）
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * 全域 WebSocket 限流器實例
 */
export const wsRateLimiter = new WsRateLimiter()

/**
 * 建立自訂配置的限流器（用於測試）
 */
export function createWsRateLimiter(config: RateLimitConfig): WsRateLimiter {
  return new WsRateLimiter(config)
}
