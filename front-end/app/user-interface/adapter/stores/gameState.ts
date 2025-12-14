/**
 * GameStateStore - Pinia Store
 *
 * @description
 * 管理遊戲核心狀態（與後端同步的狀態），實作 UIStatePort 介面。
 *
 * 職責:
 * - 儲存遊戲上下文 (gameId, players, ruleset)
 * - 管理流程狀態 (flowStage, activePlayerId)
 * - 管理牌面狀態 (fieldCards, handCards, depositories, deckRemaining)
 * - 管理分數與役種 (scores, yaku, koiKoiMultipliers)
 *
 * 特性:
 * - 參與快照恢復 (restoreGameState 完全覆蓋狀態)
 * - 不持久化 (所有狀態從 SSE 事件恢復)
 * - 單例模式 (整個應用程式生命週期只有一個實例)
 */

import { defineStore } from 'pinia'
import type { UIStatePort } from '../../application/ports/output/ui-state.port'
import type {
  FlowState,
  PlayerInfo,
  Ruleset,
  GameSnapshotRestore,
  YakuScore,
} from '#shared/contracts'
import { DEFAULT_TOTAL_DECK_CARDS } from '#shared/constants/roomTypes'
import type { DomainFacade } from '../../application/types/domain-facade'
import { container } from '../di/container'
import { TOKENS } from '../di/tokens'

/**
 * 獲得區分組資料結構
 *
 * 將獲得區卡片按類型分組，用於 UI 顯示。
 * 順序固定為：光牌 → 種牌 → 短冊 → かす
 *
 * @description
 * 此類型定義在 Adapter Layer，因為它是純粹用於 UI 資料準備的 View Model。
 */
export interface GroupedDepository {
  readonly BRIGHT: readonly string[]  // 光牌
  readonly ANIMAL: readonly string[]  // 種牌
  readonly RIBBON: readonly string[]  // 短冊
  readonly PLAIN: readonly string[]   // かす
}

/**
 * GameStateStore State 介面
 *
 * @note gameId 已移至 SessionContextPort 管理（單一真相來源）
 */
export interface GameStateStoreState {
  // 遊戲上下文
  // 注意：gameId 由 SessionContextPort 管理，不在此 store 中
  localPlayerId: string | null
  opponentPlayerId: string | null
  localPlayerName: string | null
  opponentPlayerName: string | null
  ruleset: Ruleset | null

  // 流程狀態
  flowStage: FlowState | null
  activePlayerId: string | null
  dealerId: string | null // 當前回合莊家

  // 牌面狀態
  fieldCards: string[] // 場上卡片 ID 列表
  myHandCards: string[] // 玩家手牌 ID 列表
  opponentHandCount: number // 對手手牌數量
  myDepository: string[] // 玩家已獲得牌列表
  opponentDepository: string[] // 對手已獲得牌列表
  deckRemaining: number // 牌堆剩餘數量
  possibleTargetCardIds: string[] // 翻牌後可選擇配對的場牌列表 (用於 AWAITING_SELECTION)
  drawnCard: string | null // 翻出的卡片 ID (用於 AWAITING_SELECTION 時的 source)

  // 分數與役種
  myScore: number
  opponentScore: number
  myYaku: YakuScore[]
  opponentYaku: YakuScore[]
  koiKoiMultipliers: Record<string, number>
}

/**
 * 回合狀態類型
 *
 * @description
 * 用於區分三種回合狀態：
 * - 'my-turn': 玩家回合
 * - 'opponent-turn': 對手回合
 * - 'none': 無活躍玩家（例如遊戲尚未開始、回合切換中、遊戲結束等）
 */
export type TurnStatus = 'my-turn' | 'opponent-turn' | 'none'

/**
 * GameStateStore Getters 介面
 */
export interface GameStateStoreGetters {
  isMyTurn: boolean // 是否為玩家回合
  turnStatus: TurnStatus // 回合狀態（三態）
  currentFlowStage: FlowState | null // 當前流程階段
  myKoiKoiMultiplier: number // 玩家 Koi-Koi 倍率
  opponentKoiKoiMultiplier: number // 對手 Koi-Koi 倍率
  groupedMyDepository: GroupedDepository // 玩家獲得區分組
  groupedOpponentDepository: GroupedDepository // 對手獲得區分組
  visualLayers: number // 牌堆視覺堆疊層數 (1-4)
}

/**
 * GameStateStore Actions 介面
 */
export interface GameStateStoreActions extends UIStatePort {
  reset(): void // 重置所有狀態（用於離開遊戲）
}

/**
 * GameStateStore 定義
 */
export const useGameStateStore = defineStore('gameState', {
  state: (): GameStateStoreState => ({
    // 遊戲上下文
    // 注意：gameId 由 SessionContextPort 管理，不在此 store 中
    localPlayerId: null,
    opponentPlayerId: null,
    localPlayerName: null,
    opponentPlayerName: null,
    ruleset: null,

    // 流程狀態
    flowStage: null,
    activePlayerId: null,
    dealerId: null,

    // 牌面狀態
    fieldCards: [],
    myHandCards: [],
    opponentHandCount: 0,
    myDepository: [],
    opponentDepository: [],
    deckRemaining: DEFAULT_TOTAL_DECK_CARDS,
    possibleTargetCardIds: [],
    drawnCard: null,

    // 分數與役種
    myScore: 0,
    opponentScore: 0,
    myYaku: [],
    opponentYaku: [],
    koiKoiMultipliers: {},
  }),

  getters: {
    /**
     * 是否為玩家回合
     */
    isMyTurn(): boolean {
      return this.activePlayerId === this.localPlayerId
    },

    /**
     * 回合狀態（三態）
     *
     * @returns 'my-turn' | 'opponent-turn' | 'none'
     */
    turnStatus(): TurnStatus {
      if (this.activePlayerId === null) {
        return 'none'
      }
      if (this.activePlayerId === this.localPlayerId) {
        return 'my-turn'
      }
      return 'opponent-turn'
    },

    /**
     * 當前流程階段
     */
    currentFlowStage(): FlowState | null {
      return this.flowStage
    },

    /**
     * 玩家 Koi-Koi 倍率
     */
    myKoiKoiMultiplier(): number {
      if (!this.localPlayerId) return 1
      return this.koiKoiMultipliers[this.localPlayerId] || 1
    },

    /**
     * 對手 Koi-Koi 倍率
     */
    opponentKoiKoiMultiplier(): number {
      if (!this.opponentPlayerId) return 1
      return this.koiKoiMultipliers[this.opponentPlayerId] || 1
    },

    /**
     * 玩家獲得區分組
     *
     * 按卡片類型分組：BRIGHT → ANIMAL → RIBBON → PLAIN
     * 透過 DomainFacade.getCardTypeFromId 取得卡片類型
     */
    groupedMyDepository(): GroupedDepository {
      const domainFacade = container.resolve(TOKENS.DomainFacade) as DomainFacade
      const getType = (id: string) => domainFacade.getCardTypeFromId(id)
      return {
        BRIGHT: this.myDepository.filter(id => getType(id) === 'BRIGHT'),
        ANIMAL: this.myDepository.filter(id => getType(id) === 'ANIMAL'),
        RIBBON: this.myDepository.filter(id => getType(id) === 'RIBBON'),
        PLAIN: this.myDepository.filter(id => getType(id) === 'PLAIN'),
      }
    },

    /**
     * 對手獲得區分組
     *
     * 按卡片類型分組：BRIGHT → ANIMAL → RIBBON → PLAIN
     * 透過 DomainFacade.getCardTypeFromId 取得卡片類型
     */
    groupedOpponentDepository(): GroupedDepository {
      const domainFacade = container.resolve(TOKENS.DomainFacade) as DomainFacade
      const getType = (id: string) => domainFacade.getCardTypeFromId(id)
      return {
        BRIGHT: this.opponentDepository.filter(id => getType(id) === 'BRIGHT'),
        ANIMAL: this.opponentDepository.filter(id => getType(id) === 'ANIMAL'),
        RIBBON: this.opponentDepository.filter(id => getType(id) === 'RIBBON'),
        PLAIN: this.opponentDepository.filter(id => getType(id) === 'PLAIN'),
      }
    },

    /**
     * 牌堆視覺堆疊層數
     *
     * 根據牌堆剩餘數量計算應該顯示的堆疊層數：
     * - >= 16 張: 4 層（完整堆疊）
     * - >= 8 張: 3 層
     * - >= 1 張: 2 層
     * - 0 張: 1 層（空牌堆）
     */
    visualLayers(): number {
      if (this.deckRemaining >= 16) return 4
      if (this.deckRemaining >= 8) return 3
      if (this.deckRemaining >= 1) return 2
      return 1
    },
  },

  actions: {
    /**
     * 初始化遊戲上下文（GameStarted 使用）
     *
     * @param gameId - 遊戲 ID（由 SSE 事件傳入，但儲存於 SessionContext）
     * @param players - 玩家資訊列表
     * @param ruleset - 遊戲規則集
     *
     * @note gameId 參數已移至 SessionContextPort 管理，此處僅作為參數傳入但不儲存
     */
    initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void {
      // gameId 由 SessionContextPort 管理，此處不再儲存
      // 保留參數是為了與 GameStatePort 介面相容
      void gameId // 明確標示未使用

      this.ruleset = ruleset

      // 辨識本地玩家（非 AI 玩家）
      const localPlayer = players.find((p) => !p.is_ai)
      if (!localPlayer) {
        console.error('[GameStateStore] 找不到本地玩家')
        return
      }

      this.localPlayerId = localPlayer.player_id
      this.localPlayerName = localPlayer.player_name

      // 辨識對手
      const opponent = players.find((p) => p.player_id !== this.localPlayerId)
      if (opponent) {
        this.opponentPlayerId = opponent.player_id
        this.opponentPlayerName = opponent.player_name
      }
    },

    /**
     * 恢復完整遊戲狀態（GameSnapshotRestore 使用）
     *
     * @param snapshot - 完整的遊戲快照數據
     *
     * @note gameId 由 SessionContextPort 管理，此處不再儲存
     */
    restoreGameState(snapshot: GameSnapshotRestore): void {
      // 快照恢復：完全覆蓋所有狀態
      // gameId 由 SessionContextPort 管理，此處不再儲存
      void snapshot.game_id // 明確標示未使用

      // 初始化 localPlayerId 和 opponentPlayerId（頁面重新整理後這些值為 null）
      // 從 SessionContext 取得本地玩家 ID，然後從 snapshot.players 辨識對手
      if (!this.localPlayerId && snapshot.players.length > 0) {
        const sessionContext = container.resolve<{ getPlayerId: () => string | null }>(TOKENS.SessionContextPort)
        const localId = sessionContext.getPlayerId()

        if (localId) {
          this.localPlayerId = localId
          const localPlayer = snapshot.players.find((p) => p.player_id === localId)
          if (localPlayer) {
            this.localPlayerName = localPlayer.player_name
          }

          const opponent = snapshot.players.find((p) => p.player_id !== localId)
          if (opponent) {
            this.opponentPlayerId = opponent.player_id
            this.opponentPlayerName = opponent.player_name
          }
          console.info('[GameStateStore] Initialized player IDs from snapshot', {
            localPlayerId: this.localPlayerId,
            localPlayerName: this.localPlayerName,
            opponentPlayerId: this.opponentPlayerId,
            opponentPlayerName: this.opponentPlayerName,
          })
        }
      }

      // 更新規則集
      this.ruleset = snapshot.ruleset

      this.flowStage = snapshot.current_flow_stage
      this.activePlayerId = snapshot.active_player_id

      // 更新場牌
      this.fieldCards = [...snapshot.field_cards]

      // 更新手牌（找到本地玩家的手牌）
      const myHand = snapshot.player_hands.find((h) => h.player_id === this.localPlayerId)
      if (myHand) {
        this.myHandCards = [...myHand.cards]
      }

      // 更新對手手牌數量
      const opponentHand = snapshot.player_hands.find((h) => h.player_id === this.opponentPlayerId)
      if (opponentHand) {
        this.opponentHandCount = opponentHand.cards.length
      }

      // 更新獲得區
      const myDepos = snapshot.player_depositories.find((d) => d.player_id === this.localPlayerId)
      const opponentDepos = snapshot.player_depositories.find((d) => d.player_id === this.opponentPlayerId)

      this.myDepository = myDepos ? [...myDepos.cards] : []
      this.opponentDepository = opponentDepos ? [...opponentDepos.cards] : []

      // 更新牌堆剩餘
      this.deckRemaining = snapshot.deck_remaining

      // 更新分數
      const myScoreData = snapshot.player_scores.find((s) => s.player_id === this.localPlayerId)
      const opponentScoreData = snapshot.player_scores.find((s) => s.player_id === this.opponentPlayerId)

      this.myScore = myScoreData ? myScoreData.score : 0
      this.opponentScore = opponentScoreData ? opponentScoreData.score : 0

      // 更新役種 (如果快照包含役種資訊)
      // 注意: 目前 GameSnapshotRestore 不包含役種,僅包含分數
      // 若未來需要恢復役種,需擴充 protocol.md 的快照定義

      // 更新 Koi-Koi 倍率
      this.koiKoiMultipliers = {}
      snapshot.koi_statuses.forEach((status) => {
        this.koiKoiMultipliers[status.player_id] = status.koi_multiplier
      })

      // 恢復 AWAITING_SELECTION 上下文（翻牌雙重配對時的狀態）
      if (snapshot.selection_context) {
        this.drawnCard = snapshot.selection_context.drawn_card
        this.possibleTargetCardIds = [...snapshot.selection_context.possible_targets]
        console.info('[GameStateStore] 恢復選擇上下文', {
          drawnCard: this.drawnCard,
          possibleTargets: this.possibleTargetCardIds,
        })
      } else {
        // 清除選擇上下文（非 AWAITING_SELECTION 狀態）
        this.drawnCard = null
        this.possibleTargetCardIds = []
      }

      console.info('[GameStateStore] 快照恢復完成', {
        flowStage: this.flowStage,
        fieldCards: this.fieldCards.length,
        myHandCards: this.myHandCards.length,
      })
    },

    /**
     * 設定當前流程階段
     *
     * @param stage - 流程階段
     *
     * @note 此方法僅更新 flowStage，不改變 activePlayerId。
     *       activePlayerId 應由 GameStatePortAdapter.setActivePlayer 單獨管理。
     */
    setFlowStage(stage: FlowState | null): void {
      this.flowStage = stage
      // 注意：不再自動設定 activePlayerId，避免覆蓋正確的活動玩家
    },

    /**
     * 更新場牌列表
     *
     * @param cards - 場牌 ID 列表
     */
    updateFieldCards(cards: string[]): void {
      this.fieldCards = [...cards]
    },

    /**
     * 更新手牌列表
     *
     * @param cards - 手牌 ID 列表
     */
    updateHandCards(cards: string[]): void {
      this.myHandCards = [...cards]
    },

    /**
     * 更新獲得區卡片
     *
     * @param playerCards - 玩家獲得區
     * @param opponentCards - 對手獲得區
     */
    updateDepositoryCards(playerCards: string[], opponentCards: string[]): void {
      this.myDepository = [...playerCards]
      this.opponentDepository = [...opponentCards]
    },

    /**
     * 更新分數
     *
     * @param playerScore - 玩家分數
     * @param opponentScore - 對手分數
     */
    updateScores(playerScore: number, opponentScore: number): void {
      this.myScore = playerScore
      this.opponentScore = opponentScore
    },

    /**
     * 更新牌堆剩餘數量
     *
     * @param count - 剩餘卡片數量
     */
    updateDeckRemaining(count: number): void {
      this.deckRemaining = count
    },

    /**
     * 更新玩家 Koi-Koi 倍率
     *
     * @param playerId - 玩家 ID
     * @param multiplier - 倍率
     */
    updateKoiKoiMultiplier(playerId: string, multiplier: number): void {
      this.koiKoiMultipliers[playerId] = multiplier
    },

    /**
     * 設定可配對目標卡片列表
     *
     * @param cardIds - 可配對的場牌 ID 列表
     */
    setPossibleTargetCardIds(cardIds: string[]): void {
      this.possibleTargetCardIds = [...cardIds]
      console.info('[GameStateStore] 設定可配對目標:', cardIds)
    },

    /**
     * 設定翻出的卡片 ID
     *
     * @param cardId - 翻出的卡片 ID，若要清除則傳入 null
     */
    setDrawnCard(cardId: string | null): void {
      this.drawnCard = cardId
      console.info('[GameStateStore] 設定翻出卡片:', cardId)
    },

    /**
     * 取得本地玩家 ID
     *
     * @returns 本地玩家的 player_id
     * @throws {Error} 若 localPlayerId 未初始化
     */
    getLocalPlayerId(): string {
      if (!this.localPlayerId) {
        throw new Error('[GameStateStore] LocalPlayerId not initialized')
      }
      return this.localPlayerId
    },

    /**
     * 取得翻出的卡片 ID
     *
     * @returns 翻出的卡片 ID，若無則返回 null
     */
    getDrawnCard(): string | null {
      return this.drawnCard
    },

    /**
     * 取得可配對目標卡片列表
     *
     * @returns 可配對的場牌 ID 列表
     */
    getPossibleTargetCardIds(): string[] {
      return [...this.possibleTargetCardIds]
    },

    /**
     * 重置所有狀態（用於離開遊戲）
     *
     * @note gameId 由 SessionContextPort 清除，此處不處理
     */
    reset(): void {
      // gameId 由 SessionContextPort 清除
      this.localPlayerId = null
      this.opponentPlayerId = null
      this.localPlayerName = null
      this.opponentPlayerName = null
      this.ruleset = null

      this.flowStage = null
      this.activePlayerId = null
      this.dealerId = null

      this.fieldCards = []
      this.myHandCards = []
      this.opponentHandCount = 0
      this.myDepository = []
      this.opponentDepository = []
      this.deckRemaining = DEFAULT_TOTAL_DECK_CARDS
      this.possibleTargetCardIds = []
      this.drawnCard = null

      this.myScore = 0
      this.opponentScore = 0
      this.myYaku = []
      this.opponentYaku = []
      this.koiKoiMultipliers = {}

      console.info('[GameStateStore] 狀態已重置')
    },

    /**
     * 重置所有玩家的 Koi-Koi 倍率
     *
     * @description
     * 新局開始時呼叫，將所有玩家的 Koi-Koi 倍率重置為初始值。
     */
    resetKoiKoiMultipliers(): void {
      this.koiKoiMultipliers = {}
      console.info('[GameStateStore] Koi-Koi 倍率已重置')
    },
  },
})

/**
 * 建立 UIStatePort Adapter
 *
 * @description
 * 將 GameStateStore 適配為 UIStatePort 介面。
 * 由 DI Container 使用。
 *
 * @returns UIStatePort 實作
 */
export function createUIStatePortAdapter(): UIStatePort {
  const store = useGameStateStore()
  return {
    initializeGameContext: store.initializeGameContext.bind(store),
    restoreGameState: store.restoreGameState.bind(store),
    setFlowStage: store.setFlowStage.bind(store),
    updateFieldCards: store.updateFieldCards.bind(store),
    updateHandCards: store.updateHandCards.bind(store),
    updateDepositoryCards: store.updateDepositoryCards.bind(store),
    updateScores: store.updateScores.bind(store),
    updateDeckRemaining: store.updateDeckRemaining.bind(store),
    updateKoiKoiMultiplier: store.updateKoiKoiMultiplier.bind(store),
    getLocalPlayerId: store.getLocalPlayerId.bind(store),
    resetState: store.reset.bind(store),
  }
}
