/**
 * useDependency Composable
 *
 * Vue Composition API 風格的依賴注入封裝，用於從 DI Container 解析依賴。
 *
 * 使用此 composable 而非直接調用 container.resolve() 的理由：
 * 1. 保持 Vue Composition API 的一致性（use* 命名規範）
 * 2. 提供更好的錯誤訊息
 * 3. 未來可擴展（如 debug mode, lazy loading 等）
 *
 * @module useDependency
 */

import { container } from '../di/container'
import type { DependencyNotFoundError } from '../di/container'

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
 * import { useDependency } from '~/user-interface/adapter/composables/useDependency'
 * import { TOKENS } from '~/user-interface/adapter/di/tokens'
 * import type { SendCommandPort } from '~/user-interface/application/ports/output'
 *
 * // 在 Vue 組件或 composable 中
 * const apiClient = useDependency<SendCommandPort>(TOKENS.SendCommandPort)
 * await apiClient.leaveGame(gameId)
 * ```
 */
export function useDependency<T>(token: symbol): T {
  try {
    return container.resolve<T>(token)
  } catch (error) {
    // 提供更友善的錯誤訊息
    if ((error as DependencyNotFoundError).name === 'DependencyNotFoundError') {
      console.error(
        `[useDependency] 依賴未註冊: ${token.toString()}\n` +
        `請確認此依賴已在 registry.ts 中註冊。\n` +
        `當前遊戲模式: ${sessionStorage.getItem('gameMode') || 'unknown'}`
      )
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
 * const optionalFeature = useOptionalDependency<FeaturePort>(TOKENS.OptionalFeature)
 * if (optionalFeature) {
 *   optionalFeature.doSomething()
 * }
 * ```
 */
export function useOptionalDependency<T>(token: symbol): T | null {
  try {
    return container.resolve<T>(token)
  } catch (error) {
    if ((error as DependencyNotFoundError).name === 'DependencyNotFoundError') {
      return null
    }
    throw error
  }
}
