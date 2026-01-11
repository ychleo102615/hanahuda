/**
 * ApiErrorHandler - 統一 API 錯誤處理器
 *
 * @description
 * 根據 API 錯誤類型決定處理策略：
 * - Toast 通知（可恢復錯誤、網路錯誤、超時）
 * - RedirectModal（session 失效、遊戲不存在、伺服器錯誤）
 *
 * 錯誤分類：
 * - 技術錯誤（NetworkError, TimeoutError, ServerError）：由 shared/errors 處理
 * - 應用錯誤（ApiError with errorCode）：由此 Adapter 根據策略處理
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
import { isHttpError, handleHttpError } from '#shared/errors'
import { ApiError, ValidationError } from './errors'
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
  const { notification, sessionContext, matchmakingState } = deps

  /**
   * 清理 session 狀態
   *
   * @description
   * 當遊戲無效時，清理所有 session 相關狀態。
   * 注意：gameId 由 Use Cases 透過 GameStatePort 管理，此處只清理 session 和 matchmaking 狀態。
   */
  function cleanupSession(): void {
    notification.cleanup()
    sessionContext.clearSession()
    matchmakingState.clearSession()
  }

  /**
   * 處理 ApiError（應用層錯誤）
   *
   * @description
   * 根據 errorCode 決定處理策略：
   * - TOAST：顯示 Toast 通知（可恢復錯誤）
   * - REDIRECT_HOME：顯示 RedirectModal 後導向首頁（session 失效）
   * - REDIRECT_LOBBY：顯示 RedirectModal 後導向大廳（遊戲不存在）
   * - ERROR_MODAL：顯示 RedirectModal 後導向大廳（伺服器錯誤）
   */
  function handleApiError(error: ApiError): boolean {
    const { errorCode, status, message } = error

    // 無 errorCode，根據 status 判斷
    if (!errorCode) {
      if (status >= 500) {
        cleanupSession()
        notification.showRedirectModal(message, 'lobby', 'Server Error')
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
        notification.showRedirectModal(displayMessage, 'home', 'Session Error')
        return true

      case 'REDIRECT_LOBBY':
        cleanupSession()
        notification.showRedirectModal(displayMessage, 'lobby', 'Game Error')
        return true

      case 'ERROR_MODAL':
        cleanupSession()
        notification.showRedirectModal(displayMessage, 'lobby', 'Server Error')
        return true

      default:
        // 未知策略，fallback 為 toast
        notification.showErrorMessage(displayMessage)
        return true
    }
  }

  /**
   * 處理技術錯誤（NetworkError, TimeoutError, ServerError）
   *
   * @description
   * 使用 shared/errors 的 handleHttpError 取得處理建議，
   * 然後根據 action 呼叫對應的 notification 方法。
   */
  function handleTechnicalError(error: unknown): boolean {
    const result = handleHttpError(error)

    if (!result.handled) {
      return false
    }

    switch (result.action) {
      case 'TOAST':
        notification.showErrorMessage(result.message)
        return true

      case 'MODAL':
        cleanupSession()
        notification.showRedirectModal(result.message, 'lobby', 'Server Error')
        return true

      default:
        notification.showErrorMessage(result.message)
        return true
    }
  }

  return {
    handle(error: unknown): boolean {
      // 1. 技術錯誤（NetworkError, TimeoutError, ServerError）
      //    使用 shared/errors 的 handleHttpError 處理
      if (isHttpError(error)) {
        return handleTechnicalError(error)
      }

      // 2. ApiError（應用層錯誤）：使用 errorCode 決定策略
      if (error instanceof ApiError) {
        return handleApiError(error)
      }

      // 3. ValidationError（舊版相容）：顯示 Toast
      if (error instanceof ValidationError) {
        notification.showErrorMessage(error.message)
        return true
      }

      // 未知錯誤，不處理
      return false
    },
  }
}
