/**
 * useTelegram Composable
 *
 * @description
 * Telegram Mini App 整合的 Composable。
 * 提供響應式狀態和便捷方法，讓元件可以輕鬆整合 Telegram 功能。
 *
 * 此 Composable 透過 DI Container 取得 TelegramAuthPort 和 TelegramSdkAdapter，
 * 遵循 CA 架構原則，不直接呼叫 API。
 *
 * @example
 * ```typescript
 * const {
 *   isTelegramEnv,
 *   isVerifying,
 *   isVerified,
 *   error,
 *   telegramUser,
 *   verify,
 *   haptic,
 * } = useTelegram()
 *
 * // 執行驗證
 * await verify()
 *
 * // Haptic Feedback
 * haptic.success()
 * ```
 */

import { ref, computed } from 'vue'
import { getTelegramAuthAdapter } from '~/game-client/adapter/api/TelegramAuthAdapter'
import { getTelegramSdkAdapter, type TelegramUserInfo } from '~/game-client/adapter/telegram/TelegramSdkAdapter'

// =============================================================================
// State
// =============================================================================

/** 是否正在驗證中 */
const isVerifying = ref(false)

/** 是否已驗證成功 */
const isVerified = ref(false)

/** 錯誤訊息 */
const error = ref<string | null>(null)

// =============================================================================
// Composable
// =============================================================================

export function useTelegram() {
  const nuxtApp = useNuxtApp()

  // 從 Plugin 取得環境資訊
  const telegramEnv = nuxtApp.$telegramEnv
  const telegramSdk = nuxtApp.$telegramSdk ?? getTelegramSdkAdapter()

  // 從 DI 取得 Auth Adapter
  const authAdapter = getTelegramAuthAdapter()

  // =========================================================================
  // Computed Properties
  // =========================================================================

  /** 是否在 Telegram 環境內 */
  const isTelegramEnv = computed(() => telegramEnv?.isInTelegram ?? false)

  /** Telegram 使用者資訊（僅供 UI 使用） */
  const telegramUser = computed<TelegramUserInfo | null>(() => {
    if (!isTelegramEnv.value) return null
    return telegramSdk.getUserInfo()
  })

  /** 色彩方案 */
  const colorScheme = computed(() => telegramEnv?.colorScheme ?? null)

  /** 是否應該顯示登出按鈕（非 Telegram 環境時顯示） */
  const shouldShowLogout = computed(() => !isTelegramEnv.value)

  // =========================================================================
  // Methods
  // =========================================================================

  /**
   * 執行 Telegram 認證
   *
   * @returns 是否驗證成功
   */
  async function verify(): Promise<boolean> {
    // 不在 Telegram 環境內
    if (!isTelegramEnv.value || !telegramEnv?.initData) {
      error.value = 'Not in Telegram environment'
      return false
    }

    // 已經驗證過
    if (isVerified.value) {
      return true
    }

    isVerifying.value = true
    error.value = null

    try {
      const result = await authAdapter.verify(telegramEnv.initData)

      if (result.success) {
        isVerified.value = true
        return true
      } else {
        error.value = result.error
        return false
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Verification failed'
      return false
    } finally {
      isVerifying.value = false
    }
  }

  /**
   * 重置驗證狀態（用於重新驗證）
   */
  function resetVerification(): void {
    isVerified.value = false
    error.value = null
  }

  // =========================================================================
  // Haptic Feedback
  // =========================================================================

  const haptic = {
    /** 輕觸回饋 */
    light: () => telegramSdk.impactFeedback('light'),
    /** 中等回饋 */
    medium: () => telegramSdk.impactFeedback('medium'),
    /** 重觸回饋 */
    heavy: () => telegramSdk.impactFeedback('heavy'),
    /** 成功回饋 */
    success: () => telegramSdk.successFeedback(),
    /** 錯誤回饋 */
    error: () => telegramSdk.errorFeedback(),
    /** 警告回饋 */
    warning: () => telegramSdk.warningFeedback(),
    /** 選擇變更回饋 */
    selection: () => telegramSdk.selectionFeedback(),
  }

  // =========================================================================
  // Dialog Methods
  // =========================================================================

  /**
   * 顯示 Alert 對話框
   */
  async function showAlert(message: string): Promise<void> {
    return telegramSdk.showAlert(message)
  }

  /**
   * 顯示 Confirm 對話框
   */
  async function showConfirm(message: string): Promise<boolean> {
    return telegramSdk.showConfirm(message)
  }

  /**
   * 關閉 Mini App
   */
  function close(): void {
    telegramSdk.close()
  }

  // =========================================================================
  // Return
  // =========================================================================

  return {
    // Environment
    isTelegramEnv,
    telegramUser,
    colorScheme,
    shouldShowLogout,

    // Verification State
    isVerifying: computed(() => isVerifying.value),
    isVerified: computed(() => isVerified.value),
    error: computed(() => error.value),

    // Methods
    verify,
    resetVerification,

    // Haptic Feedback
    haptic,

    // Dialogs
    showAlert,
    showConfirm,
    close,

    // SDK Adapter (for advanced usage)
    sdk: telegramSdk,
  }
}
