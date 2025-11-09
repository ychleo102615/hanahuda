/**
 * Opponent Analysis Type Definitions
 *
 * 對手分析相關型別定義
 * 來源: specs/002-user-interface-bc/spec.md - FR-016
 */

/**
 * 威脅等級
 */
export type ThreatLevelType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/**
 * 威脅等級 Value Object
 *
 * 用於評估對手的威脅程度
 */
export interface ThreatLevel {
  /** 威脅等級 */
  readonly level: ThreatLevelType
  /** 威脅原因列表 */
  readonly reasons: readonly string[]
}

/**
 * 卡片分布統計
 *
 * 用於分析對手收集的牌型
 */
export interface CardDistribution {
  /** 光札數量 */
  readonly bright: number
  /** 種札數量 */
  readonly animal: number
  /** 短札數量 */
  readonly ribbon: number
  /** かす札數量 */
  readonly plain: number
}

/**
 * 對手役種分析結果
 */
export interface OpponentYakuAnalysis {
  /** 已形成的役種列表 */
  readonly formedYaku: readonly {
    yakuType: string
    basePoints: number
  }[]
  /** 可能形成的役種列表 */
  readonly possibleYaku: readonly {
    yakuType: string
    progress: number
    threat: 'LOW' | 'MEDIUM' | 'HIGH'
  }[]
}
