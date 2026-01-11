/**
 * Abort Module - 可取消操作相關工具
 *
 * @description
 * 提供統一的取消機制，使用 Web 標準 AbortController/AbortSignal。
 *
 * @module user-interface/adapter/abort
 */

// Core implementations
export { OperationSessionManager } from './OperationSessionManager'
export { delay, waitForLayout } from './AbortableDelay'
export { useAbortableMotion, type UseAbortableMotionReturn } from './useAbortableMotion'

// Port Adapters
export { OperationSessionPortAdapter } from './OperationSessionPortAdapter'
export { DelayPortAdapter } from './DelayPortAdapter'
export { LayoutPortAdapter } from './LayoutPortAdapter'
