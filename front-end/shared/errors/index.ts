/**
 * 共用錯誤類別匯出
 *
 * @description
 * 技術層級錯誤類別，可在整個專案任何地方使用。
 * 不包含業務邏輯，純粹處理 HTTP 通訊相關錯誤。
 *
 * @module shared/errors
 */

// 錯誤基類
export { HttpError } from './HttpError'

// 具體錯誤類別
export { NetworkError } from './NetworkError'
export { TimeoutError } from './TimeoutError'
export { ServerError } from './ServerError'

// 錯誤處理器
export { handleHttpError, isHttpError } from './HttpErrorHandler'
export type { HttpErrorHandleResult } from './HttpErrorHandler'
