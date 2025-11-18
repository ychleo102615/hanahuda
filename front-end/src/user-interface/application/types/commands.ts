/**
 * 命令型別定義
 *
 * 參考: doc/shared/protocol.md#Commands
 *
 * @description
 * 這些命令由客戶端發送到伺服器，
 * 通過 SendCommandPort 執行。
 */

/**
 * TurnPlayHandCard 命令
 *
 * 參考: doc/shared/protocol.md#TurnPlayHandCard
 *
 * @description
 * 玩家打出手牌的命令。
 * - 若有配對目標，target_card_id 必須提供
 * - 若無配對或單一配對，target_card_id 可選
 */
export interface TurnPlayHandCard {
  readonly command_type: 'TurnPlayHandCard'
  readonly game_id: string
  readonly player_id: string
  readonly card_id: string
  readonly target_card_id?: string
}

/**
 * TurnSelectTarget 命令
 *
 * 參考: doc/shared/protocol.md#TurnSelectTarget
 *
 * @description
 * 玩家選擇配對目標的命令（雙重配對時）。
 */
export interface TurnSelectTarget {
  readonly command_type: 'TurnSelectTarget'
  readonly game_id: string
  readonly player_id: string
  readonly source_card_id: string
  readonly target_card_id: string
}

/**
 * RoundMakeDecision 命令
 *
 * 參考: doc/shared/protocol.md#RoundMakeDecision
 *
 * @description
 * 玩家做出 Koi-Koi 決策的命令。
 * - KOI_KOI: 繼續遊戲，倍率增加
 * - END_ROUND: 結束局，計算分數
 */
export interface RoundMakeDecision {
  readonly command_type: 'RoundMakeDecision'
  readonly game_id: string
  readonly player_id: string
  readonly decision: 'KOI_KOI' | 'END_ROUND'
}
