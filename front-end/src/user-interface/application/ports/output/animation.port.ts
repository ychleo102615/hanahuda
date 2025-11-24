/**
 * AnimationPort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責動畫效果的播放，所有方法返回 Promise 以支援 await。
 *
 * ⚠️ Clean Architecture 注意：
 * - Port 介面是純語意化的，Use Case 只表達意圖
 * - 不包含 Zone 註冊（那是 Adapter 層職責）
 * - 不依賴任何 DOM API 或框架
 *
 * 使用於：
 * - HandleRoundDealtUseCase (發牌動畫)
 * - HandleTurnCompletedUseCase (配對動畫)
 * - HandleTurnProgressAfterSelectionUseCase (配對動畫)
 *
 * @example
 * ```typescript
 * // Use Case 中使用
 * class HandleCardsMatchedUseCase {
 *   constructor(private animation: AnimationPort) {}
 *
 *   async execute(event: CardsMatchedEvent): Promise<void> {
 *     // 先播放動畫，再更新狀態
 *     await this.animation.playMatchAnimation(
 *       event.handCardId,
 *       event.fieldCardId
 *     )
 *     await this.animation.playToDepositoryAnimation(
 *       [event.handCardId, event.fieldCardId],
 *       event.cardType
 *     )
 *     // 動畫完成後再更新 UI 狀態
 *   }
 * }
 * ```
 */

import type { CardType } from '../../../domain/types'

/**
 * 發牌動畫參數
 *
 * @description
 * 包含發牌所需的資訊，Adapter 層會根據這些資訊計算實際動畫
 */
export interface DealAnimationParams {
  /** 場牌 ID 列表 */
  readonly fieldCards: readonly string[]
  /** 玩家手牌 ID 列表 */
  readonly playerHandCards: readonly string[]
  /** 對手手牌數量（不顯示具體牌面） */
  readonly opponentHandCount: number
  /** 玩家是否為莊家（決定發牌順序） */
  readonly isPlayerDealer: boolean
  /** 每張牌發完的回調（用於更新牌堆數量） */
  readonly onCardDealt?: () => void
}

/**
 * AnimationPort 介面
 *
 * @description
 * 動畫系統的 Application Layer 介面，提供可 await 的動畫 API。
 * Adapter 層實作時會內部處理位置計算和動畫執行。
 */
export interface AnimationPort {
  /**
   * 播放發牌動畫
   *
   * @description
   * 回合開始時，從牌堆發牌至場牌和手牌的動畫。
   * 包含 staggered timing（每張牌延遲發出）。
   *
   * @param params - 發牌參數
   * @returns Promise 完成後 resolve
   *
   * @example
   * ```typescript
   * await animation.playDealAnimation({
   *   fieldCards: ['0101', '0102', '0201', '0202'],
   *   playerHandCards: ['0301', '0302', '0401', '0402'],
   *   opponentHandCount: 8
   * })
   * ```
   */
  playDealAnimation(params: DealAnimationParams): Promise<void>

  /**
   * 播放手牌移動至場牌動畫
   *
   * @description
   * 玩家或對手打出手牌時，卡片從手牌區移動至場牌區。
   * 用於沒有配對的情況（直接丟到場上）。
   *
   * @param cardId - 卡片 ID
   * @param isOpponent - 是否為對手出牌（false = 玩家，true = 對手）
   * @returns Promise 完成後 resolve
   *
   * @example
   * ```typescript
   * // 玩家出牌
   * await animation.playCardToFieldAnimation('0101', false)
   * // 對手出牌
   * await animation.playCardToFieldAnimation('0201', true)
   * ```
   */
  playCardToFieldAnimation(cardId: string, isOpponent: boolean, targetCardId?: string): Promise<void>

  /**
   * 播放配對合併動畫
   *
   * @description
   * 配對成功時，手牌移動至場牌位置並產生合併效果。
   * 動畫順序：手牌移動 → 合併特效（縮放+發光）
   *
   * @param handCardId - 手牌 ID
   * @param fieldCardId - 場牌 ID
   * @returns Promise 完成後 resolve，包含場牌位置資訊
   *
   * @example
   * ```typescript
   * const pos = await animation.playMatchAnimation('0101', '0102')
   * // pos = { x: 100, y: 200 }
   * ```
   */
  playMatchAnimation(handCardId: string, fieldCardId: string): Promise<{ x: number; y: number } | null>

  /**
   * 播放移動至獲得區動畫
   *
   * @description
   * 配對成功後，配對的牌移動至玩家或對手獲得區的對應分組。
   * Adapter 層會根據 cardType 決定目標分組區域。
   *
   * @param cardIds - 配對的牌 ID 列表（通常 2 張）
   * @param targetType - 牌的類型，決定進入哪個分組
   * @param isOpponent - 是否為對手的獲得區（false = 玩家，true = 對手）
   * @param fromPosition - 可選，淡出動畫的起始位置（配對場牌位置）
   * @returns Promise 完成後 resolve
   *
   * @example
   * ```typescript
   * // 玩家獲得牌
   * await animation.playToDepositoryAnimation(['0101', '0102'], 'BRIGHT', false)
   * // 對手獲得牌
   * await animation.playToDepositoryAnimation(['0201', '0202'], 'ANIMAL', true)
   * ```
   */
  playToDepositoryAnimation(cardIds: string[], targetType: CardType, isOpponent: boolean, fromPosition?: { x: number; y: number }): Promise<void>

  /**
   * 播放翻牌動畫
   *
   * @description
   * 翻牌階段，從牌堆翻出一張牌的動畫。
   * 用於打完手牌後，從牌堆翻牌配對的流程。
   *
   * @param cardId - 翻出的牌 ID
   * @returns Promise 完成後 resolve
   *
   * @example
   * ```typescript
   * await animation.playFlipFromDeckAnimation('0501')
   * ```
   */
  playFlipFromDeckAnimation(cardId: string): Promise<void>

  /**
   * 中斷所有進行中的動畫
   *
   * @description
   * 用於重連恢復時，直接顯示最終狀態而不播放動畫。
   * 所有 pending 的 Promise 會立即 resolve。
   *
   * @example
   * ```typescript
   * // 重連時
   * animation.interrupt()
   * // 直接設定最終狀態
   * gameState.restoreGameState(snapshot)
   * ```
   */
  interrupt(): void

  /**
   * 查詢是否有動畫進行中
   *
   * @description
   * 用於判斷是否應阻止使用者操作。
   *
   * @returns 是否有動畫進行中
   *
   * @example
   * ```typescript
   * if (animation.isAnimating()) {
   *   // 阻止使用者操作
   *   return
   * }
   * ```
   */
  isAnimating(): boolean

  /**
   * 播放卡片在當前位置的淡入動畫（可同時淡出）
   *
   * @description
   * 用於狀態更新後，讓卡片在新位置（如獲得區）淡入顯示。
   * 如果提供 fadeOutPosition，會同時在該位置播放淡出動畫。
   * 應在更新 Vue 狀態後調用。
   *
   * @param cardIds - 要淡入的卡片 ID 列表
   * @param isOpponent - 是否為對手的獲得區
   * @param playedCardId - 打出的牌 ID（手牌或翻牌），淡出時會在上層顯示
   * @param fadeOutPosition - 可選，淡出動畫的位置（配對場牌位置）
   * @returns Promise 完成後 resolve
   *
   * @example
   * ```typescript
   * // 更新狀態後，同時淡出淡入
   * gameState.updateDepositoryCards(...)
   * await animation.playFadeInAtCurrentPosition(['0101', '0102'], false, '0101', { x: 100, y: 200 })
   * ```
   */
  playFadeInAtCurrentPosition(cardIds: string[], isOpponent: boolean, playedCardId: string, fadeOutPosition?: { x: number; y: number }): Promise<void>

  /**
   * 清除所有隱藏的卡片
   *
   * @description
   * 用於動畫完成且狀態更新後，讓卡片在新位置顯示。
   * 應在所有動畫完成並更新 Vue 狀態後調用。
   *
   * @example
   * ```typescript
   * // 動畫完成後
   * await animation.playToDepositoryAnimation(...)
   * // 更新狀態
   * gameState.updateFieldCards(...)
   * gameState.updateDepositoryCards(...)
   * // 清除隱藏，讓卡片在新位置顯示
   * animation.clearHiddenCards()
   * ```
   */
  clearHiddenCards(): void

  /**
   * 預先隱藏指定卡片
   *
   * @description
   * 用於在 Vue 狀態更新前預先隱藏卡片，避免新渲染的 DOM 元素閃爍。
   * 應在 updateDepository 等狀態更新前調用。
   *
   * @param cardIds - 要隱藏的卡片 ID 列表
   *
   * @example
   * ```typescript
   * // 預先隱藏即將出現在獲得區的卡片
   * animation.hideCards(['0101', '0102'])
   * // 然後更新狀態（新渲染的卡片會被隱藏）
   * gameState.updateDepositoryCards(...)
   * // 播放淡入動畫
   * await animation.playFadeInAtCurrentPosition(['0101', '0102'])
   * ```
   */
  hideCards(cardIds: string[]): void
}
