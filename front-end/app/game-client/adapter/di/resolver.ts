/**
 * DI Resolver - 依賴解析器
 *
 * 非 Vue Composable，單純的依賴解析函數。
 * 用於從 DI Container 解析已註冊的依賴。
 *
 * 設計原則：
 * - 明確表達非 Composable 性質（避免 use- 前綴）
 * - 提供型別安全的依賴解析
 * - 簡潔的 API：resolveDependency / tryResolveDependency
 *
 * @module game-client/adapter/di/resolver
 */

import { container } from './container'
import type { DependencyNotFoundError } from './container'

/**
 * 從 DI Container 解析依賴
 *
 * @template T - 依賴的型別
 * @param token - Symbol token（在 TOKENS 中定義）
 * @returns 解析的依賴實例
 * @throws {DependencyNotFoundError} 如果依賴未註冊
 *
 * @example
 * ```typescript
 * import { resolveDependency } from '~/game-client/adapter/di/resolver'
 * import { TOKENS } from '~/game-client/adapter/di/tokens'
 * import type { SendCommandPort } from '~/game-client/application/ports/output'
 *
 * const apiClient = resolveDependency<SendCommandPort>(TOKENS.SendCommandPort)
 * await apiClient.leaveGame(gameId)
 * ```
 */
export function resolveDependency<T>(token: symbol): T {
  try {
    return container.resolve<T>(token)
  } catch (error) {
    // 保留錯誤類型檢查以便於除錯
    if ((error as DependencyNotFoundError).name === 'DependencyNotFoundError') {
      // 可在此加入除錯資訊
    }
    throw error
  }
}

/**
 * 從 DI Container 解析可選依賴
 *
 * @template T - 依賴的型別
 * @param token - Symbol token
 * @returns 解析的依賴實例，如果未註冊則返回 null
 *
 * @example
 * ```typescript
 * import { tryResolveDependency } from '~/game-client/adapter/di/resolver'
 * import { TOKENS } from '~/game-client/adapter/di/tokens'
 *
 * const optionalFeature = tryResolveDependency<FeaturePort>(TOKENS.OptionalFeature)
 * if (optionalFeature) {
 *   optionalFeature.doSomething()
 * }
 * ```
 */
export function tryResolveDependency<T>(token: symbol): T | null {
  try {
    return container.resolve<T>(token)
  } catch (error) {
    if ((error as DependencyNotFoundError).name === 'DependencyNotFoundError') {
      return null
    }
    throw error
  }
}

/**
 * @deprecated 使用 resolveDependency 代替。
 * 保留此別名以便於漸進式遷移。
 */
export const useDependency = resolveDependency

/**
 * @deprecated 使用 tryResolveDependency 代替。
 * 保留此別名以便於漸進式遷移。
 */
export const useOptionalDependency = tryResolveDependency
