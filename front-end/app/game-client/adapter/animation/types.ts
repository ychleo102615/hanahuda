/**
 * Animation Types
 *
 * 定義所有動畫相關的型別
 *
 * @module game-client/adapter/animation/types
 * @version 2.0.0
 * @since 2025-11-21
 */

import type { CardType } from '../../domain/types'

// ============================================================================
// Zone Types (區域類型) - T003
// ============================================================================

/**
 * 基礎區域名稱
 */
export type BaseZoneName =
  | 'deck'                // 牌堆
  | 'field'               // 場牌區
  | 'player-hand'         // 玩家手牌
  | 'opponent-hand'       // 對手手牌
  | 'player-depository'   // 玩家獲得區
  | 'opponent-depository' // 對手獲得區

/**
 * 獲得區分組區域名稱
 */
export type DepositoryGroupZoneName =
  | `player-depository-${CardType}`
  | `opponent-depository-${CardType}`

/**
 * 區域名稱聯合型別
 *
 * 包含基礎區域和獲得區分組區域
 */
export type ZoneName = BaseZoneName | DepositoryGroupZoneName


// ============================================================================
// Position Types (位置類型) - T004
// ============================================================================

/**
 * 簡化的螢幕座標
 */
export interface Position {
  readonly x: number  // 螢幕 X 座標 (px)
  readonly y: number  // 螢幕 Y 座標 (px)
}

/**
 * 區域位置資訊
 *
 * 記錄各區域的螢幕座標，使用 DOMRect 提供完整位置資訊
 */
export interface ZonePosition {
  readonly zoneName: ZoneName
  readonly rect: DOMRect  // x, y, width, height, top, left, right, bottom
}

// ============================================================================
// Animation Types (動畫類型) - T005
// ============================================================================

/**
 * 動畫類型
 *
 * - DEAL_CARDS: 發牌動畫（回合開始）
 * - CARD_MOVE: 卡片移動動畫
 * - CARD_MERGE: 配對合併效果
 * - CARDS_TO_DEPOSITORY: 配對牌移動至獲得區
 */
export type AnimationType =
  | 'DEAL_CARDS'           // 發牌動畫
  | 'CARD_MOVE'            // 卡片移動動畫
  | 'CARD_MERGE'           // 配對合併效果
  | 'CARDS_TO_DEPOSITORY'  // 配對牌移動至獲得區

// ============================================================================
// Animation Params Types (動畫參數類型) - T006, T007
// ============================================================================

/**
 * 卡片移動動畫參數（重構版）
 *
 * 使用實際螢幕座標
 */
export interface CardMoveParams {
  readonly cardId: string
  readonly from: Position          // 起點螢幕座標
  readonly to: Position            // 終點螢幕座標
  readonly duration: number        // 動畫時長 (ms)
  readonly easing?: 'spring' | 'ease-out'  // 默認 spring
}

/**
 * 配對合併效果參數
 *
 * 動畫系統會透過 ZoneRegistry 查詢 fieldCardId 的位置作為合併位置
 */
export interface CardMergeParams {
  readonly handCardId: string      // 手牌 ID
  readonly fieldCardId: string     // 場牌 ID
  readonly duration: number        // 合併效果時長 (ms)
}

/**
 * 配對牌移動至獲得區參數
 *
 * 動畫系統會：
 * 1. 用合併位置（fieldCardId 位置）作為起點
 * 2. 用 ZoneRegistry 查詢 `${playerId}-depository-${targetCardType}` 作為終點區域
 */
export interface CardsToDepositoryParams {
  readonly cardIds: readonly [string, string]  // 配對的兩張牌
  readonly targetCardType: CardType            // 牌的類型，決定進入哪個分組
  readonly playerId: string                    // 哪個玩家的獲得區
  readonly duration: number                    // 動畫時長 (ms)
}

/**
 * 發牌動畫參數（高階 API 使用）
 */
export interface DealAnimationParams {
  readonly fieldCards: readonly string[]
  readonly playerHandCards: readonly string[]
  readonly opponentHandCount: number
}

/**
 * 發牌動畫參數（內部使用）
 *
 * 包含完整的卡片和位置資訊
 */
export interface DealCardsParams {
  readonly cards: ReadonlyArray<{
    readonly cardId: string
    readonly targetZone: ZoneName
    readonly targetIndex: number   // 在目標區域中的索引
  }>
  readonly delay: number           // 每張卡片延遲 (ms)
  readonly duration: number        // 單張動畫時長 (ms)
}


// ============================================================================
// Animation Params Union (動畫參數聯合型別)
// ============================================================================

/**
 * 動畫參數聯合型別
 */
export type AnimationParams =
  | DealCardsParams
  | CardMoveParams
  | CardMergeParams
  | CardsToDepositoryParams

// ============================================================================
// Animation Entity Types (動畫實體類型)
// ============================================================================

/**
 * 動畫狀態
 */
export type AnimationStatus =
  | 'pending'      // 等待執行
  | 'running'      // 執行中
  | 'completed'    // 已完成
  | 'interrupted'  // 已中斷

/**
 * 動畫實體
 */
export interface Animation {
  readonly id: string                  // UUID
  readonly type: AnimationType
  readonly params: AnimationParams
  status: AnimationStatus
  callback?: () => void                // 動畫完成後的回調（可在 enqueue 後設定）
}

// ============================================================================
// Animation State Types (動畫狀態類型)
// ============================================================================

/**
 * UI 層動畫狀態
 */
export interface AnimationUIState {
  readonly isAnimating: boolean              // 是否有動畫進行中
  readonly blockUserInput: boolean           // 是否阻止用戶操作
  readonly currentAnimationType: AnimationType | null
  readonly animationProgress: number         // 0-1
}

// ============================================================================
// Drag Types (拖曳類型) - 預留給 Phase 9
// ============================================================================

/**
 * 拖曳狀態
 */
export interface DragState {
  readonly isDragging: boolean
  readonly draggedCardId: string | null
  readonly currentPosition: Position | null
  readonly dropTargets: readonly DropTarget[]
}

/**
 * 放置目標
 */
export interface DropTarget {
  readonly zoneName: ZoneName
  readonly cardId: string        // 可配對的場牌 ID
  readonly position: Position
  readonly isValid: boolean      // 是否為有效放置目標
}

/**
 * 拖曳開始事件資料
 */
export interface DragStartPayload {
  readonly cardId: string
  readonly startPosition: Position
}

/**
 * 拖曳移動事件資料
 */
export interface DragMovePayload {
  readonly cardId: string
  readonly currentPosition: Position
  readonly nearestTarget: DropTarget | null
}

/**
 * 拖曳結束事件資料
 */
export interface DragEndPayload {
  readonly cardId: string
  readonly endPosition: Position
  readonly droppedTarget: DropTarget | null  // null = 無效放置
}

/**
 * 拖曳事件資料聯合型別
 */
export type DragEventPayload = DragStartPayload | DragMovePayload | DragEndPayload
