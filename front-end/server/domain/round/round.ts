/**
 * Round Entity - Domain Layer
 *
 * @description
 * 代表一局遊戲狀態。追蹤場牌、牌堆、玩家手牌/獲得區，以及流程狀態。
 * 純 TypeScript，無框架依賴。
 *
 * 注意：此檔案已拆分為多個模組，請優先從 index.ts 導入：
 * - roundQueries.ts: 查詢函數
 * - roundDetection.ts: 狀態偵測
 * - roundOperations.ts: 回合操作
 * - roundEnd.ts: 局結束邏輯
 *
 * @module server/domain/round/round
 */

import type { FlowState, CardPlay, RoundScoringData, RoundInstantEndData } from '#shared/contracts'
import type { RoundEndReason } from '#shared/contracts/errors'
import type { KoiStatus } from './koiStatus'
import { createInitialKoiStatus } from './koiStatus'
import type { DealResult } from '../services/deckService'

/**
 * 玩家局內狀態
 *
 * 追蹤玩家在一局內的手牌與獲得區
 */
export interface PlayerRoundState {
  readonly playerId: string
  readonly hand: readonly string[]
  readonly depository: readonly string[]
}

/**
 * 等待選擇配對的狀態
 *
 * 當翻牌與場上有多張同月份牌時，需要等待玩家選擇
 */
export interface PendingSelection {
  readonly drawnCard: string
  readonly possibleTargets: readonly string[]
  readonly handCardPlay: CardPlay
}

/**
 * 等待 Koi-Koi 決策的狀態
 *
 * 當玩家形成役種時，需要決定是否 Koi-Koi
 */
export interface PendingDecision {
  readonly activeYaku: readonly import('#shared/contracts').Yaku[]
}

/**
 * 回合結算資訊
 *
 * @description
 * 當 flowState === 'ROUND_ENDED' 時，此欄位記錄回合結束的詳細資訊。
 * 用於結算展示期間（局間階段），以及斷線重連時恢復 RoundEndedModal。
 *
 * 注意：此類型與 roundEnd.ts 中的 RoundEndResult 不同：
 * - RoundEndResult: 計算結果，包含 yakuList、koiMultiplier 等計算細節
 * - RoundSettlementInfo: 用於儲存在 Round 中，供快照和重連使用
 */
export interface RoundSettlementInfo {
  /** 結束原因 */
  readonly reason: RoundEndReason
  /** 獲勝者 ID（流局時為 null） */
  readonly winnerId: string | null
  /** 獲得分數 */
  readonly awardedPoints: number
  /** 計分資料（僅當 reason === 'SCORED' 時有值） */
  readonly scoringData?: RoundScoringData
  /** 特殊規則資料（僅當 reason 為 INSTANT_* 時有值） */
  readonly instantData?: RoundInstantEndData
  /** 結算開始時間（用於計算重連時的剩餘倒數秒數） */
  readonly endedAt: Date
  /** 總倒數秒數（用於計算重連時的剩餘秒數，undefined 表示最後一局不需要倒數） */
  readonly totalTimeoutSeconds?: number
}

/**
 * Round Entity
 *
 * 一局遊戲的完整狀態
 */
export interface Round {
  /** 莊家 ID */
  readonly dealerId: string
  /** 場牌 */
  readonly field: readonly string[]
  /** 剩餘牌堆 */
  readonly deck: readonly string[]
  /** 玩家狀態（手牌、獲得區） */
  readonly playerStates: readonly PlayerRoundState[]
  /** 目前流程狀態 */
  readonly flowState: FlowState
  /** 目前行動玩家 ID */
  readonly activePlayerId: string
  /** 各玩家的 Koi-Koi 狀態 */
  readonly koiStatuses: readonly KoiStatus[]
  /** 等待配對選擇（若有） */
  readonly pendingSelection: PendingSelection | null
  /** 等待 Koi-Koi 決策（若有） */
  readonly pendingDecision: PendingDecision | null
  /** 回合結算資訊（僅當 flowState === 'ROUND_ENDED' 時有值） */
  readonly settlementInfo?: RoundSettlementInfo
}

/**
 * 建立新局參數
 */
export interface CreateRoundParams {
  readonly dealerId: string
  readonly playerIds: readonly string[]
  readonly dealResult: DealResult
  readonly startingPlayerId: string
}

/**
 * 建立新局
 *
 * @param params - 建立局所需的參數
 * @returns 新建立的 Round 實體
 */
export function createRound(params: CreateRoundParams): Round {
  const { dealerId, playerIds, dealResult, startingPlayerId } = params

  // 建立玩家狀態
  const playerStates: PlayerRoundState[] = playerIds.map((playerId) => {
    const hand = dealResult.playerHands.get(playerId)
    if (!hand) {
      throw new Error(`No hand dealt for player ${playerId}`)
    }
    return Object.freeze({
      playerId,
      hand,
      depository: [] as readonly string[],
    })
  })

  // 建立初始 Koi-Koi 狀態
  const koiStatuses = playerIds.map((playerId) => createInitialKoiStatus(playerId))

  return Object.freeze({
    dealerId,
    field: dealResult.field,
    deck: dealResult.deck,
    playerStates: Object.freeze(playerStates),
    flowState: 'AWAITING_HAND_PLAY' as FlowState,
    activePlayerId: startingPlayerId,
    koiStatuses: Object.freeze(koiStatuses),
    pendingSelection: null,
    pendingDecision: null,
  })
}
