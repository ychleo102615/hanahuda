/**
 * 遊戲流程狀態
 *
 * 參考: doc/shared/protocol.md#FlowState
 *
 * @description
 * FlowState 定義了遊戲進行中的三種等待狀態：
 * - AWAITING_HAND_PLAY: 等待玩家打出手牌
 * - AWAITING_SELECTION: 等待玩家選擇配對目標（雙重配對時）
 * - AWAITING_DECISION: 等待玩家做出 Koi-Koi 決策
 */
export type FlowState =
  | 'AWAITING_HAND_PLAY'
  | 'AWAITING_SELECTION'
  | 'AWAITING_DECISION'

/**
 * FlowState 常數枚舉（用於程式碼可讀性）
 *
 * @example
 * ```typescript
 * const state: FlowState = FlowState.AWAITING_HAND_PLAY
 * ```
 */
export const FlowState = {
  AWAITING_HAND_PLAY: 'AWAITING_HAND_PLAY' as const,
  AWAITING_SELECTION: 'AWAITING_SELECTION' as const,
  AWAITING_DECISION: 'AWAITING_DECISION' as const,
} as const
