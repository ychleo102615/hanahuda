/**
 * FlowState Transitions - Domain Module
 *
 * @description
 * 定義 FlowState 狀態機的有效轉換路徑。
 * 確保遊戲流程符合規則。
 *
 * @module server/domain/round/flowStateTransitions
 */

import type { FlowState } from '~/shared/contracts'

/**
 * 觸發狀態轉換的動作
 */
export type FlowAction =
  | 'PLAY_HAND_CARD'           // 打出手牌
  | 'DRAW_CARD'                // 從牌堆翻牌
  | 'SELECT_TARGET'            // 選擇配對目標
  | 'YAKU_FORMED'              // 形成役種
  | 'DECIDE_KOI_KOI'           // 選擇 KOI_KOI
  | 'DECIDE_END_ROUND'         // 選擇 END_ROUND
  | 'TURN_COMPLETE'            // 回合完成（換人）
  | 'DOUBLE_MATCH_ON_DRAW'     // 翻牌時雙重配對

/**
 * 狀態轉換結果
 */
export type TransitionResult =
  | { valid: true; nextState: FlowState }
  | { valid: false; reason: string }

/**
 * 狀態轉換規則表
 *
 * 定義每個狀態下，各個動作可以轉換到的目標狀態。
 */
const TRANSITION_RULES: Record<
  FlowState,
  Partial<Record<FlowAction, FlowState | FlowState[]>>
> = {
  AWAITING_HAND_PLAY: {
    // 打出手牌後，進入翻牌階段（由 Round 內部處理）
    // 翻牌後可能：
    //   - 雙重配對 → AWAITING_SELECTION
    //   - 形成役種 → AWAITING_DECISION
    //   - 無事件 → 回合結束，換人 → AWAITING_HAND_PLAY
    DOUBLE_MATCH_ON_DRAW: 'AWAITING_SELECTION',
    YAKU_FORMED: 'AWAITING_DECISION',
    TURN_COMPLETE: 'AWAITING_HAND_PLAY',
  },

  AWAITING_SELECTION: {
    // 選擇配對目標後：
    //   - 形成役種 → AWAITING_DECISION
    //   - 無事件 → 回合結束，換人 → AWAITING_HAND_PLAY
    YAKU_FORMED: 'AWAITING_DECISION',
    TURN_COMPLETE: 'AWAITING_HAND_PLAY',
  },

  AWAITING_DECISION: {
    // Koi-Koi 決策後：
    //   - KOI_KOI → 繼續遊戲，換人 → AWAITING_HAND_PLAY
    //   - END_ROUND → 局結束（由外部處理）
    DECIDE_KOI_KOI: 'AWAITING_HAND_PLAY',
    // DECIDE_END_ROUND 不改變 FlowState，而是結束局
  },
}

/**
 * 驗證狀態轉換是否合法
 *
 * @param currentState - 當前狀態
 * @param action - 要執行的動作
 * @returns 轉換結果
 */
export function validateTransition(
  currentState: FlowState,
  action: FlowAction
): TransitionResult {
  const rules = TRANSITION_RULES[currentState]
  const nextState = rules[action]

  if (nextState === undefined) {
    return {
      valid: false,
      reason: `Invalid action '${action}' for state '${currentState}'`,
    }
  }

  // 如果有多個可能的目標狀態，返回第一個
  const targetState = Array.isArray(nextState) ? nextState[0] : nextState

  if (targetState === undefined) {
    return {
      valid: false,
      reason: `No valid target state for action '${action}' in state '${currentState}'`,
    }
  }

  return {
    valid: true,
    nextState: targetState,
  }
}

/**
 * 取得狀態的允許動作列表
 *
 * @param state - 當前狀態
 * @returns 允許的動作列表
 */
export function getAllowedActions(state: FlowState): readonly FlowAction[] {
  const rules = TRANSITION_RULES[state]
  return Object.freeze(Object.keys(rules) as FlowAction[])
}

/**
 * 檢查動作是否允許
 *
 * @param currentState - 當前狀態
 * @param action - 要檢查的動作
 * @returns 是否允許
 */
export function isActionAllowed(
  currentState: FlowState,
  action: FlowAction
): boolean {
  const rules = TRANSITION_RULES[currentState]
  return action in rules
}

/**
 * 取得下一個狀態（不驗證）
 *
 * @param currentState - 當前狀態
 * @param action - 動作
 * @returns 下一個狀態，如果不允許則返回 undefined
 */
export function getNextState(
  currentState: FlowState,
  action: FlowAction
): FlowState | undefined {
  const rules = TRANSITION_RULES[currentState]
  const nextState = rules[action]

  if (nextState === undefined) {
    return undefined
  }

  return Array.isArray(nextState) ? nextState[0] : nextState
}

/**
 * 狀態轉換錯誤
 */
export class FlowStateTransitionError extends Error {
  constructor(
    public readonly currentState: FlowState,
    public readonly action: FlowAction,
    public readonly reason: string
  ) {
    super(`FlowState transition error: ${reason}`)
    this.name = 'FlowStateTransitionError'
  }
}

/**
 * 執行狀態轉換（帶驗證）
 *
 * @param currentState - 當前狀態
 * @param action - 要執行的動作
 * @returns 下一個狀態
 * @throws FlowStateTransitionError 如果轉換不合法
 */
export function transition(
  currentState: FlowState,
  action: FlowAction
): FlowState {
  const result = validateTransition(currentState, action)

  if (!result.valid) {
    throw new FlowStateTransitionError(currentState, action, result.reason)
  }

  return result.nextState
}
