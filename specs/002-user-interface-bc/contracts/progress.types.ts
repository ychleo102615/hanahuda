/**
 * Game Progress Type Definitions
 *
 * 遊戲進度相關型別定義
 * 來源: doc/frontend/user-interface/domain.md - 遊戲進度計算
 */

/**
 * 優勢狀態
 */
export type AdvantageStatus = 'LEADING' | 'TIED' | 'BEHIND'

/**
 * 策略建議
 */
export type StrategyType = 'AGGRESSIVE' | 'BALANCED' | 'DEFENSIVE'

/**
 * 分數差距分析結果
 *
 * 包含分數差距、優勢狀態與策略建議，三者具業務邏輯關聯
 */
export interface ScoreGapAnalysis {
  /** 分數差距（正數 = 領先，負數 = 落後） */
  readonly gap: number
  /** 優勢狀態 */
  readonly advantage: AdvantageStatus
  /** 策略建議 */
  readonly strategy: StrategyType
}
