/**
 * HandleTurnProgressAfterSelectionUseCase
 *
 * @description
 * 處理 TurnProgressAfterSelection 事件，處理玩家選擇配對目標後的回合進展。
 *
 * 前置條件：
 * - HandleSelectionRequiredUseCase 已執行，翻牌動畫已播放
 * - 玩家已從 possible_targets 中選擇配對目標
 *
 * 業務流程：
 * 1. 播放配對動畫（牌已翻開，只需配對效果）
 * 2. 若有新役種形成（yaku_update 非 null），記錄役種達成
 * 3. 更新 FlowStage
 *
 * @see specs/003-ui-application-layer/contracts/events.md#TurnProgressAfterSelectionEvent
 * @see specs/003-ui-application-layer/data-model.md#HandleTurnProgressAfterSelectionUseCase
 * @see specs/005-ui-animation-refactor/plan.md#AnimationPort
 */

import type { TurnProgressAfterSelectionEvent } from '#shared/contracts'
import type { GameStatePort, AnimationPort, NotificationPort } from '../../ports/output'
import type { CardPlayStateCallbacks } from '../../ports/output/animation.port'
import type { DomainFacade } from '../../types/domain-facade'
import type { HandleTurnProgressAfterSelectionPort, ExecuteOptions } from '../../ports/input'
import { AbortOperationError } from '../../types'
import { delay } from '../../../adapter/abort'
import { getYakuInfo } from '../../../domain/yaku-info'

export class HandleTurnProgressAfterSelectionUseCase
  implements HandleTurnProgressAfterSelectionPort
{
  constructor(
    private readonly gameState: GameStatePort,
    private readonly animation: AnimationPort,
    private readonly domainFacade: DomainFacade,
    private readonly notification: NotificationPort
  ) {}

  /**
   * 執行選擇後回合進展事件處理
   */
  execute(event: TurnProgressAfterSelectionEvent, options: ExecuteOptions): Promise<void> {
    return this.executeAsync(event, options.receivedAt)
  }

  /**
   * 非同步執行動畫和狀態更新
   */
  private async executeAsync(event: TurnProgressAfterSelectionEvent, receivedAt: number): Promise<void> {
    try {
      await this.executeAsyncCore(event, receivedAt)
    } catch (error) {
      if (error instanceof AbortOperationError) {
        return
      }
      throw error
    }
  }

  /**
   * 核心執行邏輯
   *
   * 關鍵設計：
   * 1. 提前更新 FlowStage → 觸發 watcher 清除橙色框
   * 2. 使用 playDrawnCardMatchSequence 高階 API 處理配對動畫（使用 group 避免閃爍）
   *
   * 視覺流程（用戶視角）：
   * - 翻牌飛向配對目標
   * - 配對特效（pulse）
   * - 配對的牌從場上淡出，獲得區淡入（同步執行，無閃爍）
   * - 剩餘場牌滑順地移動填補空位（FLIP 動畫）
   *
   * 階段：
   * 1. 清除 UI 狀態（解決配對提示殘留問題）
   * 2. 播放配對動畫序列（使用高階 API，自動處理狀態更新）
   * 3. 更新其他狀態（牌堆數量、役種記錄）
   * 4. 清理動畫層
   */
  private async executeAsyncCore(event: TurnProgressAfterSelectionEvent, receivedAt: number): Promise<void> {

    const localPlayerId = this.gameState.getLocalPlayerId()
    const isOpponent = event.player_id !== localPlayerId
    const opponentPlayerId = isOpponent ? event.player_id : 'opponent'

    const drawCardPlay = event.draw_card_play
    const capturedCards = drawCardPlay.captured_cards

    // === 階段 1：清除 UI 狀態（解決配對提示殘留問題）===
    // 提前更新 FlowStage 和清除 AWAITING_SELECTION 狀態
    // 這會觸發 PlayerHandZone watcher 退出場牌選擇模式，隱藏橙色框
    // 注意：setActivePlayer 延後到動畫完成後才執行，避免 TopInfoBar 在動畫期間突然變化
    this.gameState.setFlowStage(event.next_state.state_type)
    this.gameState.setDrawnCard(null)
    this.gameState.setPossibleTargetCardIds([])

    // === 階段 2：播放配對動畫序列 ===
    // 注意：翻牌動畫已在 HandleSelectionRequiredUseCase 中播放
    // 這裡使用 playDrawnCardMatchSequence 高階 API 處理配對部分
    if (drawCardPlay.matched_card && capturedCards.length > 0) {
      // 創建狀態更新回調（供 AnimationPortAdapter 在適當時機調用）
      const callbacks = this.createStateCallbacks(localPlayerId, opponentPlayerId, isOpponent)

      // 獲取卡片類型
      const firstCapturedCard = capturedCards[0]!
      const targetCardType = this.domainFacade.getCardTypeFromId(firstCapturedCard)

      // 使用高階 API 播放配對動畫（內部使用 group + pulseToFadeOut，無閃爍）
      await this.animation.playDrawnCardMatchSequence(
        {
          drawnCard: drawCardPlay.played_card,
          matchedCard: drawCardPlay.matched_card,
          capturedCards: [...capturedCards],
          isOpponent,
          targetCardType,
        },
        callbacks
      )

      // 等待 TransitionGroup FLIP 動畫完成（300ms + 50ms buffer = 350ms）
      // 讓剩餘場牌滑順地重新排列填補空位
      await delay(350)

    } else {
      // === 處理無配對的情況（翻牌已在場上，不需要額外處理）===
      // 注意：翻牌在 HandleSelectionRequiredUseCase 中已加入場牌
    }

    // === 階段 3：更新其他狀態 ===
    this.gameState.updateDeckRemaining(event.deck_remaining)

    // 若有新役種形成且為對手，同時顯示所有新形成的役種
    if (event.yaku_update && event.yaku_update.newly_formed_yaku.length > 0) {

      if (isOpponent) {
        const yakuList = event.yaku_update.newly_formed_yaku
          .map(yaku => {
            const yakuInfo = getYakuInfo(yaku.yaku_type)
            if (!yakuInfo) return null
            return {
              yakuType: yaku.yaku_type,
              yakuName: yakuInfo.name,
              yakuNameJa: yakuInfo.nameJa,
              category: yakuInfo.category,
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)

        if (yakuList.length > 0) {
          this.notification.showOpponentYakuAnnouncement(yakuList)
        }
      }
    }

    // === 階段 4：清理動畫層 ===
    this.animation.clearHiddenCards()

    // === 階段 5：更新活躍玩家（動畫完成後才切換，避免 TopInfoBar 在動畫期間變化）===
    this.gameState.setActivePlayer(event.next_state.active_player_id)

    // === 階段 6：啟動操作倒數（從事件接收時間計算，確保與後端同步）===
    const dt = Math.ceil((Date.now() - receivedAt) / 1000)
    this.notification.startCountdown(event.timeout_seconds - dt, 'ACTION')
  }

  /**
   * 創建狀態更新回調
   *
   * @description
   * 這些回調由 AnimationPortAdapter 在適當時機調用，
   * 確保動畫和狀態更新的正確順序。
   */
  private createStateCallbacks(
    localPlayerId: string,
    opponentPlayerId: string,
    isOpponent: boolean
  ): CardPlayStateCallbacks {
    return {
      onUpdateDepository: (capturedCards: string[]) => {
        const myDepository = [...this.gameState.getDepositoryCards(localPlayerId)]
        const opponentDepository = [...this.gameState.getDepositoryCards(opponentPlayerId)]

        if (isOpponent) {
          this.gameState.updateDepositoryCards(myDepository, [...opponentDepository, ...capturedCards])
        } else {
          this.gameState.updateDepositoryCards([...myDepository, ...capturedCards], opponentDepository)
        }
      },

      onRemoveFieldCards: (cardIds: string[]) => {
        const currentFieldCards = this.gameState.getFieldCards()
        const newFieldCards = currentFieldCards.filter(id => !cardIds.includes(id))
        this.gameState.updateFieldCards(newFieldCards)
      },

      onRemoveHandCard: (_cardId: string) => {
        // 翻牌配對不需要移除手牌（翻出的牌已在場牌區）
        // 此回調在此場景下不會被使用，但需要提供以符合介面
      },

      onAddFieldCards: (_cardIds: string[]) => {
        // 翻牌配對時牌已在場上，不需要新增
        // 此回調在此場景下不會被使用，但需要提供以符合介面
      },
    }
  }
}
