/**
 * GameStatePort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責管理遊戲狀態的更新與查詢。
 *
 * 此 Port 是原 UIStatePort 的重新命名與調整版本，
 * 更清晰地表達「遊戲狀態管理」的職責。
 *
 * 與其他 Port 的區別：
 * - GameStatePort: 純數據狀態（同步更新）
 * - AnimationPort: 動畫效果（異步 await）
 * - NotificationPort: 通知 UI（同步觸發）
 *
 * 使用於：
 * - All Handle*UseCase（事件處理器）
 * - Player Operations（讀取當前狀態）
 *
 * @example
 * ```typescript
 * // Use Case 中使用
 * class HandleTurnCompletedUseCase {
 *   constructor(
 *     private gameState: GameStatePort,
 *     private animation: AnimationPort
 *   ) {}
 *
 *   async execute(event: TurnCompletedEvent): Promise<void> {
 *     // 先動畫，後狀態
 *     await this.animation.playMatchAnimation(...)
 *     this.gameState.updateFieldCards(event.fieldCards)
 *     this.gameState.updateDepositoryCards(...)
 *   }
 * }
 * ```
 */

import type {
  FlowState,
  PlayerInfo,
  Ruleset,
  GameSnapshotRestore,
  YakuScore,
} from '#shared/contracts'

/**
 * GameStatePort 介面
 *
 * @description
 * 遊戲狀態管理的 Application Layer 介面。
 * 包含初始化、狀態更新、查詢三類方法。
 */
export interface GameStatePort {
  // ===== 初始化 =====

  /**
   * 初始化遊戲上下文
   *
   * @description
   * GameStarted 事件時呼叫，設定遊戲基本資訊。
   *
   * @param gameId - 遊戲 ID
   * @param players - 玩家資訊列表
   * @param ruleset - 遊戲規則集
   *
   * @example
   * ```typescript
   * gameState.initializeGameContext(
   *   'game-123',
   *   [
   *     { player_id: 'p1', player_name: 'Alice', is_ai: false },
   *     { player_id: 'p2', player_name: 'Bot', is_ai: true }
   *   ],
   *   { target_score: 100, yaku_settings: [...], special_rules: {...} }
   * )
   * ```
   */
  initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void

  /**
   * 恢復完整遊戲狀態
   *
   * @description
   * GameSnapshotRestore 事件時呼叫，靜默恢復完整狀態無動畫。
   * 用於重連後快速恢復遊戲狀態。
   *
   * @param snapshot - 完整的遊戲快照數據
   *
   * @example
   * ```typescript
   * gameState.restoreGameState(snapshot)
   * ```
   */
  restoreGameState(snapshot: GameSnapshotRestore): void

  // ===== 狀態更新 =====

  /**
   * 設定當前流程階段
   *
   * @param stage - 流程階段（null 表示回合結束）
   *
   * @example
   * ```typescript
   * gameState.setFlowStage('AWAITING_HAND_PLAY')
   * gameState.setFlowStage(null) // 回合結束
   * ```
   */
  setFlowStage(stage: FlowState | null): void

  /**
   * 設定當前活動玩家
   *
   * @param playerId - 玩家 ID，傳入 null 表示清除活動玩家（如回合結束時）
   *
   * @example
   * ```typescript
   * gameState.setActivePlayer('player-2')
   * gameState.setActivePlayer(null) // 回合結束，清除活動玩家
   * ```
   */
  setActivePlayer(playerId: string | null): void

  /**
   * 設定當前回合莊家
   *
   * @param playerId - 莊家玩家 ID
   *
   * @example
   * ```typescript
   * gameState.setDealerId('player-1')
   * ```
   */
  setDealerId(playerId: string): void

  /**
   * 設定目前局數
   *
   * @param round - 局數（從 1 開始）
   *
   * @example
   * ```typescript
   * gameState.setCurrentRound(3) // 第 3 局
   * ```
   */
  setCurrentRound(round: number): void

  /**
   * 更新場牌列表
   *
   * @param cards - 場牌 ID 列表
   *
   * @example
   * ```typescript
   * gameState.updateFieldCards(['0101', '0102', '0201'])
   * ```
   */
  updateFieldCards(cards: string[]): void

  /**
   * 更新玩家手牌列表
   *
   * @param cards - 手牌 ID 列表
   *
   * @example
   * ```typescript
   * gameState.updateHandCards(['0301', '0302', '0401'])
   * ```
   */
  updateHandCards(cards: string[]): void

  /**
   * 更新對手手牌數量
   *
   * @description
   * 對手手牌不顯示具體牌面，只顯示數量。
   *
   * @param count - 手牌數量
   *
   * @example
   * ```typescript
   * gameState.updateOpponentHandCount(7)
   * ```
   */
  updateOpponentHandCount(count: number): void

  /**
   * 更新獲得區卡片
   *
   * @param playerCards - 玩家獲得區卡片 ID 列表
   * @param opponentCards - 對手獲得區卡片 ID 列表
   *
   * @example
   * ```typescript
   * gameState.updateDepositoryCards(['0101', '0102'], ['0201', '0202'])
   * ```
   */
  updateDepositoryCards(playerCards: string[], opponentCards: string[]): void

  /**
   * 更新分數
   *
   * @param playerScore - 玩家分數
   * @param opponentScore - 對手分數
   *
   * @example
   * ```typescript
   * gameState.updateScores(10, 5)
   * ```
   */
  updateScores(playerScore: number, opponentScore: number): void

  /**
   * 更新牌堆剩餘數量
   *
   * @param count - 剩餘卡片數量
   *
   * @example
   * ```typescript
   * gameState.updateDeckRemaining(20)
   * ```
   */
  updateDeckRemaining(count: number): void

  /**
   * 更新役種資訊
   *
   * @param playerYaku - 玩家達成的役種列表
   * @param opponentYaku - 對手達成的役種列表
   *
   * @example
   * ```typescript
   * gameState.updateYaku(
   *   [{ yaku_type: 'INOU_SHIKO', base_points: 5 }],
   *   [{ yaku_type: 'TANE_ZAKU', base_points: 1 }]
   * )
   * ```
   */
  updateYaku(playerYaku: YakuScore[], opponentYaku: YakuScore[]): void

  /**
   * 設定可配對目標卡片列表
   *
   * @description
   * 用於 SelectionRequired 事件，保存翻牌後可選擇配對的場牌列表。
   * Adapter Layer 可監聽此狀態變化來觸發場牌選擇 UI。
   *
   * @param cardIds - 可配對的場牌 ID 列表
   *
   * @example
   * ```typescript
   * gameState.setPossibleTargetCardIds(['0101', '0201'])
   * ```
   */
  setPossibleTargetCardIds(cardIds: string[]): void

  /**
   * 設定翻出的卡片 ID
   *
   * @description
   * 用於 SelectionRequired 事件，保存翻出的卡片 ID（drawn_card）。
   * 此卡片在翻牌雙重配對時作為 TurnSelectTarget 命令的 source 參數。
   *
   * @param cardId - 翻出的卡片 ID，若要清除則傳入 null
   *
   * @example
   * ```typescript
   * // SelectionRequired 事件時保存
   * gameState.setDrawnCard('0841')
   *
   * // 選擇完成後清除
   * gameState.setDrawnCard(null)
   * ```
   */
  setDrawnCard(cardId: string | null): void

  // ===== 查詢 =====

  /**
   * 取得本地玩家 ID
   *
   * @description
   * 返回代表「本地玩家」（非 AI、非遠端玩家）的 player_id。
   *
   * @returns 本地玩家的 player_id
   *
   * @example
   * ```typescript
   * const localPlayerId = gameState.getLocalPlayerId()
   * const isPlayerWinner = winnerId === localPlayerId
   * ```
   */
  getLocalPlayerId(): string

  /**
   * 取得當前場牌列表
   *
   * @returns 場牌 ID 列表
   *
   * @example
   * ```typescript
   * const fieldCards = gameState.getFieldCards()
   * ```
   */
  getFieldCards(): string[]

  /**
   * 取得指定玩家的獲得區卡片
   *
   * @param playerId - 玩家 ID
   * @returns 獲得區卡片 ID 列表
   *
   * @example
   * ```typescript
   * const myCards = gameState.getDepositoryCards(localPlayerId)
   * ```
   */
  getDepositoryCards(playerId: string): string[]

  /**
   * 取得牌堆剩餘數量
   *
   * @returns 牌堆剩餘卡片數量
   *
   * @example
   * ```typescript
   * const remaining = gameState.getDeckRemaining()
   * ```
   */
  getDeckRemaining(): number

  /**
   * 取得當前回合莊家 ID
   *
   * @returns 莊家玩家 ID，若未設定則返回 null
   *
   * @example
   * ```typescript
   * const dealerId = gameState.getDealerId()
   * const isPlayerDealer = dealerId === localPlayerId
   * ```
   */
  getDealerId(): string | null

  /**
   * 取得目前局數
   *
   * @returns 目前局數，若未開始則返回 null
   *
   * @example
   * ```typescript
   * const round = gameState.getCurrentRound()
   * ```
   */
  getCurrentRound(): number | null

  /**
   * 取得玩家手牌列表
   *
   * @returns 手牌 ID 列表
   *
   * @example
   * ```typescript
   * const handCards = gameState.getHandCards()
   * ```
   */
  getHandCards(): string[]

  /**
   * 取得對手手牌數量
   *
   * @returns 對手手牌數量
   *
   * @example
   * ```typescript
   * const count = gameState.getOpponentHandCount()
   * ```
   */
  getOpponentHandCount(): number

  /**
   * 取得翻出的卡片 ID
   *
   * @description
   * 用於 AWAITING_SELECTION 狀態時，取得當前等待配對的翻牌。
   *
   * @returns 翻出的卡片 ID，若無則返回 null
   *
   * @example
   * ```typescript
   * const drawnCard = gameState.getDrawnCard()
   * if (drawnCard) {
   *   // 使用 drawnCard 作為 TurnSelectTarget 的 source
   * }
   * ```
   */
  getDrawnCard(): string | null

  /**
   * 取得可配對目標卡片列表
   *
   * @description
   * 用於 AWAITING_SELECTION 狀態時，取得可選擇的配對目標列表。
   *
   * @returns 可配對的場牌 ID 列表
   *
   * @example
   * ```typescript
   * const possibleTargets = gameState.getPossibleTargetCardIds()
   * ```
   */
  getPossibleTargetCardIds(): string[]

  /**
   * 取得遊戲規則集
   *
   * @description
   * 取得當前遊戲的規則設定。此方法應在遊戲上下文初始化後調用
   * （即 initializeGameContext 或 restoreGameState 之後）。
   *
   * @returns 遊戲規則集
   *
   * @example
   * ```typescript
   * const ruleset = gameState.getRuleset()
   * const totalDeckCards = ruleset.total_deck_cards
   * ```
   */
  getRuleset(): Ruleset

  /**
   * 重置所有玩家的 Koi-Koi 倍率
   *
   * @description
   * 新局開始時呼叫，將所有玩家的 Koi-Koi 倍率重置為初始值。
   *
   * @example
   * ```typescript
   * gameState.resetKoiKoiMultipliers()
   * ```
   */
  resetKoiKoiMultipliers(): void

  /**
   * 重置所有遊戲狀態
   *
   * @description
   * 將所有遊戲狀態重置為初始值。
   * 用於開始新遊戲或離開遊戲時清理狀態。
   *
   * @example
   * ```typescript
   * gameState.reset()
   * ```
   */
  reset(): void

  /**
   * 設定遊戲結束標記
   *
   * @param ended - 遊戲是否結束
   *
   * @description
   * 用於標記遊戲已結束，觸發 UI 響應式更新（如 Restart Game 按鈕啟用）。
   *
   * @example
   * ```typescript
   * gameState.setGameEnded(true) // 遊戲結束
   * gameState.setGameEnded(false) // 重新開始遊戲
   * ```
   */
  setGameEnded(ended: boolean): void

  // ===== 遊戲 ID 管理 =====

  /**
   * 取得當前遊戲 ID
   *
   * @description
   * 遊戲 ID 的單一真相來源（SSOT）。
   * 由 Gateway 事件設定，不需要 sessionStorage。
   *
   * @returns 當前遊戲 ID，若無則返回 null
   *
   * @example
   * ```typescript
   * const gameId = gameState.getCurrentGameId()
   * ```
   */
  getCurrentGameId(): string | null

  /**
   * 設定當前遊戲 ID
   *
   * @param gameId - 遊戲 ID，傳入 null 可清除
   *
   * @description
   * 由 Gateway 事件（GatewayConnected、MatchFound）設定，
   * 或在遊戲結束/離開時清除。
   *
   * @example
   * ```typescript
   * gameState.setCurrentGameId('game-123')
   * gameState.setCurrentGameId(null) // 清除
   * ```
   */
  setCurrentGameId(gameId: string | null): void
}
