/**
 * Opponent BC - Domain Types
 *
 * @description
 * Opponent BC 的 Domain 層型別定義。
 *
 * 注意：AiStrategyType 從 core-game 的 JoinGameAsAiInputPort import，
 * 因為 core-game 是介面提供者，定義了哪些策略類型是有效的。
 *
 * @module server/opponent/domain/types
 */

/**
 * 訂閱取消函數
 */
export type Unsubscribe = () => void
