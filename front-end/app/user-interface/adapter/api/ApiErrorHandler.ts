/**
 * ApiErrorHandler - 統一 API 錯誤處理器
 *
 * @description
 * 根據 API 錯誤類型決定處理策略：
 * - Toast 通知（可恢復錯誤）
 * - 重導向（session 失效或遊戲不存在）
 * - 錯誤 Modal（伺服器錯誤）
 *
 * 遵循 Clean Architecture：
 * - 位於 Adapter Layer
 * - 依賴 Application Layer 的 Port 介面
 * - 不直接依賴框架或 UI 元件
 *
 * @module user-interface/adapter/api/ApiErrorHandler
 */

import type { NotificationPort } from '../../application/ports/output/notification.port'
import type { NavigationPort } from '../../application/ports/output/navigation.port'
import type { SessionContextPort } from '../../application/ports/output/session-context.port'
import type { MatchmakingStatePort } from '../../application/ports/output/matchmaking-state.port'
import type { ErrorHandlerPort } from '../../application/ports/output/error-handler.port'
import {
  ApiError,
  NetworkError,
  ServerError,
  TimeoutError,
  ValidationError,
} from './errors'
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  ERROR_HANDLING_STRATEGY,
} from '#shared/constants/httpStatusCodes'

/**
 * ApiErrorHandler 依賴
 */
export interface ApiErrorHandlerDependencies {
  notification: NotificationPort
  navigation: NavigationPort
  sessionContext: SessionContextPort
  matchmakingState: MatchmakingStatePort
}

/**
 * ApiErrorHandler 介面
 *
 * @description
 * 繼承 ErrorHandlerPort，符合 Clean Architecture 依賴反轉原則。
 * Application Layer 的 Use Cases 依賴 ErrorHandlerPort（抽象），
 * 而此 Adapter 實作該介面。
 */
export interface ApiErrorHandler extends ErrorHandlerPort {
  // ErrorHandlerPort 已定義 handle(error: unknown): boolean
  // 此介面可擴展 Adapter 專用方法（若需要）
}

/**
 * 建立 ApiErrorHandler 實例
 *
 * @param deps - 依賴的 Port 實例
 * @returns ApiErrorHandler 實例
 */
export function createApiErrorHandler(deps: ApiErrorHandlerDependencies): ApiErrorHandler {
  const { notification, navigation, sessionContext, matchmakingState } = deps

  /**
   * 清理 session 狀態
   *
   * @description
   * 當遊戲無效時，清理所有 session 相關狀態。
   */
  function cleanupSession(): void {
    notification.cleanup()
    sessionContext.setGameId(null)
    matchmakingState.clearSession()
  }

  /**
   * 處理 ApiError
   */
  function handleApiError(error: ApiError): boolean {
    const { errorCode, status, message } = error

    // 無 errorCode，根據 status 判斷
    if (!errorCode) {
      if (status >= 500) {
        cleanupSession()
        notification.showGameErrorModal(message)
      } else {
        notification.showErrorMessage(message)
      }
      return true
    }

    const strategy = ERROR_HANDLING_STRATEGY[errorCode]
    const displayMessage = API_ERROR_MESSAGES[errorCode] || message

    switch (strategy) {
      case 'TOAST':
        // 429 Rate Limit 使用 warning，其他使用 error
        if (errorCode === API_ERROR_CODES.RATE_LIMIT_EXCEEDED) {
          notification.showWarningMessage(displayMessage)
        } else {
          notification.showErrorMessage(displayMessage)
        }
        return true

      case 'REDIRECT_HOME':
        cleanupSession()
        notification.showErrorMessage(displayMessage)
        navigation.navigateToHome()
        return true

      case 'REDIRECT_LOBBY':
        cleanupSession()
        notification.showInfoMessage(displayMessage)
        navigation.navigateToLobby()
        return true

      case 'ERROR_MODAL':
        cleanupSession()
        notification.showGameErrorModal(displayMessage)
        return true

      default:
        // 未知策略，fallback 為 toast
        notification.showErrorMessage(displayMessage)
        return true
    }
  }

  /**
   * 處理 ServerError（5xx）
   */
  function handleServerError(error: ServerError): boolean {
    cleanupSession()
    notification.showGameErrorModal(error.message)
    return true
  }

  return {
    handle(error: unknown): boolean {
      // 1. ApiError：使用 errorCode 決定策略
      if (error instanceof ApiError) {
        return handleApiError(error)
      }

      // 2. NetworkError：顯示 Toast
      if (error instanceof NetworkError) {
        notification.showErrorMessage('Network error. Please check your connection.')
        return true
      }

      // 3. TimeoutError：顯示 Toast
      if (error instanceof TimeoutError) {
        notification.showErrorMessage('Request timed out. Please try again.')
        return true
      }

      // 4. ServerError：顯示錯誤 Modal
      if (error instanceof ServerError) {
        return handleServerError(error)
      }

      // 5. ValidationError（舊版相容）：顯示 Toast
      if (error instanceof ValidationError) {
        notification.showErrorMessage(error.message)
        return true
      }

      // 未知錯誤，不處理
      return false
    },
  }
}
