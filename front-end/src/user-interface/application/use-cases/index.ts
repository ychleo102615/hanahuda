/**
 * Application Layer Use Cases
 *
 * @description
 * 匯出所有 Application Layer Use Cases，包含玩家操作和事件處理器。
 *
 * 分類：
 * - Player Operations (3): 玩家打牌、選擇配對、Koi-Koi 決策
 * - Event Handlers (13): 處理後端推送的 SSE 遊戲事件
 *
 * 使用方式：
 * ```typescript
 * // 匯入所有 Use Cases
 * import * as UseCases from '@/user-interface/application/use-cases'
 *
 * // 或匯入特定 Use Case
 * import { PlayHandCardUseCase } from '@/user-interface/application/use-cases'
 * ```
 *
 * @see specs/003-ui-application-layer/spec.md
 */

// 匯出所有玩家操作 Use Cases
export * from './player-operations'

// 匯出所有事件處理器 Use Cases
export * from './event-handlers'
