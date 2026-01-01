/**
 * Backend DI Module
 *
 * @description
 * 匯出後端依賴注入相關的類別和常數。
 * 此目錄位於 server/lib/ 而非 server/utils/，
 * 避免 Nitro auto-import 重複掃描警告。
 *
 * @module server/lib/di
 */

export { DIContainer, DependencyNotFoundError } from './DIContainer'
export type { DependencyFactory, DependencyOptions } from './DIContainer'
export { BACKEND_TOKENS } from './tokens'
export type { BackendTokenKey, BackendToken } from './tokens'
