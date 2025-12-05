/**
 * Application Layer Types
 *
 * @description
 * 匯出 Application Layer 專屬的型別定義。
 * 前後端共用型別請從 #shared/contracts 導入。
 *
 * @example
 * ```typescript
 * // 前端專屬型別
 * import type { Result, DomainFacade } from '@/user-interface/application/types'
 *
 * // 共用契約
 * import type { FlowState, GameEvent } from '#shared/contracts'
 * ```
 */

// Result Type (前端 Use Case 用)
export type { Result } from './result'

// Domain Facade (前端 Domain Layer 介面)
export type { DomainFacade } from './domain-facade'
