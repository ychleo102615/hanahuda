/**
 * Round Entity - Domain Layer
 *
 * @description
 * 代表一局遊戲狀態。追蹤場牌、牌堆、玩家手牌/獲得區，以及流程狀態。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/round/round
 */

import type { FlowState, CardPlay } from '#shared/contracts'
import type { KoiStatus } from './koiStatus'
import { createInitialKoiStatus, applyKoiKoi } from './koiStatus'
import type { DealResult } from '../services/deckService'
import { getCardMonth } from '../services/deckService'

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
  })
}

/**
 * 手四檢測結果
 */
export interface TeshiResult {
  readonly hasTeshi: boolean
  readonly month: number | null
}

/**
 * 檢測手四（手牌中有四張同月份牌）
 *
 * @param hand - 玩家手牌
 * @returns 手四檢測結果
 */
export function detectTeshi(hand: readonly string[]): TeshiResult {
  // 統計各月份牌數
  const monthCounts = new Map<number, number>()

  for (const cardId of hand) {
    const month = getCardMonth(cardId)
    const count = monthCounts.get(month) ?? 0
    monthCounts.set(month, count + 1)
  }

  // 找出有四張的月份
  for (const [month, count] of monthCounts.entries()) {
    if (count === 4) {
      return { hasTeshi: true, month }
    }
  }

  return { hasTeshi: false, month: null }
}

/**
 * 喰付檢測結果
 */
export interface KuttsukiResult {
  readonly hasKuttsuki: boolean
  readonly month: number | null
}

/**
 * 檢測喰付（場牌中有四張同月份牌）
 *
 * @param field - 場牌
 * @returns 喰付檢測結果
 */
export function detectKuttsuki(field: readonly string[]): KuttsukiResult {
  // 統計各月份牌數
  const monthCounts = new Map<number, number>()

  for (const cardId of field) {
    const month = getCardMonth(cardId)
    const count = monthCounts.get(month) ?? 0
    monthCounts.set(month, count + 1)
  }

  // 找出有四張的月份
  for (const [month, count] of monthCounts.entries()) {
    if (count === 4) {
      return { hasKuttsuki: true, month }
    }
  }

  return { hasKuttsuki: false, month: null }
}

/**
 * 取得玩家手牌
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns 玩家手牌（若找不到則回傳空陣列）
 */
export function getPlayerHand(round: Round, playerId: string): readonly string[] {
  const playerState = round.playerStates.find((ps) => ps.playerId === playerId)
  return playerState?.hand ?? []
}

/**
 * 取得玩家獲得區
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns 玩家獲得區（若找不到則回傳空陣列）
 */
export function getPlayerDepository(round: Round, playerId: string): readonly string[] {
  const playerState = round.playerStates.find((ps) => ps.playerId === playerId)
  return playerState?.depository ?? []
}

/**
 * 取得對手 ID
 *
 * @param round - 局狀態
 * @param playerId - 目前玩家 ID
 * @returns 對手 ID（若找不到則回傳 null）
 */
export function getOpponentId(round: Round, playerId: string): string | null {
  const opponent = round.playerStates.find((ps) => ps.playerId !== playerId)
  return opponent?.playerId ?? null
}

/**
 * 檢查玩家是否為目前行動玩家
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns 是否為目前行動玩家
 */
export function isActivePlayer(round: Round, playerId: string): boolean {
  return round.activePlayerId === playerId
}

// ============================================================
// Turn Operation Types
// ============================================================

import {
  analyzeMatch,
  executeCaptureFromMatch,
  removeFromField,
  addToField,
  type MatchResult,
} from '../services/matchingService'
import type { CardSelection, Yaku, YakuUpdate, YakuSetting } from '#shared/contracts'

/**
 * 打手牌結果
 */
export interface PlayHandCardResult {
  /** 更新後的 Round */
  readonly updatedRound: Round
  /** 手牌操作結果 */
  readonly handCardPlay: CardPlay
  /** 翻牌操作結果（若無需選擇） */
  readonly drawCardPlay: CardPlay | null
  /** 是否需要選擇配對目標 */
  readonly needsSelection: boolean
  /** 選擇所需資訊（若 needsSelection 為 true） */
  readonly selectionInfo: {
    readonly drawnCard: string
    readonly possibleTargets: readonly string[]
  } | null
}

/**
 * 翻牌結果
 */
export interface DrawResult {
  /** 更新後的 Round */
  readonly updatedRound: Round
  /** 翻出的卡片 */
  readonly drawnCard: string
  /** 翻牌操作結果（若無需選擇） */
  readonly drawCardPlay: CardPlay | null
  /** 可選配對目標（空陣列表示無需選擇或無配對） */
  readonly possibleTargets: readonly string[]
}

/**
 * 選擇配對結果
 */
export interface SelectTargetResult {
  /** 更新後的 Round */
  readonly updatedRound: Round
  /** 選擇結果 */
  readonly selection: CardSelection
  /** 翻牌操作結果 */
  readonly drawCardPlay: CardPlay
}

/**
 * 決策結果
 */
export interface DecisionResult {
  /** 更新後的 Round */
  readonly updatedRound: Round
  /** 決策類型 */
  readonly decision: 'KOI_KOI' | 'END_ROUND'
  /** 更新後的 KoiStatus（僅 KOI_KOI 時有值） */
  readonly updatedKoiStatus: KoiStatus | null
}

// ============================================================
// Round State Update Helpers
// ============================================================

/**
 * 更新玩家手牌
 */
function updatePlayerHand(
  playerStates: readonly PlayerRoundState[],
  playerId: string,
  newHand: readonly string[]
): readonly PlayerRoundState[] {
  return Object.freeze(
    playerStates.map((ps) =>
      ps.playerId === playerId
        ? Object.freeze({ ...ps, hand: Object.freeze(newHand) })
        : ps
    )
  )
}

/**
 * 更新玩家獲得區
 */
function updatePlayerDepository(
  playerStates: readonly PlayerRoundState[],
  playerId: string,
  newDepository: readonly string[]
): readonly PlayerRoundState[] {
  return Object.freeze(
    playerStates.map((ps) =>
      ps.playerId === playerId
        ? Object.freeze({ ...ps, depository: Object.freeze(newDepository) })
        : ps
    )
  )
}

/**
 * 從手牌移除卡片
 */
function removeCardFromHand(hand: readonly string[], cardId: string): readonly string[] {
  return Object.freeze(hand.filter((c) => c !== cardId))
}

/**
 * 從牌堆抽一張卡
 */
function drawOneCard(deck: readonly string[]): { card: string; remainingDeck: readonly string[] } | null {
  if (deck.length === 0) {
    return null
  }
  const card = deck[0]
  if (card === undefined) {
    return null
  }
  return {
    card,
    remainingDeck: Object.freeze(deck.slice(1)),
  }
}

/**
 * 將卡片加入獲得區
 */
function addToDepository(
  depository: readonly string[],
  cards: readonly string[]
): readonly string[] {
  return Object.freeze([...depository, ...cards])
}

/**
 * 更新 KoiStatus
 */
function updateKoiStatus(
  koiStatuses: readonly KoiStatus[],
  playerId: string,
  newStatus: KoiStatus
): readonly KoiStatus[] {
  return Object.freeze(
    koiStatuses.map((ks) => (ks.player_id === playerId ? newStatus : ks))
  )
}

// ============================================================
// Turn Operations
// ============================================================

/**
 * 打出手牌（包含翻牌）
 *
 * @param round - 目前局狀態
 * @param playerId - 玩家 ID
 * @param cardId - 要打出的卡片 ID
 * @param handTargetCardId - 手牌配對目標（雙重配對時必須指定）
 * @returns 操作結果
 * @throws Error 如果操作無效
 */
export function playHandCard(
  round: Round,
  playerId: string,
  cardId: string,
  handTargetCardId?: string
): PlayHandCardResult {
  // 驗證狀態
  if (round.flowState !== 'AWAITING_HAND_PLAY') {
    throw new Error(`Invalid flow state: ${round.flowState}. Expected AWAITING_HAND_PLAY.`)
  }

  if (round.activePlayerId !== playerId) {
    throw new Error(`Wrong player: ${playerId}. Expected ${round.activePlayerId}.`)
  }

  // 驗證手牌
  const playerState = round.playerStates.find((ps) => ps.playerId === playerId)
  if (!playerState) {
    throw new Error(`Player not found: ${playerId}`)
  }

  if (!playerState.hand.includes(cardId)) {
    throw new Error(`Card not in hand: ${cardId}`)
  }

  // 分析手牌配對情況
  const handMatchResult = analyzeMatch(cardId, round.field)

  // 處理手牌階段
  let handCardPlay: CardPlay
  let updatedField: readonly string[]
  let capturedCards: readonly string[]

  switch (handMatchResult.type) {
    case 'NO_MATCH':
      // 無配對，卡片加入場牌
      handCardPlay = {
        played_card: cardId,
        matched_card: null,
        captured_cards: [],
      }
      updatedField = addToField(round.field, cardId)
      capturedCards = []
      break

    case 'SINGLE_MATCH':
      // 單配對，自動捕獲
      capturedCards = executeCaptureFromMatch(cardId, handMatchResult.target, handMatchResult)
      handCardPlay = {
        played_card: cardId,
        matched_card: handMatchResult.target,
        captured_cards: capturedCards,
      }
      updatedField = removeFromField(round.field, capturedCards)
      break

    case 'DOUBLE_MATCH':
      // 雙重配對，需要指定目標
      if (!handTargetCardId) {
        throw new Error('Double match on hand card requires target selection')
      }
      if (!handMatchResult.targets.includes(handTargetCardId)) {
        throw new Error(`Invalid hand target: ${handTargetCardId}`)
      }
      capturedCards = executeCaptureFromMatch(cardId, handTargetCardId, handMatchResult)
      handCardPlay = {
        played_card: cardId,
        matched_card: handTargetCardId,
        captured_cards: capturedCards,
      }
      updatedField = removeFromField(round.field, capturedCards)
      break

    case 'TRIPLE_MATCH':
      // 三重配對，捕獲全部
      capturedCards = executeCaptureFromMatch(cardId, null, handMatchResult)
      const matchedCard = handMatchResult.targets[0]
      handCardPlay = {
        played_card: cardId,
        matched_card: matchedCard ?? null,
        captured_cards: capturedCards,
      }
      updatedField = removeFromField(round.field, capturedCards)
      break
  }

  // 更新手牌
  const updatedHand = removeCardFromHand(playerState.hand, cardId)
  let updatedPlayerStates = updatePlayerHand(round.playerStates, playerId, updatedHand)

  // 更新獲得區（手牌捕獲）
  if (capturedCards.length > 0) {
    const currentDepository = getPlayerDepository(round, playerId)
    const updatedDepository = addToDepository(currentDepository, capturedCards)
    updatedPlayerStates = updatePlayerDepository(updatedPlayerStates, playerId, updatedDepository)
  }

  // 翻牌階段
  const drawResult = drawOneCard(round.deck)
  if (!drawResult) {
    // 牌堆已空，回合結束（無翻牌）
    const finalRound: Round = Object.freeze({
      ...round,
      field: updatedField,
      deck: Object.freeze([]),
      playerStates: updatedPlayerStates,
      // flowState 維持，由外部判斷局結束
    })
    return {
      updatedRound: finalRound,
      handCardPlay,
      drawCardPlay: null,
      needsSelection: false,
      selectionInfo: null,
    }
  }

  const { card: drawnCard, remainingDeck } = drawResult

  // 分析翻牌配對情況
  const drawMatchResult = analyzeMatch(drawnCard, updatedField)

  // 處理翻牌階段
  let drawCardPlay: CardPlay | null = null
  let finalField: readonly string[]
  let drawCapturedCards: readonly string[] = []
  let needsSelection = false
  let selectionInfo: { drawnCard: string; possibleTargets: readonly string[] } | null = null

  switch (drawMatchResult.type) {
    case 'NO_MATCH':
      // 無配對，加入場牌
      drawCardPlay = {
        played_card: drawnCard,
        matched_card: null,
        captured_cards: [],
      }
      finalField = addToField(updatedField, drawnCard)
      break

    case 'SINGLE_MATCH':
      // 單配對，自動捕獲
      drawCapturedCards = executeCaptureFromMatch(drawnCard, drawMatchResult.target, drawMatchResult)
      drawCardPlay = {
        played_card: drawnCard,
        matched_card: drawMatchResult.target,
        captured_cards: drawCapturedCards,
      }
      finalField = removeFromField(updatedField, drawCapturedCards)
      break

    case 'DOUBLE_MATCH':
      // 雙重配對，需要玩家選擇
      needsSelection = true
      selectionInfo = {
        drawnCard,
        possibleTargets: drawMatchResult.targets,
      }
      drawCardPlay = null
      finalField = updatedField
      break

    case 'TRIPLE_MATCH':
      // 三重配對，捕獲全部
      drawCapturedCards = executeCaptureFromMatch(drawnCard, null, drawMatchResult)
      const drawMatchedCard = drawMatchResult.targets[0]
      drawCardPlay = {
        played_card: drawnCard,
        matched_card: drawMatchedCard ?? null,
        captured_cards: drawCapturedCards,
      }
      finalField = removeFromField(updatedField, drawCapturedCards)
      break
  }

  // 更新獲得區（翻牌捕獲）
  if (drawCapturedCards.length > 0) {
    const currentDepository = getPlayerDepository(
      { ...round, playerStates: updatedPlayerStates } as Round,
      playerId
    )
    const updatedDepository = addToDepository(currentDepository, drawCapturedCards)
    updatedPlayerStates = updatePlayerDepository(updatedPlayerStates, playerId, updatedDepository)
  }

  // 建立最終 Round
  const finalRound: Round = Object.freeze({
    ...round,
    field: finalField,
    deck: remainingDeck,
    playerStates: updatedPlayerStates,
    flowState: needsSelection ? ('AWAITING_SELECTION' as FlowState) : round.flowState,
    pendingSelection: needsSelection
      ? Object.freeze({
          drawnCard,
          possibleTargets: (drawMatchResult as { targets: readonly string[] }).targets,
          handCardPlay,
        })
      : null,
  })

  return {
    updatedRound: finalRound,
    handCardPlay,
    drawCardPlay,
    needsSelection,
    selectionInfo,
  }
}

/**
 * 選擇配對目標（雙重配對時）
 *
 * @param round - 目前局狀態
 * @param playerId - 玩家 ID
 * @param targetCardId - 選擇的配對目標
 * @returns 選擇結果
 * @throws Error 如果操作無效
 */
export function selectTarget(
  round: Round,
  playerId: string,
  targetCardId: string
): SelectTargetResult {
  // 驗證狀態
  if (round.flowState !== 'AWAITING_SELECTION') {
    throw new Error(`Invalid flow state: ${round.flowState}. Expected AWAITING_SELECTION.`)
  }

  if (round.activePlayerId !== playerId) {
    throw new Error(`Wrong player: ${playerId}. Expected ${round.activePlayerId}.`)
  }

  if (!round.pendingSelection) {
    throw new Error('No pending selection')
  }

  const { drawnCard, possibleTargets, handCardPlay } = round.pendingSelection

  if (!possibleTargets.includes(targetCardId)) {
    throw new Error(`Invalid target: ${targetCardId}. Valid targets: ${possibleTargets.join(', ')}`)
  }

  // 執行配對
  const capturedCards: readonly string[] = Object.freeze([drawnCard, targetCardId])

  const selection: CardSelection = {
    source_card: drawnCard,
    selected_target: targetCardId,
    captured_cards: capturedCards,
  }

  const drawCardPlay: CardPlay = {
    played_card: drawnCard,
    matched_card: targetCardId,
    captured_cards: capturedCards,
  }

  // 更新場牌
  const updatedField = removeFromField(round.field, capturedCards)

  // 更新獲得區
  const currentDepository = getPlayerDepository(round, playerId)
  const updatedDepository = addToDepository(currentDepository, capturedCards)
  const updatedPlayerStates = updatePlayerDepository(round.playerStates, playerId, updatedDepository)

  // 建立更新後的 Round（清除 pendingSelection，回到 AWAITING_HAND_PLAY 或等待役種判定）
  const updatedRound: Round = Object.freeze({
    ...round,
    field: updatedField,
    playerStates: updatedPlayerStates,
    flowState: 'AWAITING_HAND_PLAY' as FlowState, // 暫時設定，外部會根據役種判定調整
    pendingSelection: null,
  })

  return {
    updatedRound,
    selection,
    drawCardPlay,
  }
}

/**
 * 處理 Koi-Koi 決策
 *
 * @param round - 目前局狀態
 * @param playerId - 玩家 ID
 * @param decision - 決策（KOI_KOI 或 END_ROUND）
 * @returns 決策結果
 * @throws Error 如果操作無效
 */
export function handleDecision(
  round: Round,
  playerId: string,
  decision: 'KOI_KOI' | 'END_ROUND'
): DecisionResult {
  // 驗證狀態
  if (round.flowState !== 'AWAITING_DECISION') {
    throw new Error(`Invalid flow state: ${round.flowState}. Expected AWAITING_DECISION.`)
  }

  if (round.activePlayerId !== playerId) {
    throw new Error(`Wrong player: ${playerId}. Expected ${round.activePlayerId}.`)
  }

  if (decision === 'KOI_KOI') {
    // 找到玩家的 KoiStatus
    const currentStatus = round.koiStatuses.find((ks) => ks.player_id === playerId)
    if (!currentStatus) {
      throw new Error(`KoiStatus not found for player: ${playerId}`)
    }

    // 套用 KOI_KOI
    const updatedStatus = applyKoiKoi(currentStatus)
    const updatedKoiStatuses = updateKoiStatus(round.koiStatuses, playerId, updatedStatus)

    // 換到對手回合
    const opponentId = getOpponentId(round, playerId)
    if (!opponentId) {
      throw new Error('Opponent not found')
    }

    const updatedRound: Round = Object.freeze({
      ...round,
      flowState: 'AWAITING_HAND_PLAY' as FlowState,
      activePlayerId: opponentId,
      koiStatuses: updatedKoiStatuses,
    })

    return {
      updatedRound,
      decision: 'KOI_KOI',
      updatedKoiStatus: updatedStatus,
    }
  } else {
    // END_ROUND - 局結束，由外部處理計分
    // Round 狀態不變，外部會建立新局或結束遊戲
    return {
      updatedRound: round,
      decision: 'END_ROUND',
      updatedKoiStatus: null,
    }
  }
}

/**
 * 換到下一位玩家
 *
 * @param round - 目前局狀態
 * @returns 更新後的 Round
 */
export function advanceToNextPlayer(round: Round): Round {
  const opponentId = getOpponentId(round, round.activePlayerId)
  if (!opponentId) {
    throw new Error('Opponent not found')
  }

  return Object.freeze({
    ...round,
    flowState: 'AWAITING_HAND_PLAY' as FlowState,
    activePlayerId: opponentId,
  })
}

/**
 * 設定流程狀態為等待決策
 *
 * @param round - 目前局狀態
 * @returns 更新後的 Round
 */
export function setAwaitingDecision(round: Round): Round {
  return Object.freeze({
    ...round,
    flowState: 'AWAITING_DECISION' as FlowState,
  })
}

/**
 * 取得玩家的 KoiStatus
 *
 * @param round - 局狀態
 * @param playerId - 玩家 ID
 * @returns KoiStatus（若找不到則回傳 null）
 */
export function getPlayerKoiStatus(round: Round, playerId: string): KoiStatus | null {
  return round.koiStatuses.find((ks) => ks.player_id === playerId) ?? null
}

// ============================================================
// Round End Logic (Phase 6)
// ============================================================

import { detectYaku } from '../services/yakuDetectionService'
import { calculateScoreFromYaku } from '../services/scoringService'
import type { SpecialRuleResult } from '../services/specialRulesService'

/**
 * 局結束結果
 */
export interface RoundEndResult {
  /** 勝者 ID（平局時為 null） */
  readonly winnerId: string | null
  /** 成立的役種列表 */
  readonly yakuList: readonly Yaku[]
  /** 基礎分數 */
  readonly baseScore: number
  /** 最終分數 */
  readonly finalScore: number
  /** Koi-Koi 倍率 */
  readonly koiMultiplier: number
  /** 是否觸發 7 點翻倍 */
  readonly isDoubled: boolean
  /** 是否為平局 */
  readonly isDraw: boolean
  /** 觸發的特殊規則類型 */
  readonly specialRuleTriggered: 'TESHI' | 'FIELD_KUTTSUKI' | null
}

/**
 * 計算局結束結果（正常結束 - 玩家選擇 END_ROUND）
 *
 * @param round - 局狀態
 * @param winnerId - 勝者 ID（選擇 END_ROUND 的玩家）
 * @param yakuSettings - 役種設定
 * @returns 局結束結果
 */
export function calculateRoundEndResult(
  round: Round,
  winnerId: string,
  yakuSettings: readonly YakuSetting[]
): RoundEndResult {
  // 取得勝者的獲得區
  const depository = getPlayerDepository(round, winnerId)

  // 檢測役種
  const yakuList = detectYaku(depository, yakuSettings)

  // 取得 Koi-Koi 狀態
  const koiStatus = getPlayerKoiStatus(round, winnerId)

  // 計算分數
  const scoreResult = calculateScoreFromYaku(yakuList, koiStatus)

  return {
    winnerId,
    yakuList,
    baseScore: scoreResult.baseScore,
    finalScore: scoreResult.finalScore,
    koiMultiplier: scoreResult.koiMultiplier,
    isDoubled: scoreResult.isDoubled,
    isDraw: false,
    specialRuleTriggered: null,
  }
}

/**
 * 計算局結束結果（平局 - 牌堆耗盡無役種）
 *
 * @returns 平局結果
 */
export function calculateRoundDrawResult(): RoundEndResult {
  return {
    winnerId: null,
    yakuList: [],
    baseScore: 0,
    finalScore: 0,
    koiMultiplier: 1,
    isDoubled: false,
    isDraw: true,
    specialRuleTriggered: null,
  }
}

/**
 * 計算局結束結果（特殊規則觸發）
 *
 * @param specialRuleResult - 特殊規則檢測結果
 * @returns 局結束結果
 */
export function calculateSpecialRuleEndResult(
  specialRuleResult: SpecialRuleResult
): RoundEndResult {
  return {
    winnerId: specialRuleResult.winnerId,
    yakuList: [],
    baseScore: specialRuleResult.awardedPoints,
    finalScore: specialRuleResult.awardedPoints,
    koiMultiplier: 1,
    isDoubled: false,
    isDraw: specialRuleResult.winnerId === null,
    specialRuleTriggered: specialRuleResult.type,
  }
}
