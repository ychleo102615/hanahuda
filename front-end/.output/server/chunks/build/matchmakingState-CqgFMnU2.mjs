import { defineStore, storeToRefs } from 'pinia';
import { defineComponent, computed, mergeProps, unref, ref, watch, reactive, toValue, shallowRef, getCurrentInstance, getCurrentScope, onScopeDispose, useSSRContext, useSlots, h, Fragment, inject, toRaw } from 'vue';
import { ssrRenderAttrs, ssrRenderSlot, ssrInterpolate, ssrRenderClass, ssrRenderTeleport, ssrRenderStyle, ssrRenderList } from 'vue/server-renderer';
import { q as defu } from '../nitro/nitro.mjs';
import sync, { getFrameData } from 'framesync';
import { inertia, animate, velocityPerSecond, cubicBezier, bounceOut, bounceInOut, bounceIn, anticipate, backOut, backInOut, backIn, circOut, circInOut, circIn, easeOut, easeInOut, easeIn, linear } from 'popmotion';
import { complex, number, alpha, filter, px, progressPercentage, degrees, scale, color } from 'style-value-types';
import { _ as _export_sfc } from './server.mjs';

class DependencyNotFoundError extends Error {
  constructor(token) {
    super(`Dependency not found: ${token.toString()}`);
    this.name = "DependencyNotFoundError";
  }
}
class DIContainer {
  dependencies;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  singletons;
  constructor() {
    this.dependencies = /* @__PURE__ */ new Map();
    this.singletons = /* @__PURE__ */ new Map();
  }
  /**
   * 註冊依賴
   *
   * @param token - 依賴 Token (Symbol)
   * @param factory - 工廠函數
   * @param options - 註冊選項 (singleton)
   *
   * @example
   * ```typescript
   * container.register(
   *   TOKENS.GameApiClient,
   *   () => new GameApiClient('http://localhost:8080'),
   *   { singleton: true }
   * );
   * ```
   */
  register(token, factory, options) {
    this.dependencies.set(token, factory);
    if (options?.singleton) {
      this.singletons.set(token, factory());
    }
  }
  /**
   * 解析依賴
   *
   * @param token - 依賴 Token (Symbol)
   * @returns 依賴實例
   * @throws {DependencyNotFoundError} 若依賴未註冊
   *
   * @example
   * ```typescript
   * const apiClient = container.resolve<GameApiClient>(TOKENS.GameApiClient);
   * ```
   */
  resolve(token) {
    if (this.singletons.has(token)) {
      return this.singletons.get(token);
    }
    const factory = this.dependencies.get(token);
    if (!factory) {
      throw new DependencyNotFoundError(token);
    }
    return factory();
  }
  /**
   * 檢查依賴是否已註冊
   *
   * @param token - 依賴 Token (Symbol)
   * @returns 是否已註冊
   */
  has(token) {
    return this.dependencies.has(token) || this.singletons.has(token);
  }
  /**
   * 清除所有依賴
   * (用於測試清理)
   */
  clear() {
    this.dependencies.clear();
    this.singletons.clear();
  }
  /**
   * 取得所有已註冊的 Token
   * (用於偵錯)
   */
  getRegisteredTokens() {
    return Array.from(this.dependencies.keys());
  }
}
const container = new DIContainer();
const TOKENS = {
  AnimationPort: Symbol("AnimationPort"),
  NotificationPort: Symbol("NotificationPort"),
  SendCommandPort: Symbol("SendCommandPort"),
  // ===== Input Ports - Game Initialization =====
  StartGamePort: Symbol("StartGamePort"),
  // ===== Input Ports - Player Operations (3 個) =====
  PlayHandCardPort: Symbol("PlayHandCardPort"),
  SelectMatchTargetPort: Symbol("SelectMatchTargetPort"),
  MakeKoiKoiDecisionPort: Symbol("MakeKoiKoiDecisionPort"),
  // ===== Domain Facade =====
  DomainFacade: Symbol("DomainFacade"),
  MockEventEmitter: Symbol("MockEventEmitter")
};
const useGameStateStore = defineStore("gameState", {
  state: () => ({
    // 遊戲上下文
    gameId: null,
    localPlayerId: null,
    opponentPlayerId: null,
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
    deckRemaining: 24,
    possibleTargetCardIds: [],
    drawnCard: null,
    // 分數與役種
    myScore: 0,
    opponentScore: 0,
    myYaku: [],
    opponentYaku: [],
    koiKoiMultipliers: {}
  }),
  getters: {
    /**
     * 是否為玩家回合
     */
    isMyTurn() {
      return this.activePlayerId === this.localPlayerId;
    },
    /**
     * 當前流程階段
     */
    currentFlowStage() {
      return this.flowStage;
    },
    /**
     * 玩家 Koi-Koi 倍率
     */
    myKoiKoiMultiplier() {
      if (!this.localPlayerId) return 1;
      return this.koiKoiMultipliers[this.localPlayerId] || 1;
    },
    /**
     * 對手 Koi-Koi 倍率
     */
    opponentKoiKoiMultiplier() {
      if (!this.opponentPlayerId) return 1;
      return this.koiKoiMultipliers[this.opponentPlayerId] || 1;
    },
    /**
     * 玩家獲得區分組
     *
     * 按卡片類型分組：BRIGHT → ANIMAL → RIBBON → PLAIN
     * 透過 DomainFacade.getCardTypeFromId 取得卡片類型
     */
    groupedMyDepository() {
      const domainFacade = container.resolve(TOKENS.DomainFacade);
      const getType = (id) => domainFacade.getCardTypeFromId(id);
      return {
        BRIGHT: this.myDepository.filter((id) => getType(id) === "BRIGHT"),
        ANIMAL: this.myDepository.filter((id) => getType(id) === "ANIMAL"),
        RIBBON: this.myDepository.filter((id) => getType(id) === "RIBBON"),
        PLAIN: this.myDepository.filter((id) => getType(id) === "PLAIN")
      };
    },
    /**
     * 對手獲得區分組
     *
     * 按卡片類型分組：BRIGHT → ANIMAL → RIBBON → PLAIN
     * 透過 DomainFacade.getCardTypeFromId 取得卡片類型
     */
    groupedOpponentDepository() {
      const domainFacade = container.resolve(TOKENS.DomainFacade);
      const getType = (id) => domainFacade.getCardTypeFromId(id);
      return {
        BRIGHT: this.opponentDepository.filter((id) => getType(id) === "BRIGHT"),
        ANIMAL: this.opponentDepository.filter((id) => getType(id) === "ANIMAL"),
        RIBBON: this.opponentDepository.filter((id) => getType(id) === "RIBBON"),
        PLAIN: this.opponentDepository.filter((id) => getType(id) === "PLAIN")
      };
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
    visualLayers() {
      if (this.deckRemaining >= 16) return 4;
      if (this.deckRemaining >= 8) return 3;
      if (this.deckRemaining >= 1) return 2;
      return 1;
    }
  },
  actions: {
    /**
     * 初始化遊戲上下文（GameStarted 使用）
     *
     * @param gameId - 遊戲 ID
     * @param players - 玩家資訊列表
     * @param ruleset - 遊戲規則集
     */
    initializeGameContext(gameId, players, ruleset) {
      this.gameId = gameId;
      this.ruleset = ruleset;
      const localPlayer = players.find((p) => !p.is_ai);
      if (!localPlayer) {
        console.error("[GameStateStore] 找不到本地玩家");
        return;
      }
      this.localPlayerId = localPlayer.player_id;
      const opponent = players.find((p) => p.player_id !== this.localPlayerId);
      if (opponent) {
        this.opponentPlayerId = opponent.player_id;
      }
    },
    /**
     * 恢復完整遊戲狀態（GameSnapshotRestore 使用）
     *
     * @param snapshot - 完整的遊戲快照數據
     */
    restoreGameState(snapshot) {
      this.gameId = snapshot.game_id;
      this.flowStage = snapshot.current_flow_stage;
      this.activePlayerId = snapshot.active_player_id;
      this.fieldCards = [...snapshot.field_cards];
      const myHand = snapshot.player_hands.find((h) => h.player_id === this.localPlayerId);
      if (myHand) {
        this.myHandCards = [...myHand.cards];
      }
      const opponentHand = snapshot.player_hands.find((h) => h.player_id === this.opponentPlayerId);
      if (opponentHand) {
        this.opponentHandCount = opponentHand.cards.length;
      }
      const myDepos = snapshot.player_depositories.find((d) => d.player_id === this.localPlayerId);
      const opponentDepos = snapshot.player_depositories.find((d) => d.player_id === this.opponentPlayerId);
      this.myDepository = myDepos ? [...myDepos.cards] : [];
      this.opponentDepository = opponentDepos ? [...opponentDepos.cards] : [];
      this.deckRemaining = snapshot.deck_remaining;
      const myScoreData = snapshot.player_scores.find((s) => s.player_id === this.localPlayerId);
      const opponentScoreData = snapshot.player_scores.find((s) => s.player_id === this.opponentPlayerId);
      this.myScore = myScoreData ? myScoreData.score : 0;
      this.opponentScore = opponentScoreData ? opponentScoreData.score : 0;
      this.koiKoiMultipliers = {};
      snapshot.koi_statuses.forEach((status) => {
        this.koiKoiMultipliers[status.player_id] = status.koi_multiplier;
      });
      console.info("[GameStateStore] 快照恢復完成", {
        gameId: this.gameId,
        flowStage: this.flowStage,
        fieldCards: this.fieldCards.length,
        myHandCards: this.myHandCards.length
      });
    },
    /**
     * 設定當前流程階段
     *
     * @param stage - 流程階段
     */
    setFlowStage(stage) {
      this.flowStage = stage;
      this.activePlayerId = this.localPlayerId;
    },
    /**
     * 更新場牌列表
     *
     * @param cards - 場牌 ID 列表
     */
    updateFieldCards(cards) {
      this.fieldCards = [...cards];
    },
    /**
     * 更新手牌列表
     *
     * @param cards - 手牌 ID 列表
     */
    updateHandCards(cards) {
      this.myHandCards = [...cards];
    },
    /**
     * 更新獲得區卡片
     *
     * @param playerCards - 玩家獲得區
     * @param opponentCards - 對手獲得區
     */
    updateDepositoryCards(playerCards, opponentCards) {
      this.myDepository = [...playerCards];
      this.opponentDepository = [...opponentCards];
    },
    /**
     * 更新分數
     *
     * @param playerScore - 玩家分數
     * @param opponentScore - 對手分數
     */
    updateScores(playerScore, opponentScore) {
      this.myScore = playerScore;
      this.opponentScore = opponentScore;
    },
    /**
     * 更新牌堆剩餘數量
     *
     * @param count - 剩餘卡片數量
     */
    updateDeckRemaining(count) {
      this.deckRemaining = count;
    },
    /**
     * 更新玩家 Koi-Koi 倍率
     *
     * @param playerId - 玩家 ID
     * @param multiplier - 倍率
     */
    updateKoiKoiMultiplier(playerId, multiplier) {
      this.koiKoiMultipliers[playerId] = multiplier;
    },
    /**
     * 設定可配對目標卡片列表
     *
     * @param cardIds - 可配對的場牌 ID 列表
     */
    setPossibleTargetCardIds(cardIds) {
      this.possibleTargetCardIds = [...cardIds];
      console.info("[GameStateStore] 設定可配對目標:", cardIds);
    },
    /**
     * 設定翻出的卡片 ID
     *
     * @param cardId - 翻出的卡片 ID，若要清除則傳入 null
     */
    setDrawnCard(cardId) {
      this.drawnCard = cardId;
      console.info("[GameStateStore] 設定翻出卡片:", cardId);
    },
    /**
     * 取得本地玩家 ID
     *
     * @returns 本地玩家的 player_id
     * @throws {Error} 若 localPlayerId 未初始化
     */
    getLocalPlayerId() {
      if (!this.localPlayerId) {
        throw new Error("[GameStateStore] LocalPlayerId not initialized");
      }
      return this.localPlayerId;
    },
    /**
     * 取得翻出的卡片 ID
     *
     * @returns 翻出的卡片 ID，若無則返回 null
     */
    getDrawnCard() {
      return this.drawnCard;
    },
    /**
     * 取得可配對目標卡片列表
     *
     * @returns 可配對的場牌 ID 列表
     */
    getPossibleTargetCardIds() {
      return [...this.possibleTargetCardIds];
    },
    /**
     * 重置所有狀態（用於離開遊戲）
     */
    reset() {
      this.gameId = null;
      this.localPlayerId = null;
      this.opponentPlayerId = null;
      this.ruleset = null;
      this.flowStage = null;
      this.activePlayerId = null;
      this.dealerId = null;
      this.fieldCards = [];
      this.myHandCards = [];
      this.opponentHandCount = 0;
      this.myDepository = [];
      this.opponentDepository = [];
      this.deckRemaining = 24;
      this.possibleTargetCardIds = [];
      this.drawnCard = null;
      this.myScore = 0;
      this.opponentScore = 0;
      this.myYaku = [];
      this.opponentYaku = [];
      this.koiKoiMultipliers = {};
      console.info("[GameStateStore] 狀態已重置");
    }
  }
});

const useUIStateStore = defineStore("uiState", {
  state: () => ({
    // Koi-Koi 決策 Modal
    decisionModalVisible: false,
    decisionModalData: null,
    // 遊戲結束 Modal
    gameFinishedModalVisible: false,
    gameFinishedModalData: null,
    // 平局 Modal
    roundDrawnModalVisible: false,
    roundDrawnModalScores: [],
    // 回合計分 Modal
    roundScoredModalVisible: false,
    roundScoredModalData: null,
    // 局即時結束 Modal
    roundEndedInstantlyModalVisible: false,
    roundEndedInstantlyModalData: null,
    // 訊息提示
    errorMessage: null,
    infoMessage: null,
    // 連線狀態
    connectionStatus: "disconnected",
    reconnecting: false,
    // 手牌確認模式
    handCardConfirmationMode: false,
    handCardAwaitingConfirmation: null,
    matchableFieldCards: [],
    matchCount: 0,
    // 手牌懸浮預覽
    handCardHoverPreview: null,
    previewHighlightedTargets: [],
    // 場牌選擇模式
    fieldCardSelectionMode: false,
    fieldCardSelectableTargets: [],
    fieldCardHighlightType: null,
    fieldCardSourceCard: null,
    // 倒數計時
    actionTimeoutRemaining: null,
    displayTimeoutRemaining: null
  }),
  actions: {
    /**
     * 關閉所有 Modal（內部輔助方法）
     *
     * @description
     * 確保 modal 互斥性：一次只能顯示一個 modal。
     * 所有 show*Modal 方法都會先調用此方法。
     */
    _hideAllModals() {
      this.decisionModalVisible = false;
      this.decisionModalData = null;
      this.gameFinishedModalVisible = false;
      this.gameFinishedModalData = null;
      this.roundDrawnModalVisible = false;
      this.roundDrawnModalScores = [];
      this.roundScoredModalVisible = false;
      this.roundScoredModalData = null;
      this.roundEndedInstantlyModalVisible = false;
      this.roundEndedInstantlyModalData = null;
    },
    /**
     * 顯示 Koi-Koi 決策 Modal
     *
     * @param currentYaku - 當前役種列表
     * @param currentScore - 當前分數
     * @param potentialScore - 潛在分數（可選）
     */
    showDecisionModal(currentYaku, currentScore, potentialScore) {
      this._hideAllModals();
      this.decisionModalVisible = true;
      this.decisionModalData = {
        currentYaku: [...currentYaku],
        currentScore,
        potentialScore
      };
      console.info("[UIStateStore] 顯示 Koi-Koi 決策 Modal", this.decisionModalData);
    },
    /**
     * 隱藏 Koi-Koi 決策 Modal
     */
    hideDecisionModal() {
      this.decisionModalVisible = false;
      this.decisionModalData = null;
      console.info("[UIStateStore] 隱藏 Koi-Koi 決策 Modal");
    },
    /**
     * 顯示錯誤訊息
     *
     * @param message - 錯誤訊息
     */
    showErrorMessage(message) {
      this.errorMessage = message;
      console.error("[UIStateStore] 錯誤訊息:", message);
      setTimeout(() => {
        if (this.errorMessage === message) {
          this.errorMessage = null;
        }
      }, 3e3);
    },
    /**
     * 顯示重連訊息
     */
    showReconnectionMessage() {
      this.reconnecting = true;
      this.infoMessage = "連線中斷，正在嘗試重連...";
      console.info("[UIStateStore]", this.infoMessage);
    },
    /**
     * 隱藏重連訊息（重連成功）
     */
    hideReconnectionMessage() {
      this.reconnecting = false;
      this.infoMessage = "連線已恢復";
      console.info("[UIStateStore]", this.infoMessage);
      setTimeout(() => {
        if (this.infoMessage === "連線已恢復") {
          this.infoMessage = null;
        }
      }, 3e3);
    },
    /**
     * 顯示遊戲結束 Modal
     *
     * @param winnerId - 贏家玩家 ID
     * @param finalScores - 最終分數列表
     * @param isPlayerWinner - 是否為當前玩家獲勝
     */
    showGameFinishedModal(winnerId, finalScores, isPlayerWinner) {
      this._hideAllModals();
      this.gameFinishedModalVisible = true;
      this.gameFinishedModalData = {
        winnerId,
        finalScores: [...finalScores],
        isPlayerWinner
      };
      console.info("[UIStateStore] 顯示遊戲結束 Modal", this.gameFinishedModalData);
    },
    /**
     * 隱藏遊戲結束 Modal
     */
    hideGameFinishedModal() {
      this.gameFinishedModalVisible = false;
      this.gameFinishedModalData = null;
      console.info("[UIStateStore] 隱藏遊戲結束 Modal");
    },
    /**
     * 顯示平局 Modal
     *
     * @param currentTotalScores - 當前總分列表
     */
    showRoundDrawnModal(currentTotalScores) {
      this._hideAllModals();
      this.roundDrawnModalVisible = true;
      this.roundDrawnModalScores = [...currentTotalScores];
      console.info("[UIStateStore] 顯示平局 Modal", this.roundDrawnModalScores);
    },
    /**
     * 隱藏平局 Modal
     */
    hideRoundDrawnModal() {
      this.roundDrawnModalVisible = false;
      this.roundDrawnModalScores = [];
      console.info("[UIStateStore] 隱藏平局 Modal");
    },
    /**
     * 顯示回合計分 Modal
     *
     * @param winnerId - 勝者玩家 ID
     * @param yakuList - 役種列表
     * @param baseScore - 基礎分數
     * @param finalScore - 最終分數
     * @param multipliers - 分數倍率
     * @param updatedTotalScores - 更新後的總分列表
     */
    showRoundScoredModal(winnerId, yakuList, baseScore, finalScore, multipliers, updatedTotalScores) {
      this._hideAllModals();
      this.roundScoredModalVisible = true;
      this.roundScoredModalData = {
        winnerId,
        yakuList: [...yakuList],
        baseScore,
        finalScore,
        multipliers,
        updatedTotalScores: [...updatedTotalScores]
      };
      console.info("[UIStateStore] 顯示回合計分 Modal", this.roundScoredModalData);
    },
    /**
     * 隱藏回合計分 Modal
     */
    hideRoundScoredModal() {
      this.roundScoredModalVisible = false;
      this.roundScoredModalData = null;
      console.info("[UIStateStore] 隱藏回合計分 Modal");
    },
    /**
     * 顯示局即時結束 Modal
     *
     * @param reason - 結束原因
     * @param winnerId - 勝者玩家 ID（可能為 null）
     * @param awardedPoints - 獲得的分數
     * @param updatedTotalScores - 更新後的總分列表
     */
    showRoundEndedInstantlyModal(reason, winnerId, awardedPoints, updatedTotalScores) {
      this._hideAllModals();
      this.roundEndedInstantlyModalVisible = true;
      this.roundEndedInstantlyModalData = {
        reason,
        winnerId,
        awardedPoints,
        updatedTotalScores: [...updatedTotalScores]
      };
      console.info("[UIStateStore] 顯示局即時結束 Modal", this.roundEndedInstantlyModalData);
    },
    /**
     * 隱藏局即時結束 Modal
     */
    hideRoundEndedInstantlyModal() {
      this.roundEndedInstantlyModalVisible = false;
      this.roundEndedInstantlyModalData = null;
      console.info("[UIStateStore] 隱藏局即時結束 Modal");
    },
    /**
     * 隱藏當前 Modal
     *
     * @description
     * 通用方法，關閉所有可能打開的 modal/panel。
     * 倒數計時由 CountdownManager 管理，不在此處停止。
     */
    hideModal() {
      this._hideAllModals();
      console.info("[UIStateStore] 隱藏所有 Modal");
    },
    /**
     * 設定連線狀態
     *
     * @param status - 連線狀態
     */
    setConnectionStatus(status) {
      this.connectionStatus = status;
      console.info("[UIStateStore] 連線狀態變更:", status);
    },
    /**
     * 重置所有狀態（用於離開遊戲或重連後）
     */
    reset() {
      this.decisionModalVisible = false;
      this.decisionModalData = null;
      this.gameFinishedModalVisible = false;
      this.gameFinishedModalData = null;
      this.roundDrawnModalVisible = false;
      this.roundDrawnModalScores = [];
      this.roundScoredModalVisible = false;
      this.roundScoredModalData = null;
      this.roundEndedInstantlyModalVisible = false;
      this.roundEndedInstantlyModalData = null;
      this.errorMessage = null;
      this.infoMessage = null;
      this.connectionStatus = "disconnected";
      this.reconnecting = false;
      this.handCardConfirmationMode = false;
      this.handCardAwaitingConfirmation = null;
      this.matchableFieldCards = [];
      this.matchCount = 0;
      this.handCardHoverPreview = null;
      this.previewHighlightedTargets = [];
      this.fieldCardSelectionMode = false;
      this.fieldCardSelectableTargets = [];
      this.fieldCardHighlightType = null;
      this.fieldCardSourceCard = null;
      this.actionTimeoutRemaining = null;
      this.displayTimeoutRemaining = null;
      console.info("[UIStateStore] 狀態已重置");
    },
    /**
     * 進入手牌確認模式
     */
    enterHandCardConfirmationMode(cardId, matchableCards, matchCount) {
      this.handCardConfirmationMode = true;
      this.handCardAwaitingConfirmation = cardId;
      this.matchableFieldCards = [...matchableCards];
      this.matchCount = matchCount;
      console.info("[UIStateStore] 進入手牌確認模式", { cardId, matchCount });
    },
    /**
     * 退出手牌確認模式
     */
    exitHandCardConfirmationMode() {
      this.handCardConfirmationMode = false;
      this.handCardAwaitingConfirmation = null;
      this.matchableFieldCards = [];
      this.matchCount = 0;
      console.info("[UIStateStore] 退出手牌確認模式");
    },
    /**
     * 設定手牌懸浮預覽
     */
    setHandCardHoverPreview(cardId, highlightedTargets) {
      this.handCardHoverPreview = cardId;
      this.previewHighlightedTargets = [...highlightedTargets];
    },
    /**
     * 清除手牌懸浮預覽
     */
    clearHandCardHoverPreview() {
      this.handCardHoverPreview = null;
      this.previewHighlightedTargets = [];
    },
    /**
     * 進入場牌選擇模式
     */
    enterFieldCardSelectionMode(sourceCard, selectableTargets, highlightType) {
      if (this.handCardConfirmationMode) {
        this.exitHandCardConfirmationMode();
      }
      this.fieldCardSelectionMode = true;
      this.fieldCardSelectableTargets = [...selectableTargets];
      this.fieldCardHighlightType = highlightType;
      this.fieldCardSourceCard = sourceCard;
      console.info("[UIStateStore] 進入場牌選擇模式", { sourceCard, highlightType, targetCount: selectableTargets.length });
    },
    /**
     * 退出場牌選擇模式
     */
    exitFieldCardSelectionMode() {
      this.fieldCardSelectionMode = false;
      this.fieldCardSelectableTargets = [];
      this.fieldCardHighlightType = null;
      this.fieldCardSourceCard = null;
      console.info("[UIStateStore] 退出場牌選擇模式");
    }
  }
});
function useDependency(token) {
  try {
    return container.resolve(token);
  } catch (error) {
    if (error.name === "DependencyNotFoundError") {
      console.error(
        `[useDependency] 依賴未註冊: ${token.toString()}
請確認此依賴已在 registry.ts 中註冊。
當前遊戲模式: ${sessionStorage.getItem("gameMode") || "unknown"}`
      );
    }
    throw error;
  }
}
function useOptionalDependency(token) {
  try {
    return container.resolve(token);
  } catch (error) {
    if (error.name === "DependencyNotFoundError") {
      return null;
    }
    throw error;
  }
}
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "TopInfoBar",
  __ssrInlineRender: true,
  props: {
    variant: {},
    title: { default: "Game Lobby" }
  },
  emits: ["menuClick"],
  setup(__props, { emit: __emit }) {
    const gameState = useGameStateStore();
    const uiState = useUIStateStore();
    const { myScore, opponentScore, isMyTurn, deckRemaining } = storeToRefs(gameState);
    const { connectionStatus, actionTimeoutRemaining } = storeToRefs(uiState);
    const connectionStatusText = computed(() => {
      switch (connectionStatus.value) {
        case "connected":
          return "Connected";
        case "connecting":
          return "Connecting...";
        case "disconnected":
          return "Disconnected";
        default:
          return "";
      }
    });
    const connectionStatusClass = computed(() => {
      switch (connectionStatus.value) {
        case "connected":
          return "text-green-400";
        case "connecting":
          return "text-yellow-400";
        case "disconnected":
          return "text-red-400";
        default:
          return "";
      }
    });
    const turnText = computed(() => {
      return isMyTurn.value ? "Your Turn" : "Opponent's Turn";
    });
    const countdownClass = computed(() => {
      if (actionTimeoutRemaining.value !== null && actionTimeoutRemaining.value <= 5) {
        return "text-red-500";
      }
      return "text-white";
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "h-full bg-gray-800 text-white px-4 py-2 flex items-center justify-between" }, _attrs))}><div class="flex items-center gap-4">`);
      ssrRenderSlot(_ctx.$slots, "left", {}, () => {
        if (__props.variant === "game") {
          _push(`<div class="text-center"><div class="text-xs text-gray-400">Opponent</div><div class="text-xl font-bold">${ssrInterpolate(unref(opponentScore))}</div></div>`);
        } else {
          _push(`<h1 data-testid="lobby-title" class="text-xl font-bold">${ssrInterpolate(__props.title)}</h1>`);
        }
      }, _push, _parent);
      _push(`</div><div class="flex flex-col items-center">`);
      ssrRenderSlot(_ctx.$slots, "center", {}, () => {
        if (__props.variant === "game") {
          _push(`<!--[--><div class="${ssrRenderClass([{ "text-yellow-400": unref(isMyTurn) }, "text-sm font-medium"])}">${ssrInterpolate(turnText.value)}</div>`);
          if (unref(actionTimeoutRemaining) !== null) {
            _push(`<div class="${ssrRenderClass([countdownClass.value, "text-xl font-bold"])}">${ssrInterpolate(unref(actionTimeoutRemaining))}</div>`);
          } else {
            _push(`<!---->`);
          }
          _push(`<div class="text-xs text-gray-400"> Deck: ${ssrInterpolate(unref(deckRemaining))}</div><!--]-->`);
        } else {
          _push(`<!---->`);
        }
      }, _push, _parent);
      _push(`</div><div class="flex items-center gap-4">`);
      ssrRenderSlot(_ctx.$slots, "right", {}, () => {
        if (__props.variant === "game") {
          _push(`<!--[--><div class="text-center"><div class="text-xs text-gray-400">You</div><div class="text-xl font-bold">${ssrInterpolate(unref(myScore))}</div></div><div class="${ssrRenderClass([connectionStatusClass.value, "text-xs"])}">${ssrInterpolate(connectionStatusText.value)}</div><!--]-->`);
        } else {
          _push(`<button data-testid="menu-button" aria-label="Open menu" class="p-2 rounded-lg hover:bg-white/10 transition-colors"><svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>`);
        }
      }, _push, _parent);
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/TopInfoBar.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const TopInfoBar = Object.assign(_sfc_main$1, { __name: "TopInfoBar" });
function tryOnScopeDispose(fn) {
  if (getCurrentScope()) {
    onScopeDispose(fn);
    return true;
  }
  return false;
}
typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;
const notNullish = (val) => val != null;
const toString = Object.prototype.toString;
const isObject$1 = (val) => toString.call(val) === "[object Object]";
const noop = () => {
};
function toArray(value) {
  return Array.isArray(value) ? value : [value];
}
function getLifeCycleTarget(target) {
  return getCurrentInstance();
}
function tryOnUnmounted(fn, target) {
  getLifeCycleTarget();
}
function watchImmediate(source, cb, options) {
  return watch(
    source,
    cb,
    {
      ...options,
      immediate: true
    }
  );
}
const defaultWindow = void 0;
function unrefElement(elRef) {
  var _a;
  const plain = toValue(elRef);
  return (_a = plain == null ? void 0 : plain.$el) != null ? _a : plain;
}
function useEventListener(...args) {
  const cleanups = [];
  const cleanup = () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  };
  const register = (el, event, listener, options) => {
    el.addEventListener(event, listener, options);
    return () => el.removeEventListener(event, listener, options);
  };
  const firstParamTargets = computed(() => {
    const test = toArray(toValue(args[0])).filter((e) => e != null);
    return test.every((e) => typeof e !== "string") ? test : void 0;
  });
  const stopWatch = watchImmediate(
    () => {
      var _a, _b;
      return [
        (_b = (_a = firstParamTargets.value) == null ? void 0 : _a.map((e) => unrefElement(e))) != null ? _b : [defaultWindow].filter((e) => e != null),
        toArray(toValue(firstParamTargets.value ? args[1] : args[0])),
        toArray(unref(firstParamTargets.value ? args[2] : args[1])),
        // @ts-expect-error - TypeScript gets the correct types, but somehow still complains
        toValue(firstParamTargets.value ? args[3] : args[2])
      ];
    },
    ([raw_targets, raw_events, raw_listeners, raw_options]) => {
      cleanup();
      if (!(raw_targets == null ? void 0 : raw_targets.length) || !(raw_events == null ? void 0 : raw_events.length) || !(raw_listeners == null ? void 0 : raw_listeners.length))
        return;
      const optionsClone = isObject$1(raw_options) ? { ...raw_options } : raw_options;
      cleanups.push(
        ...raw_targets.flatMap(
          (el) => raw_events.flatMap(
            (event) => raw_listeners.map((listener) => register(el, event, listener, optionsClone))
          )
        )
      );
    },
    { flush: "post" }
  );
  const stop = () => {
    stopWatch();
    cleanup();
  };
  tryOnScopeDispose(cleanup);
  return stop;
}
// @__NO_SIDE_EFFECTS__
function useMounted() {
  const isMounted = shallowRef(false);
  getCurrentInstance();
  return isMounted;
}
// @__NO_SIDE_EFFECTS__
function useSupported(callback) {
  const isMounted = /* @__PURE__ */ useMounted();
  return computed(() => {
    isMounted.value;
    return Boolean(callback());
  });
}
function useIntersectionObserver(target, callback, options = {}) {
  const {
    root,
    rootMargin = "0px",
    threshold = 0,
    window: window2 = defaultWindow,
    immediate = true
  } = options;
  const isSupported = /* @__PURE__ */ useSupported(() => window2 && "IntersectionObserver" in window2);
  const targets = computed(() => {
    const _target = toValue(target);
    return toArray(_target).map(unrefElement).filter(notNullish);
  });
  let cleanup = noop;
  const isActive = shallowRef(immediate);
  const stopWatch = isSupported.value ? watch(
    () => [targets.value, unrefElement(root), isActive.value],
    ([targets2, root2]) => {
      cleanup();
      if (!isActive.value)
        return;
      if (!targets2.length)
        return;
      const observer = new IntersectionObserver(
        callback,
        {
          root: unrefElement(root2),
          rootMargin,
          threshold
        }
      );
      targets2.forEach((el) => el && observer.observe(el));
      cleanup = () => {
        observer.disconnect();
        cleanup = noop;
      };
    },
    { immediate, flush: "post" }
  ) : noop;
  const stop = () => {
    cleanup();
    stopWatch();
    isActive.value = false;
  };
  tryOnScopeDispose(stop);
  return {
    isSupported,
    isActive,
    pause() {
      cleanup();
      isActive.value = false;
    },
    resume() {
      isActive.value = true;
    },
    stop
  };
}
class SubscriptionManager {
  subscriptions = /* @__PURE__ */ new Set();
  add(handler) {
    this.subscriptions.add(handler);
    return () => this.subscriptions.delete(handler);
  }
  notify(a, b, c) {
    if (!this.subscriptions.size)
      return;
    for (const handler of this.subscriptions) handler(a, b, c);
  }
  clear() {
    this.subscriptions.clear();
  }
}
function isFloat(value) {
  return !Number.isNaN(Number.parseFloat(value));
}
class MotionValue {
  /**
   * The current state of the `MotionValue`.
   */
  current;
  /**
   * The previous state of the `MotionValue`.
   */
  prev;
  /**
   * Duration, in milliseconds, since last updating frame.
   */
  timeDelta = 0;
  /**
   * Timestamp of the last time this `MotionValue` was updated.
   */
  lastUpdated = 0;
  /**
   * Functions to notify when the `MotionValue` updates.
   */
  updateSubscribers = new SubscriptionManager();
  /**
   * A reference to the currently-controlling Popmotion animation
   */
  stopAnimation;
  /**
   * Tracks whether this value can output a velocity.
   */
  canTrackVelocity = false;
  /**
   * init - The initiating value
   * config - Optional configuration options
   */
  constructor(init) {
    this.prev = this.current = init;
    this.canTrackVelocity = isFloat(this.current);
  }
  /**
   * Adds a function that will be notified when the `MotionValue` is updated.
   *
   * It returns a function that, when called, will cancel the subscription.
   */
  onChange(subscription) {
    return this.updateSubscribers.add(subscription);
  }
  clearListeners() {
    this.updateSubscribers.clear();
  }
  /**
   * Sets the state of the `MotionValue`.
   *
   * @param v
   * @param render
   */
  set(v) {
    this.updateAndNotify(v);
  }
  /**
   * Update and notify `MotionValue` subscribers.
   *
   * @param v
   * @param render
   */
  updateAndNotify = (v) => {
    this.prev = this.current;
    this.current = v;
    const { delta, timestamp } = getFrameData();
    if (this.lastUpdated !== timestamp) {
      this.timeDelta = delta;
      this.lastUpdated = timestamp;
    }
    sync.postRender(this.scheduleVelocityCheck);
    this.updateSubscribers.notify(this.current);
  };
  /**
   * Returns the latest state of `MotionValue`
   *
   * @returns - The latest state of `MotionValue`
   */
  get() {
    return this.current;
  }
  /**
   * Get previous value.
   *
   * @returns - The previous latest state of `MotionValue`
   */
  getPrevious() {
    return this.prev;
  }
  /**
   * Returns the latest velocity of `MotionValue`
   *
   * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
   */
  getVelocity() {
    return this.canTrackVelocity ? velocityPerSecond(Number.parseFloat(this.current) - Number.parseFloat(this.prev), this.timeDelta) : 0;
  }
  /**
   * Schedule a velocity check for the next frame.
   */
  scheduleVelocityCheck = () => sync.postRender(this.velocityCheck);
  /**
   * Updates `prev` with `current` if the value hasn't been updated this frame.
   * This ensures velocity calculations return `0`.
   */
  velocityCheck = ({ timestamp }) => {
    if (!this.canTrackVelocity)
      this.canTrackVelocity = isFloat(this.current);
    if (timestamp !== this.lastUpdated)
      this.prev = this.current;
  };
  /**
   * Registers a new animation to control this `MotionValue`. Only one
   * animation can drive a `MotionValue` at one time.
   */
  start(animation) {
    this.stop();
    return new Promise((resolve) => {
      const { stop } = animation(resolve);
      this.stopAnimation = stop;
    }).then(() => this.clearAnimation());
  }
  /**
   * Stop the currently active animation.
   */
  stop() {
    if (this.stopAnimation)
      this.stopAnimation();
    this.clearAnimation();
  }
  /**
   * Returns `true` if this value is currently animating.
   */
  isAnimating() {
    return !!this.stopAnimation;
  }
  /**
   * Clear the current animation reference.
   */
  clearAnimation() {
    this.stopAnimation = null;
  }
  /**
   * Destroy and clean up subscribers to this `MotionValue`.
   */
  destroy() {
    this.updateSubscribers.clear();
    this.stop();
  }
}
function getMotionValue(init) {
  return new MotionValue(init);
}
const { isArray } = Array;
function useMotionValues() {
  const motionValues = ref({});
  const stop = (keys) => {
    const destroyKey = (key) => {
      if (!motionValues.value[key])
        return;
      motionValues.value[key].stop();
      motionValues.value[key].destroy();
      delete motionValues.value[key];
    };
    if (keys) {
      if (isArray(keys)) {
        keys.forEach(destroyKey);
      } else {
        destroyKey(keys);
      }
    } else {
      Object.keys(motionValues.value).forEach(destroyKey);
    }
  };
  const get = (key, from, target) => {
    if (motionValues.value[key])
      return motionValues.value[key];
    const motionValue = getMotionValue(from);
    motionValue.onChange((v) => target[key] = v);
    motionValues.value[key] = motionValue;
    return motionValue;
  };
  tryOnUnmounted();
  return {
    motionValues,
    get,
    stop
  };
}
function isKeyframesTarget(v) {
  return Array.isArray(v);
}
function underDampedSpring() {
  return {
    type: "spring",
    stiffness: 500,
    damping: 25,
    restDelta: 0.5,
    restSpeed: 10
  };
}
function criticallyDampedSpring(to) {
  return {
    type: "spring",
    stiffness: 550,
    damping: to === 0 ? 2 * Math.sqrt(550) : 30,
    restDelta: 0.01,
    restSpeed: 10
  };
}
function overDampedSpring(to) {
  return {
    type: "spring",
    stiffness: 550,
    damping: to === 0 ? 100 : 30,
    restDelta: 0.01,
    restSpeed: 10
  };
}
function linearTween() {
  return {
    type: "keyframes",
    ease: "linear",
    duration: 300
  };
}
function keyframes(values) {
  return {
    type: "keyframes",
    duration: 800,
    values
  };
}
const defaultTransitions = {
  default: overDampedSpring,
  x: underDampedSpring,
  y: underDampedSpring,
  z: underDampedSpring,
  rotate: underDampedSpring,
  rotateX: underDampedSpring,
  rotateY: underDampedSpring,
  rotateZ: underDampedSpring,
  scaleX: criticallyDampedSpring,
  scaleY: criticallyDampedSpring,
  scale: criticallyDampedSpring,
  backgroundColor: linearTween,
  color: linearTween,
  opacity: linearTween
};
function getDefaultTransition(valueKey, to) {
  let transitionFactory;
  if (isKeyframesTarget(to)) {
    transitionFactory = keyframes;
  } else {
    transitionFactory = defaultTransitions[valueKey] || defaultTransitions.default;
  }
  return { to, ...transitionFactory(to) };
}
const int = {
  ...number,
  transform: Math.round
};
const valueTypes = {
  // Color props
  color,
  backgroundColor: color,
  outlineColor: color,
  fill: color,
  stroke: color,
  // Border props
  borderColor: color,
  borderTopColor: color,
  borderRightColor: color,
  borderBottomColor: color,
  borderLeftColor: color,
  borderWidth: px,
  borderTopWidth: px,
  borderRightWidth: px,
  borderBottomWidth: px,
  borderLeftWidth: px,
  borderRadius: px,
  radius: px,
  borderTopLeftRadius: px,
  borderTopRightRadius: px,
  borderBottomRightRadius: px,
  borderBottomLeftRadius: px,
  // Positioning props
  width: px,
  maxWidth: px,
  height: px,
  maxHeight: px,
  size: px,
  top: px,
  right: px,
  bottom: px,
  left: px,
  // Spacing props
  padding: px,
  paddingTop: px,
  paddingRight: px,
  paddingBottom: px,
  paddingLeft: px,
  margin: px,
  marginTop: px,
  marginRight: px,
  marginBottom: px,
  marginLeft: px,
  // Transform props
  rotate: degrees,
  rotateX: degrees,
  rotateY: degrees,
  rotateZ: degrees,
  scale,
  scaleX: scale,
  scaleY: scale,
  scaleZ: scale,
  skew: degrees,
  skewX: degrees,
  skewY: degrees,
  distance: px,
  translateX: px,
  translateY: px,
  translateZ: px,
  x: px,
  y: px,
  z: px,
  perspective: px,
  transformPerspective: px,
  opacity: alpha,
  originX: progressPercentage,
  originY: progressPercentage,
  originZ: px,
  // Misc
  zIndex: int,
  filter,
  WebkitFilter: filter,
  // SVG
  fillOpacity: alpha,
  strokeOpacity: alpha,
  numOctaves: int
};
const getValueType = (key) => valueTypes[key];
function getValueAsType(value, type) {
  return type && typeof value === "number" && type.transform ? type.transform(value) : value;
}
function getAnimatableNone(key, value) {
  let defaultValueType = getValueType(key);
  if (defaultValueType !== filter)
    defaultValueType = complex;
  return defaultValueType.getAnimatableNone ? defaultValueType.getAnimatableNone(value) : void 0;
}
const easingLookup = {
  linear,
  easeIn,
  easeInOut,
  easeOut,
  circIn,
  circInOut,
  circOut,
  backIn,
  backInOut,
  backOut,
  anticipate,
  bounceIn,
  bounceInOut,
  bounceOut
};
function easingDefinitionToFunction(definition) {
  if (Array.isArray(definition)) {
    const [x1, y1, x2, y2] = definition;
    return cubicBezier(x1, y1, x2, y2);
  } else if (typeof definition === "string") {
    return easingLookup[definition];
  }
  return definition;
}
function isEasingArray(ease) {
  return Array.isArray(ease) && typeof ease[0] !== "number";
}
function isAnimatable(key, value) {
  if (key === "zIndex")
    return false;
  if (typeof value === "number" || Array.isArray(value))
    return true;
  if (typeof value === "string" && complex.test(value) && !value.startsWith("url(")) {
    return true;
  }
  return false;
}
function hydrateKeyframes(options) {
  if (Array.isArray(options.to) && options.to[0] === null) {
    options.to = [...options.to];
    options.to[0] = options.from;
  }
  return options;
}
function convertTransitionToAnimationOptions({ ease, times, delay, ...transition }) {
  const options = { ...transition };
  if (times)
    options.offset = times;
  if (ease) {
    options.ease = isEasingArray(ease) ? ease.map(easingDefinitionToFunction) : easingDefinitionToFunction(ease);
  }
  if (delay)
    options.elapsed = -delay;
  return options;
}
function getPopmotionAnimationOptions(transition, options, key) {
  if (Array.isArray(options.to)) {
    if (!transition.duration)
      transition.duration = 800;
  }
  hydrateKeyframes(options);
  if (!isTransitionDefined(transition)) {
    transition = {
      ...transition,
      ...getDefaultTransition(key, options.to)
    };
  }
  return {
    ...options,
    ...convertTransitionToAnimationOptions(transition)
  };
}
function isTransitionDefined({ delay, repeat, repeatType, repeatDelay, from, ...transition }) {
  return !!Object.keys(transition).length;
}
function getValueTransition(transition, key) {
  return transition[key] || transition.default || transition;
}
function getAnimation(key, value, target, transition, onComplete) {
  const valueTransition = getValueTransition(transition, key);
  let origin = valueTransition.from === null || valueTransition.from === void 0 ? value.get() : valueTransition.from;
  const isTargetAnimatable = isAnimatable(key, target);
  if (origin === "none" && isTargetAnimatable && typeof target === "string")
    origin = getAnimatableNone(key, target);
  const isOriginAnimatable = isAnimatable(key, origin);
  function start(complete) {
    const options = {
      from: origin,
      to: target,
      velocity: transition.velocity ? transition.velocity : value.getVelocity(),
      onUpdate: (v) => value.set(v)
    };
    return valueTransition.type === "inertia" || valueTransition.type === "decay" ? inertia({ ...options, ...valueTransition }) : animate({
      ...getPopmotionAnimationOptions(valueTransition, options, key),
      onUpdate: (v) => {
        options.onUpdate(v);
        if (valueTransition.onUpdate)
          valueTransition.onUpdate(v);
      },
      onComplete: () => {
        if (onComplete)
          onComplete();
        if (complete)
          complete();
      }
    });
  }
  function set(complete) {
    value.set(target);
    if (onComplete)
      onComplete();
    if (complete)
      complete();
    return { stop: () => {
    } };
  }
  return !isOriginAnimatable || !isTargetAnimatable || valueTransition.type === false ? set : start;
}
function useMotionTransitions() {
  const { motionValues, stop, get } = useMotionValues();
  const push = (key, value, target, transition = {}, onComplete) => {
    const from = target[key];
    const motionValue = get(key, from, target);
    if (transition && transition.immediate) {
      motionValue.set(value);
      return;
    }
    const animation = getAnimation(key, motionValue, value, transition, onComplete);
    motionValue.start(animation);
  };
  return { motionValues, stop, push };
}
function useMotionControls(motionProperties, variants = {}, { motionValues, push, stop } = useMotionTransitions()) {
  const _variants = unref(variants);
  const isAnimating = ref(false);
  watch(
    motionValues,
    (newVal) => {
      isAnimating.value = Object.values(newVal).filter((value) => value.isAnimating()).length > 0;
    },
    {
      immediate: true,
      deep: true
    }
  );
  const getVariantFromKey = (variant) => {
    if (!_variants || !_variants[variant])
      throw new Error(`The variant ${variant} does not exist.`);
    return _variants[variant];
  };
  const apply = (variant) => {
    if (typeof variant === "string")
      variant = getVariantFromKey(variant);
    const animations = Object.entries(variant).map(([key, value]) => {
      if (key === "transition")
        return void 0;
      return new Promise(
        (resolve) => (
          // @ts-expect-error - Fix errors later for typescript 5
          push(key, value, motionProperties, variant.transition || getDefaultTransition(key, variant[key]), resolve)
        )
      );
    }).filter(Boolean);
    async function waitForComplete() {
      await Promise.all(animations);
      variant.transition?.onComplete?.();
    }
    return Promise.all([waitForComplete()]);
  };
  const set = (variant) => {
    const variantData = isObject$1(variant) ? variant : getVariantFromKey(variant);
    Object.entries(variantData).forEach(([key, value]) => {
      if (key === "transition")
        return;
      push(key, value, motionProperties, {
        immediate: true
      });
    });
  };
  const leave = async (done) => {
    let leaveVariant;
    if (_variants) {
      if (_variants.leave)
        leaveVariant = _variants.leave;
      if (!_variants.leave && _variants.initial)
        leaveVariant = _variants.initial;
    }
    if (!leaveVariant) {
      done();
      return;
    }
    await apply(leaveVariant);
    done();
  };
  return {
    isAnimating,
    apply,
    set,
    leave,
    stop
  };
}
function registerEventListeners({ target, state, variants, apply }) {
  const _variants = unref(variants);
  const hovered = ref(false);
  const tapped = ref(false);
  const focused = ref(false);
  const mutableKeys = computed(() => {
    let result = [...Object.keys(state.value || {})];
    if (!_variants)
      return result;
    if (_variants.hovered)
      result = [...result, ...Object.keys(_variants.hovered)];
    if (_variants.tapped)
      result = [...result, ...Object.keys(_variants.tapped)];
    if (_variants.focused)
      result = [...result, ...Object.keys(_variants.focused)];
    return result;
  });
  const computedProperties = computed(() => {
    const result = {};
    Object.assign(result, state.value);
    if (hovered.value && _variants.hovered)
      Object.assign(result, _variants.hovered);
    if (tapped.value && _variants.tapped)
      Object.assign(result, _variants.tapped);
    if (focused.value && _variants.focused)
      Object.assign(result, _variants.focused);
    for (const key in result) {
      if (!mutableKeys.value.includes(key))
        delete result[key];
    }
    return result;
  });
  if (_variants.hovered) {
    useEventListener(target, "mouseenter", () => hovered.value = true);
    useEventListener(target, "mouseleave", () => {
      hovered.value = false;
      tapped.value = false;
    });
  }
  if (_variants.tapped) ;
  if (_variants.focused) {
    useEventListener(target, "focus", () => focused.value = true);
    useEventListener(target, "blur", () => focused.value = false);
  }
  watch([hovered, tapped, focused], () => {
    apply(computedProperties.value);
  });
}
function registerLifeCycleHooks({ set, target, variants, variant }) {
  const _variants = unref(variants);
  watch(
    () => target,
    () => {
      if (!_variants)
        return;
      if (_variants.initial) {
        set("initial");
        variant.value = "initial";
      }
      if (_variants.enter)
        variant.value = "enter";
    },
    {
      immediate: true,
      flush: "pre"
    }
  );
}
function registerVariantsSync({ state, apply }) {
  watch(
    state,
    (newVal) => {
      if (newVal)
        apply(newVal);
    },
    {
      immediate: true
    }
  );
}
function registerVisibilityHooks({ target, variants, variant }) {
  const _variants = unref(variants);
  if (_variants && (_variants.visible || _variants.visibleOnce)) {
    useIntersectionObserver(target, ([{ isIntersecting }]) => {
      if (_variants.visible) {
        if (isIntersecting)
          variant.value = "visible";
        else variant.value = "initial";
      } else if (_variants.visibleOnce) {
        if (isIntersecting && variant.value !== "visibleOnce")
          variant.value = "visibleOnce";
        else if (!variant.value)
          variant.value = "initial";
      }
    });
  }
}
function useMotionFeatures(instance, options = {
  syncVariants: true,
  lifeCycleHooks: true,
  visibilityHooks: true,
  eventListeners: true
}) {
  if (options.lifeCycleHooks)
    registerLifeCycleHooks(instance);
  if (options.syncVariants)
    registerVariantsSync(instance);
  if (options.visibilityHooks)
    registerVisibilityHooks(instance);
  if (options.eventListeners)
    registerEventListeners(instance);
}
function reactiveStyle(props = {}) {
  const state = reactive({
    ...props
  });
  const style = ref({});
  watch(
    state,
    () => {
      const result = {};
      for (const [key, value] of Object.entries(state)) {
        const valueType = getValueType(key);
        const valueAsType = getValueAsType(value, valueType);
        result[key] = valueAsType;
      }
      style.value = result;
    },
    {
      immediate: true,
      deep: true
    }
  );
  return {
    state,
    style
  };
}
function usePermissiveTarget(target, onTarget) {
  watch(
    () => unrefElement(target),
    (el) => {
      if (!el)
        return;
      onTarget(el);
    },
    {
      immediate: true
    }
  );
}
const translateAlias = {
  x: "translateX",
  y: "translateY",
  z: "translateZ"
};
function reactiveTransform(props = {}, enableHardwareAcceleration = true) {
  const state = reactive({ ...props });
  const transform = ref("");
  watch(
    state,
    (newVal) => {
      let result = "";
      let hasHardwareAcceleration = false;
      if (enableHardwareAcceleration && (newVal.x || newVal.y || newVal.z)) {
        const str = [newVal.x || 0, newVal.y || 0, newVal.z || 0].map((val) => getValueAsType(val, px)).join(",");
        result += `translate3d(${str}) `;
        hasHardwareAcceleration = true;
      }
      for (const [key, value] of Object.entries(newVal)) {
        if (enableHardwareAcceleration && (key === "x" || key === "y" || key === "z"))
          continue;
        const valueType = getValueType(key);
        const valueAsType = getValueAsType(value, valueType);
        result += `${translateAlias[key] || key}(${valueAsType}) `;
      }
      if (enableHardwareAcceleration && !hasHardwareAcceleration)
        result += "translateZ(0px) ";
      transform.value = result.trim();
    },
    {
      immediate: true,
      deep: true
    }
  );
  return {
    state,
    transform
  };
}
const transformAxes = ["", "X", "Y", "Z"];
const order = ["perspective", "translate", "scale", "rotate", "skew"];
const transformProps = ["transformPerspective", "x", "y", "z"];
order.forEach((operationKey) => {
  transformAxes.forEach((axesKey) => {
    const key = operationKey + axesKey;
    transformProps.push(key);
  });
});
const transformPropSet = new Set(transformProps);
function isTransformProp(key) {
  return transformPropSet.has(key);
}
const transformOriginProps = /* @__PURE__ */ new Set(["originX", "originY", "originZ"]);
function isTransformOriginProp(key) {
  return transformOriginProps.has(key);
}
function splitValues(variant) {
  const transform = {};
  const style = {};
  Object.entries(variant).forEach(([key, value]) => {
    if (isTransformProp(key) || isTransformOriginProp(key))
      transform[key] = value;
    else style[key] = value;
  });
  return { transform, style };
}
function variantToStyle(variant) {
  const { transform: _transform, style: _style } = splitValues(variant);
  const { transform } = reactiveTransform(_transform);
  const { style } = reactiveStyle(_style);
  if (transform.value)
    style.value.transform = transform.value;
  return style.value;
}
function useElementStyle(target, onInit) {
  let _cache;
  let _target;
  const { state, style } = reactiveStyle();
  usePermissiveTarget(target, (el) => {
    _target = el;
    for (const key of Object.keys(valueTypes)) {
      if (el.style[key] === null || el.style[key] === "" || isTransformProp(key) || isTransformOriginProp(key))
        continue;
      state[key] = el.style[key];
    }
    if (_cache) {
      Object.entries(_cache).forEach(([key, value]) => el.style[key] = value);
    }
    if (onInit)
      onInit(state);
  });
  watch(
    style,
    (newVal) => {
      if (!_target) {
        _cache = newVal;
        return;
      }
      for (const key in newVal) _target.style[key] = newVal[key];
    },
    {
      immediate: true
    }
  );
  return {
    style: state
  };
}
function parseTransform(transform) {
  const transforms = transform.trim().split(/\) |\)/);
  if (transforms.length === 1)
    return {};
  const parseValues = (value) => {
    if (value.endsWith("px") || value.endsWith("deg"))
      return Number.parseFloat(value);
    if (Number.isNaN(Number(value)))
      return Number(value);
    return value;
  };
  return transforms.reduce((acc, transform2) => {
    if (!transform2)
      return acc;
    const [name, transformValue] = transform2.split("(");
    const valueArray = transformValue.split(",");
    const values = valueArray.map((val) => {
      return parseValues(val.endsWith(")") ? val.replace(")", "") : val.trim());
    });
    const value = values.length === 1 ? values[0] : values;
    return {
      ...acc,
      [name]: value
    };
  }, {});
}
function stateFromTransform(state, transform) {
  Object.entries(parseTransform(transform)).forEach(([key, value]) => {
    const axes = ["x", "y", "z"];
    if (key === "translate3d") {
      if (value === 0) {
        axes.forEach((axis) => state[axis] = 0);
        return;
      }
      value.forEach((axisValue, index) => state[axes[index]] = axisValue);
      return;
    }
    value = Number.parseFloat(`${value}`);
    if (key === "translateX") {
      state.x = value;
      return;
    }
    if (key === "translateY") {
      state.y = value;
      return;
    }
    if (key === "translateZ") {
      state.z = value;
      return;
    }
    state[key] = value;
  });
}
function useElementTransform(target, onInit) {
  let _cache;
  let _target;
  const { state, transform } = reactiveTransform();
  usePermissiveTarget(target, (el) => {
    _target = el;
    if (el.style.transform)
      stateFromTransform(state, el.style.transform);
    if (_cache)
      el.style.transform = _cache;
    if (onInit)
      onInit(state);
  });
  watch(
    transform,
    (newValue) => {
      if (!_target) {
        _cache = newValue;
        return;
      }
      _target.style.transform = newValue;
    },
    {
      immediate: true
    }
  );
  return {
    transform: state
  };
}
function objectEntries(obj) {
  return Object.entries(obj);
}
function useMotionProperties(target, defaultValues) {
  const motionProperties = reactive({});
  const apply = (values) => Object.entries(values).forEach(([key, value]) => motionProperties[key] = value);
  const { style } = useElementStyle(target, apply);
  const { transform } = useElementTransform(target, apply);
  watch(
    motionProperties,
    (newVal) => {
      objectEntries(newVal).forEach(([key, value]) => {
        const target2 = isTransformProp(key) ? transform : style;
        if (target2[key] && target2[key] === value)
          return;
        target2[key] = value;
      });
    },
    {
      immediate: true,
      deep: true
    }
  );
  usePermissiveTarget(target, () => defaultValues);
  return {
    motionProperties,
    style,
    transform
  };
}
function useMotionVariants(variants = {}) {
  const _variants = unref(variants);
  const variant = ref();
  const state = computed(() => {
    if (!variant.value)
      return;
    return _variants[variant.value];
  });
  return {
    state,
    variant
  };
}
function useMotion(target, variants = {}, options) {
  const { motionProperties } = useMotionProperties(target);
  const { variant, state } = useMotionVariants(variants);
  const controls = useMotionControls(motionProperties, variants);
  const instance = {
    target,
    variant,
    variants,
    state,
    motionProperties,
    ...controls
  };
  useMotionFeatures(instance, options);
  return instance;
}
const fade = {
  initial: {
    opacity: 0
  },
  enter: {
    opacity: 1
  }
};
const fadeVisible = {
  initial: {
    opacity: 0
  },
  visible: {
    opacity: 1
  }
};
const fadeVisibleOnce = {
  initial: {
    opacity: 0
  },
  visibleOnce: {
    opacity: 1
  }
};
const pop = {
  initial: {
    scale: 0,
    opacity: 0
  },
  enter: {
    scale: 1,
    opacity: 1
  }
};
const popVisible = {
  initial: {
    scale: 0,
    opacity: 0
  },
  visible: {
    scale: 1,
    opacity: 1
  }
};
const popVisibleOnce = {
  initial: {
    scale: 0,
    opacity: 0
  },
  visibleOnce: {
    scale: 1,
    opacity: 1
  }
};
const rollLeft = {
  initial: {
    x: -100,
    rotate: 90,
    opacity: 0
  },
  enter: {
    x: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollVisibleLeft = {
  initial: {
    x: -100,
    rotate: 90,
    opacity: 0
  },
  visible: {
    x: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollVisibleOnceLeft = {
  initial: {
    x: -100,
    rotate: 90,
    opacity: 0
  },
  visibleOnce: {
    x: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollRight = {
  initial: {
    x: 100,
    rotate: -90,
    opacity: 0
  },
  enter: {
    x: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollVisibleRight = {
  initial: {
    x: 100,
    rotate: -90,
    opacity: 0
  },
  visible: {
    x: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollVisibleOnceRight = {
  initial: {
    x: 100,
    rotate: -90,
    opacity: 0
  },
  visibleOnce: {
    x: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollTop = {
  initial: {
    y: -100,
    rotate: -90,
    opacity: 0
  },
  enter: {
    y: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollVisibleTop = {
  initial: {
    y: -100,
    rotate: -90,
    opacity: 0
  },
  visible: {
    y: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollVisibleOnceTop = {
  initial: {
    y: -100,
    rotate: -90,
    opacity: 0
  },
  visibleOnce: {
    y: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollBottom = {
  initial: {
    y: 100,
    rotate: 90,
    opacity: 0
  },
  enter: {
    y: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollVisibleBottom = {
  initial: {
    y: 100,
    rotate: 90,
    opacity: 0
  },
  visible: {
    y: 0,
    rotate: 0,
    opacity: 1
  }
};
const rollVisibleOnceBottom = {
  initial: {
    y: 100,
    rotate: 90,
    opacity: 0
  },
  visibleOnce: {
    y: 0,
    rotate: 0,
    opacity: 1
  }
};
const slideLeft = {
  initial: {
    x: -100,
    opacity: 0
  },
  enter: {
    x: 0,
    opacity: 1
  }
};
const slideVisibleLeft = {
  initial: {
    x: -100,
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1
  }
};
const slideVisibleOnceLeft = {
  initial: {
    x: -100,
    opacity: 0
  },
  visibleOnce: {
    x: 0,
    opacity: 1
  }
};
const slideRight = {
  initial: {
    x: 100,
    opacity: 0
  },
  enter: {
    x: 0,
    opacity: 1
  }
};
const slideVisibleRight = {
  initial: {
    x: 100,
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1
  }
};
const slideVisibleOnceRight = {
  initial: {
    x: 100,
    opacity: 0
  },
  visibleOnce: {
    x: 0,
    opacity: 1
  }
};
const slideTop = {
  initial: {
    y: -100,
    opacity: 0
  },
  enter: {
    y: 0,
    opacity: 1
  }
};
const slideVisibleTop = {
  initial: {
    y: -100,
    opacity: 0
  },
  visible: {
    y: 0,
    opacity: 1
  }
};
const slideVisibleOnceTop = {
  initial: {
    y: -100,
    opacity: 0
  },
  visibleOnce: {
    y: 0,
    opacity: 1
  }
};
const slideBottom = {
  initial: {
    y: 100,
    opacity: 0
  },
  enter: {
    y: 0,
    opacity: 1
  }
};
const slideVisibleBottom = {
  initial: {
    y: 100,
    opacity: 0
  },
  visible: {
    y: 0,
    opacity: 1
  }
};
const slideVisibleOnceBottom = {
  initial: {
    y: 100,
    opacity: 0
  },
  visibleOnce: {
    y: 0,
    opacity: 1
  }
};
const presets = {
  __proto__: null,
  fade,
  fadeVisible,
  fadeVisibleOnce,
  pop,
  popVisible,
  popVisibleOnce,
  rollBottom,
  rollLeft,
  rollRight,
  rollTop,
  rollVisibleBottom,
  rollVisibleLeft,
  rollVisibleOnceBottom,
  rollVisibleOnceLeft,
  rollVisibleOnceRight,
  rollVisibleOnceTop,
  rollVisibleRight,
  rollVisibleTop,
  slideBottom,
  slideLeft,
  slideRight,
  slideTop,
  slideVisibleBottom,
  slideVisibleLeft,
  slideVisibleOnceBottom,
  slideVisibleOnceLeft,
  slideVisibleOnceRight,
  slideVisibleOnceTop,
  slideVisibleRight,
  slideVisibleTop
};
const CUSTOM_PRESETS = Symbol(
  ""
);
const MotionComponentProps = {
  // Preset to be loaded
  preset: {
    type: String,
    required: false
  },
  // Instance
  instance: {
    type: Object,
    required: false
  },
  // Variants
  variants: {
    type: Object,
    required: false
  },
  // Initial variant
  initial: {
    type: Object,
    required: false
  },
  // Lifecycle hooks variants
  enter: {
    type: Object,
    required: false
  },
  leave: {
    type: Object,
    required: false
  },
  // Intersection observer variants
  visible: {
    type: Object,
    required: false
  },
  visibleOnce: {
    type: Object,
    required: false
  },
  // Event listeners variants
  hovered: {
    type: Object,
    required: false
  },
  tapped: {
    type: Object,
    required: false
  },
  focused: {
    type: Object,
    required: false
  },
  // Helpers
  delay: {
    type: [Number, String],
    required: false
  },
  duration: {
    type: [Number, String],
    required: false
  }
};
function isObject(val) {
  return Object.prototype.toString.call(val) === "[object Object]";
}
function clone(v) {
  if (Array.isArray(v)) {
    return v.map(clone);
  }
  if (isObject(v)) {
    const res = {};
    for (const key in v) {
      res[key] = clone(v[key]);
    }
    return res;
  }
  return v;
}
function setupMotionComponent(props) {
  const instances = reactive({});
  const customPresets = inject(CUSTOM_PRESETS, {});
  const preset = computed(() => {
    if (props.preset == null) {
      return {};
    }
    if (customPresets != null && props.preset in customPresets) {
      return structuredClone(toRaw(customPresets)[props.preset]);
    }
    if (props.preset in presets) {
      return structuredClone(presets[props.preset]);
    }
    return {};
  });
  const propsConfig = computed(() => ({
    initial: props.initial,
    enter: props.enter,
    leave: props.leave,
    visible: props.visible,
    visibleOnce: props.visibleOnce,
    hovered: props.hovered,
    tapped: props.tapped,
    focused: props.focused
  }));
  function applyTransitionHelpers(config, values) {
    for (const transitionKey of ["delay", "duration"]) {
      if (values[transitionKey] == null)
        continue;
      const transitionValueParsed = Number.parseInt(
        values[transitionKey]
      );
      for (const variantKey of ["enter", "visible", "visibleOnce"]) {
        const variantConfig = config[variantKey];
        if (variantConfig == null)
          continue;
        variantConfig.transition ??= {};
        variantConfig.transition[transitionKey] = transitionValueParsed;
      }
    }
    return config;
  }
  const motionConfig = computed(() => {
    const config = defu(
      {},
      propsConfig.value,
      preset.value,
      props.variants || {}
    );
    return applyTransitionHelpers({ ...config }, props);
  });
  function setNodeInstance(node, index, style) {
    node.props ??= {};
    node.props.style ??= {};
    node.props.style = { ...node.props.style, ...style };
    const elementMotionConfig = applyTransitionHelpers(
      clone(motionConfig.value),
      node.props
    );
    node.props.onVnodeMounted = ({ el }) => {
      instances[index] = useMotion(
        el,
        elementMotionConfig
      );
    };
    node.props.onVnodeUpdated = ({ el }) => {
      const styles = variantToStyle(instances[index].state);
      for (const [key, val] of Object.entries(styles)) {
        el.style[key] = val;
      }
    };
    return node;
  }
  return {
    motionConfig,
    setNodeInstance
  };
}
defineComponent({
  name: "Motion",
  props: {
    ...MotionComponentProps,
    is: {
      type: [String, Object],
      default: "div"
    }
  },
  setup(props) {
    const slots = useSlots();
    const { motionConfig, setNodeInstance } = setupMotionComponent(props);
    return () => {
      const style = variantToStyle(motionConfig.value.initial || {});
      const node = h(props.is, void 0, slots);
      setNodeInstance(node, 0, style);
      return node;
    };
  }
});
defineComponent({
  name: "MotionGroup",
  props: {
    ...MotionComponentProps,
    is: {
      type: [String, Object],
      required: false
    }
  },
  setup(props) {
    const slots = useSlots();
    const { motionConfig, setNodeInstance } = setupMotionComponent(props);
    return () => {
      const style = variantToStyle(motionConfig.value.initial || {});
      const nodes = slots.default?.() || [];
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.type === Fragment && Array.isArray(n.children)) {
          n.children.forEach(function setChildInstance(child, index) {
            if (child == null)
              return;
            if (Array.isArray(child)) {
              setChildInstance(child, index);
              return;
            }
            if (typeof child === "object") {
              setNodeInstance(child, index, style);
            }
          });
        } else {
          setNodeInstance(n, i, style);
        }
      }
      if (props.is) {
        return h(props.is, void 0, nodes);
      }
      return nodes;
    };
  }
});
const Z_INDEX = {
  /** 一般內容層（預設） */
  BASE: 0,
  /** 下拉選單 */
  DROPDOWN: 100,
  /** 固定導航列 */
  STICKY: 200,
  /** 卡片動畫層 */
  ANIMATION: 500,
  /** 遮罩層（半透明背景） */
  OVERLAY: 1e3,
  /** Modal 對話框 */
  MODAL: 1100,
  /** 側邊面板（ActionPanel 內容） */
  PANEL: 1200,
  /** Toast 訊息 */
  TOAST: 1300,
  /** Tooltip 提示 */
  TOOLTIP: 1400,
  /** 重連提示（最高優先級） */
  RECONNECTION: 1500
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ActionPanel",
  __ssrInlineRender: true,
  props: {
    isOpen: { type: Boolean },
    items: {}
  },
  emits: ["close"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const panelRef = ref(null);
    const initMotion = () => {
      if (!panelRef.value) return;
      useMotion(panelRef.value, {
        initial: {
          x: 320,
          // 從右側 320px 外開始
          opacity: 0
        },
        enter: {
          x: 0,
          opacity: 1,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 30
          }
        },
        leave: {
          x: 320,
          opacity: 0,
          transition: {
            duration: 200
          }
        }
      });
    };
    watch(
      () => props.isOpen,
      (newValue) => {
        if (newValue && panelRef.value) {
          initMotion();
        }
      },
      { immediate: true }
    );
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderTeleport(_push, (_push2) => {
        if (__props.isOpen) {
          _push2(`<div class="fixed inset-0 flex items-center justify-end" style="${ssrRenderStyle({ zIndex: unref(Z_INDEX).OVERLAY })}" data-v-78a7b4c7><div data-testid="panel-overlay" class="absolute inset-0 bg-black/50 transition-opacity" data-v-78a7b4c7></div><div data-testid="action-panel" role="dialog" aria-label="Action menu" class="relative right-0 h-full w-80 bg-white shadow-2xl flex flex-col" style="${ssrRenderStyle({ zIndex: unref(Z_INDEX).PANEL })}" data-v-78a7b4c7><div class="flex items-center justify-between p-4 border-b border-gray-200" data-v-78a7b4c7><h2 class="text-lg font-semibold text-gray-900" data-v-78a7b4c7>Menu</h2><button data-testid="close-button" aria-label="Close menu" class="p-2 rounded-lg hover:bg-gray-100 transition-colors" data-v-78a7b4c7><svg class="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" data-v-78a7b4c7><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" data-v-78a7b4c7></path></svg></button></div><nav class="flex-1 overflow-y-auto p-2" data-v-78a7b4c7><ul class="space-y-1" data-v-78a7b4c7><!--[-->`);
          ssrRenderList(__props.items, (item) => {
            _push2(`<li data-v-78a7b4c7><button data-testid="menu-item" class="w-full text-left px-4 py-3 rounded-lg hover:bg-primary-50 transition-colors flex items-center space-x-3" data-v-78a7b4c7>`);
            if (item.icon) {
              _push2(`<span class="text-xl" data-v-78a7b4c7>${ssrInterpolate(item.icon)}</span>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<span class="text-base font-medium text-gray-900" data-v-78a7b4c7>${ssrInterpolate(item.label)}</span></button></li>`);
          });
          _push2(`<!--]--></ul>`);
          if (__props.items.length === 0) {
            _push2(`<div class="text-center py-8 text-gray-500" data-v-78a7b4c7> No options available </div>`);
          } else {
            _push2(`<!---->`);
          }
          _push2(`</nav><div class="p-4 border-t border-gray-200 text-xs text-gray-500 text-center" data-v-78a7b4c7> Hanafuda Koi-Koi </div></div></div>`);
        } else {
          _push2(`<!---->`);
        }
      }, "body", false, _parent);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/ActionPanel.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const ActionPanel = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main, [["__scopeId", "data-v-78a7b4c7"]]), { __name: "ActionPanel" });
const useMatchmakingStateStore = defineStore("matchmakingState", {
  state: () => ({
    status: "idle",
    sessionToken: null,
    errorMessage: null
  }),
  getters: {
    /**
     * 是否正在配對中
     */
    isFinding: (state) => state.status === "finding",
    /**
     * 是否處於錯誤狀態
     */
    hasError: (state) => state.status === "error",
    /**
     * 是否可以開始新的配對
     */
    canStartMatchmaking: (state) => state.status === "idle"
  },
  actions: {
    // === MatchmakingStatePort 實作 ===
    setStatus(status) {
      this.status = status;
    },
    setSessionToken(token) {
      this.sessionToken = token;
    },
    setErrorMessage(message) {
      this.errorMessage = message;
    },
    clearSession() {
      this.status = "idle";
      this.sessionToken = null;
      this.errorMessage = null;
    }
  }
});

export { ActionPanel as A, TopInfoBar as T, Z_INDEX as Z, useUIStateStore as a, useMatchmakingStateStore as b, useDependency as c, TOKENS as d, useMotion as e, useOptionalDependency as f, useGameStateStore as u };
//# sourceMappingURL=matchmakingState-CqgFMnU2.mjs.map
