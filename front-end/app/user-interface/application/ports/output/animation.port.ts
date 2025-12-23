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

// ========================================
// 卡片操作動畫介面（高階 API）
// ========================================

/**
 * 卡片操作動畫參數（用於 playCardPlaySequence）
 *
 * @description
 * 封裝手牌操作的完整資訊，Adapter 根據 matchedCard 是否存在
 * 自動選擇有配對/無配對的動畫流程。
 */
export interface CardPlayAnimationParams {
  /** 打出的卡片 ID */
  readonly playedCard: string
  /** 配對的場牌 ID（null 表示無配對） */
  readonly matchedCard: string | null
  /** 被捕獲的卡片列表（配對成功時） */
  readonly capturedCards: readonly string[]
  /** 是否為對手操作 */
  readonly isOpponent: boolean
  /** 卡片類型（用於決定獲得區分組） */
  readonly targetCardType: CardType
}

/**
 * 卡片操作動畫結果
 *
 * @description
 * 包含動畫執行後的資訊，供 Use Case 後續處理使用。
 */
export interface CardPlayAnimationResult {
  /** 是否有配對 */
  readonly hasMatch: boolean
  /** 配對位置（用於後續動畫，如翻牌配對） */
  readonly matchPosition: { x: number; y: number } | null
}

/**
 * 翻牌動畫參數（用於 playDrawCardSequence）
 *
 * @description
 * 封裝翻牌操作的完整資訊，包含從牌堆翻牌和可能的配對。
 */
export interface DrawCardAnimationParams {
  /** 翻出的卡片 ID */
  readonly drawnCard: string
  /** 配對的場牌 ID（null 表示無配對） */
  readonly matchedCard: string | null
  /** 被捕獲的卡片列表 */
  readonly capturedCards: readonly string[]
  /** 是否為對手操作 */
  readonly isOpponent: boolean
  /** 卡片類型 */
  readonly targetCardType: CardType
}

/**
 * 翻牌選擇後配對動畫參數（用於 playDrawnCardMatchSequence）
 *
 * @description
 * 用於 SelectionRequired 後的配對處理場景。
 * 此時翻出的牌已在場牌區（由 HandleSelectionRequiredUseCase 處理翻牌動畫），
 * 只需要處理「飛向配對目標 → 配對 → 轉移到獲得區」的動畫。
 */
export interface DrawnCardMatchAnimationParams {
  /** 翻出的卡片 ID（已在場牌區） */
  readonly drawnCard: string
  /** 配對的場牌 ID */
  readonly matchedCard: string
  /** 被捕獲的卡片列表 */
  readonly capturedCards: readonly string[]
  /** 是否為對手操作 */
  readonly isOpponent: boolean
  /** 卡片類型（用於決定獲得區分組） */
  readonly targetCardType: CardType
}

/**
 * 卡片操作狀態更新回調
 *
 * @description
 * 由 Use Case 提供，AnimationPortAdapter 在適當時機調用。
 * 這些回調負責更新 GameState，確保動畫和狀態更新的正確順序。
 *
 * 設計原則：
 * - Adapter 負責動畫時序編排
 * - Use Case 負責狀態更新邏輯
 * - 透過回調機制解耦兩者
 */
export interface CardPlayStateCallbacks {
  /**
   * 更新獲得區（在 fadeIn 動畫前調用）
   * @param capturedCards - 被捕獲的卡片 ID 列表
   */
  readonly onUpdateDepository: (capturedCards: string[]) => void

  /**
   * 移除場牌（在動畫完成後調用）
   * @param cardIds - 要移除的場牌 ID 列表
   */
  readonly onRemoveFieldCards: (cardIds: string[]) => void

  /**
   * 移除手牌（在動畫完成後調用）
   * @param cardId - 要移除的手牌 ID
   */
  readonly onRemoveHandCard: (cardId: string) => void

  /**
   * 新增場牌（無配對時，在動畫前調用）
   * @param cardIds - 要新增的場牌 ID 列表
   */
  readonly onAddFieldCards: (cardIds: string[]) => void
}

// ========================================
// 發牌動畫介面
// ========================================

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

  /**
   * 等待動畫系統準備就緒
   *
   * @description
   * 確保動畫系統已完全初始化（包括 Zone 註冊）。
   * 用於 RoundDealt 等需要在頁面載入後執行的動畫。
   *
   * @param requiredZones - 需要等待的 Zone 名稱列表
   * @param timeoutMs - 超時時間（毫秒），預設 3000ms
   * @returns Promise，當所有指定 Zone 已註冊時 resolve
   *
   * @example
   * ```typescript
   * // 等待遊戲頁面的 Zone 準備就緒
   * await animation.waitForReady(['deck', 'field', 'player-hand'])
   * // 開始發牌動畫
   * await animation.playDealAnimation(...)
   * ```
   */
  waitForReady(requiredZones: string[], timeoutMs?: number): Promise<void>

  // ========================================
  // 高階動畫方法（封裝完整動畫序列）
  // ========================================

  /**
   * 播放完整的手牌操作動畫序列
   *
   * @description
   * 根據 CardPlayAnimationParams 自動判斷並執行：
   * - 有配對：手牌飛向場牌 → pulse → fadeOut + fadeIn（獲得區）
   * - 無配對：手牌飛向場牌新位置
   *
   * 此方法封裝完整的動畫時序，包含：
   * 1. 動畫前的 hideCards 預處理
   * 2. 動畫執行
   * 3. 動畫間的無縫銜接（解決閃爍問題）
   * 4. 在適當時機調用 callbacks 更新狀態
   *
   * @param params - 卡片操作參數
   * @param callbacks - 狀態更新回調（由 Use Case 提供）
   * @returns 動畫結果（包含配對位置等資訊）
   *
   * @example
   * ```typescript
   * const result = await animation.playCardPlaySequence(
   *   {
   *     playedCard: '0101',
   *     matchedCard: '0102',
   *     capturedCards: ['0101', '0102'],
   *     isOpponent: false,
   *     targetCardType: 'BRIGHT',
   *   },
   *   {
   *     onUpdateDepository: (cards) => gameState.updateDepositoryCards(...),
   *     onRemoveFieldCards: (ids) => gameState.updateFieldCards(...),
   *     onRemoveHandCard: (id) => gameState.updateHandCards(...),
   *     onAddFieldCards: (ids) => gameState.updateFieldCards(...),
   *   }
   * )
   * ```
   */
  playCardPlaySequence(
    params: CardPlayAnimationParams,
    callbacks: CardPlayStateCallbacks
  ): Promise<CardPlayAnimationResult>

  /**
   * 播放完整的翻牌動畫序列
   *
   * @description
   * 執行翻牌階段的動畫：
   * 1. 從牌堆翻出卡片
   * 2. 如有配對：飛向配對目標 → pulse → fadeOut + fadeIn
   * 3. 如無配對：卡片留在場上
   *
   * @param params - 翻牌參數
   * @param callbacks - 狀態更新回調
   * @returns 動畫結果
   *
   * @example
   * ```typescript
   * await animation.playDrawCardSequence(
   *   {
   *     drawnCard: '0501',
   *     matchedCard: '0502',
   *     capturedCards: ['0501', '0502'],
   *     isOpponent: false,
   *     targetCardType: 'ANIMAL',
   *   },
   *   callbacks
   * )
   * ```
   */
  playDrawCardSequence(
    params: DrawCardAnimationParams,
    callbacks: CardPlayStateCallbacks
  ): Promise<CardPlayAnimationResult>

  /**
   * 播放翻牌選擇後的配對動畫序列
   *
   * @description
   * 用於 SelectionRequired 後的配對處理。
   * 此時翻出的牌已在場牌區（翻牌動畫已播放），
   * 只需要處理配對部分的動畫序列：
   * 1. 翻牌飛向配對目標
   * 2. 配對特效（pulse）
   * 3. 淡出 + 獲得區淡入（使用 group 避免閃爍）
   *
   * 使用 addGroup + pulseToFadeOut 效果，確保動畫無縫銜接。
   *
   * @param params - 配對參數（翻出的牌已在場上）
   * @param callbacks - 狀態更新回調
   * @returns Promise 完成後 resolve
   *
   * @example
   * ```typescript
   * // 在 HandleTurnProgressAfterSelectionUseCase 中使用
   * await animation.playDrawnCardMatchSequence(
   *   {
   *     drawnCard: '0231',      // 翻出的牌（已在場上）
   *     matchedCard: '0241',    // 配對目標
   *     capturedCards: ['0231', '0241'],
   *     isOpponent: false,
   *     targetCardType: 'PLAIN',
   *   },
   *   callbacks
   * )
   * ```
   */
  playDrawnCardMatchSequence(
    params: DrawnCardMatchAnimationParams,
    callbacks: CardPlayStateCallbacks
  ): Promise<void>
}
