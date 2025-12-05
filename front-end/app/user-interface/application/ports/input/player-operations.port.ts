/**
 * Player Operations Input Ports
 *
 * @description
 * 由 Application Layer 定義並實作為 Use Cases，
 * 供 Adapter Layer 呼叫。
 *
 * 包含 3 個玩家操作 Input Ports：
 * - PlayHandCardPort
 * - SelectMatchTargetPort
 * - MakeKoiKoiDecisionPort
 */

import type { YakuScore } from '#shared/contracts'
import type { Result } from '../../types'

/**
 * PlayHandCardPort - Input Port
 *
 * @description
 * 處理玩家打出手牌的完整流程。
 *
 * 實作: PlayHandCardUseCase
 */
export interface PlayHandCardPort {
  /**
   * 執行打牌操作
   *
   * @param input - 打牌輸入參數
   * @returns 操作結果（成功/失敗）
   */
  execute(input: PlayHandCardInput): Result<PlayHandCardOutput>
}

/**
 * PlayHandCardInput - 打牌輸入參數
 */
export interface PlayHandCardInput {
  readonly cardId: string // 要打出的手牌 ID
  readonly handCards: string[] // 當前手牌列表
  readonly fieldCards: string[] // 當前場牌列表
  readonly targetCardId?: string // 指定的配對目標 ID（手牌確認模式使用）
}

/**
 * PlayHandCardOutput - 打牌輸出結果
 */
export interface PlayHandCardOutput {
  readonly needSelection: boolean // 是否需要選擇配對目標
  readonly possibleTargets?: string[] // 可選目標列表（多重配對時）
  readonly selectedTarget?: string | null // 選中的目標（單一配對時）
}

/**
 * SelectMatchTargetPort - Input Port
 *
 * @description
 * 處理玩家選擇配對目標。
 *
 * 實作: SelectMatchTargetUseCase
 */
export interface SelectMatchTargetPort {
  /**
   * 執行選擇配對目標操作
   *
   * @param input - 選擇輸入參數
   * @returns 操作結果（成功/失敗）
   */
  execute(input: SelectMatchTargetInput): Result<SelectMatchTargetOutput>
}

/**
 * SelectMatchTargetInput - 選擇配對目標輸入參數
 */
export interface SelectMatchTargetInput {
  readonly sourceCardId: string // 來源卡片 ID
  readonly targetCardId: string // 選擇的目標卡片 ID
  readonly possibleTargets: string[] // 可選目標列表
}

/**
 * SelectMatchTargetOutput - 選擇配對目標輸出結果
 */
export interface SelectMatchTargetOutput {
  readonly valid: boolean // 選擇是否合法
}

/**
 * MakeKoiKoiDecisionPort - Input Port
 *
 * @description
 * 處理 Koi-Koi 決策。
 *
 * 實作: MakeKoiKoiDecisionUseCase
 */
export interface MakeKoiKoiDecisionPort {
  /**
   * 執行 Koi-Koi 決策操作
   *
   * @param input - 決策輸入參數
   * @returns 操作結果（成功/失敗）
   */
  execute(input: MakeKoiKoiDecisionInput): Result<MakeKoiKoiDecisionOutput>
}

/**
 * MakeKoiKoiDecisionInput - Koi-Koi 決策輸入參數
 */
export interface MakeKoiKoiDecisionInput {
  readonly currentYaku: YakuScore[] // 當前役種列表
  readonly depositoryCards: string[] // 獲得區卡片
  readonly koiKoiMultiplier: number // 當前 Koi-Koi 倍率
  readonly decision: 'KOI_KOI' | 'END_ROUND' // 決策
}

/**
 * MakeKoiKoiDecisionOutput - Koi-Koi 決策輸出結果
 */
export interface MakeKoiKoiDecisionOutput {
  readonly decision: 'KOI_KOI' | 'END_ROUND' // 決策
  readonly currentScore: number // 當前分數
  readonly potentialScore?: number // 潛在分數（選擇繼續時）
}
