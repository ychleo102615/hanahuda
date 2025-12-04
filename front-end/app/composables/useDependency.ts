/**
 * useDependency Composable
 *
 * @description
 * Vue 3 composable for resolving dependencies from the DI container.
 * Provides type-safe dependency injection for components.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { TOKENS } from '~/user-interface/adapter/di/tokens'
 * import type { PlayHandCardPort } from '~/user-interface/application/ports/input'
 *
 * const playHandCard = useDependency<PlayHandCardPort>(TOKENS.PlayHandCardPort)
 *
 * async function handleCardClick(cardId: string) {
 *   await playHandCard.execute({ handCardId: cardId })
 * }
 * </script>
 * ```
 */

import { container } from '~/user-interface/adapter/di/container'

/**
 * Resolve a dependency from the DI container
 *
 * @param token - Symbol token representing the dependency
 * @returns The resolved dependency instance
 * @throws Error if the dependency is not registered in the container
 */
export function useDependency<T>(token: symbol): T {
  if (!container.has(token)) {
    throw new Error(`[useDependency] Dependency not found: ${token.toString()}`)
  }

  return container.resolve<T>(token)
}
