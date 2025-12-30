/**
 * Round Operations - Domain Layer
 *
 * @description
 * 回合操作函數（打牌、選擇、決策）。
 * 純 TypeScript，無框架依賴。
 *
 * @module server/domain/round/roundOperations
 */

import type { FlowState, CardPlay, Yaku } from '#shared/contracts'
import type { Round, PlayerRoundState } from './round'
import type { KoiStatus } from './koiStatus'
import { applyKoiKoi } from './koiStatus'
import { getPlayerDepository, getOpponentId } from './roundQueries'
import {
  analyzeMatch,
  executeCaptureFromMatch,
  removeFromField,
  addToField,
} from '../services/matchingService'
import type { CardSelection } from '#shared/contracts'

// ============================================================
// Turn Operation Result Types
// ============================================================

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
// Internal Helper Functions
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
        matched_cards: [],
      }
      updatedField = addToField(round.field, cardId)
      capturedCards = []
      break

    case 'SINGLE_MATCH':
      // 單配對，自動捕獲
      capturedCards = executeCaptureFromMatch(cardId, handMatchResult.target, handMatchResult)
      handCardPlay = {
        played_card: cardId,
        matched_cards: [handMatchResult.target],
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
        matched_cards: [handTargetCardId],
      }
      updatedField = removeFromField(round.field, capturedCards)
      break

    case 'TRIPLE_MATCH':
      // 三重配對，捕獲全部 4 張（1 手牌 + 3 場牌）
      capturedCards = executeCaptureFromMatch(cardId, null, handMatchResult)
      handCardPlay = {
        played_card: cardId,
        matched_cards: [...handMatchResult.targets],  // 3 張場牌
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
        matched_cards: [],
      }
      finalField = addToField(updatedField, drawnCard)
      break

    case 'SINGLE_MATCH':
      // 單配對，自動捕獲
      drawCapturedCards = executeCaptureFromMatch(drawnCard, drawMatchResult.target, drawMatchResult)
      drawCardPlay = {
        played_card: drawnCard,
        matched_cards: [drawMatchResult.target],
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
      // 三重配對，捕獲全部（1 張翻牌 + 3 張場牌）
      drawCapturedCards = executeCaptureFromMatch(drawnCard, null, drawMatchResult)
      drawCardPlay = {
        played_card: drawnCard,
        matched_cards: [...drawMatchResult.targets],  // 3 張場牌
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
  }

  const drawCardPlay: CardPlay = {
    played_card: drawnCard,
    matched_cards: [targetCardId],
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
      pendingDecision: null, // 清除決策狀態
    })

    return {
      updatedRound,
      decision: 'KOI_KOI',
      updatedKoiStatus: updatedStatus,
    }
  } else {
    // END_ROUND - 局結束，由外部處理計分
    // Round 狀態不變（pendingDecision 保留，因為局即將結束）
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
 * @param activeYaku - 所有有效役種
 * @returns 更新後的 Round
 */
export function setAwaitingDecision(round: Round, activeYaku: readonly Yaku[]): Round {
  return Object.freeze({
    ...round,
    flowState: 'AWAITING_DECISION' as FlowState,
    pendingDecision: Object.freeze({
      activeYaku,
    }),
  })
}
