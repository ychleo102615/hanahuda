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
} from '../../types'

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
   * @param stage - 流程階段
   *
   * @example
   * ```typescript
   * gameState.setFlowStage('AWAITING_HAND_PLAY')
   * ```
   */
  setFlowStage(stage: FlowState): void

  /**
   * 設定當前活動玩家
   *
   * @param playerId - 玩家 ID
   *
   * @example
   * ```typescript
   * gameState.setActivePlayer('player-2')
   * ```
   */
  setActivePlayer(playerId: string): void

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
}
