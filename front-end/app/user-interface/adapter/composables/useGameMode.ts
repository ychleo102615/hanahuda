/**
 * useGameMode - 遊戲模式 Composable
 *
 * @description
 * 單一真相來源：從 Nuxt runtimeConfig 讀取遊戲模式。
 * 模式在編譯/啟動時由 .env 決定，運行時不可變更。
 *
 * 使用方式：
 * - 在 .env 中設定 NUXT_PUBLIC_GAME_MODE=backend|mock|local
 * - 預設值為 'backend'
 *
 * @module user-interface/adapter/composables/useGameMode
 */

export type GameMode = 'backend' | 'mock' | 'local'

const VALID_MODES: GameMode[] = ['backend', 'mock', 'local']

/**
 * 取得遊戲模式
 *
 * @returns 遊戲模式（'backend' | 'mock' | 'local'）
 */
export function useGameMode(): GameMode {
  const config = useRuntimeConfig()
  const mode = config.public.gameMode as string

  // 驗證模式有效性
  if (!VALID_MODES.includes(mode as GameMode)) {
    console.warn(`[useGameMode] 無效的遊戲模式: ${mode}，使用預設 'backend'`)
    return 'backend'
  }

  return mode as GameMode
}
