/**
 * UIStatePort - Output Port
 *
 * @description
 * 由 Application Layer 定義，Adapter Layer 實作。
 * 負責管理 UI 狀態與遊戲上下文（通常是 Pinia Store）。
 *
 * 包含：
 * - UI 狀態更新方法（場牌、手牌、分數等）
 * - 遊戲上下文查詢方法（當前玩家 ID 等）
 *
 * 使用於：
 * - All Handle*UseCase（事件處理器）
 *
 * @example
 * ```typescript
 * // Adapter Layer 實作範例（使用 Pinia）
 * class PiniaUIStateAdapter implements UIStatePort {
 *   constructor(private gameStore: GameStore) {}
 *
 *   setFlowStage(stage: FlowState): void {
 *     this.gameStore.flowStage = stage
 *   }
 *
 *   updateFieldCards(cards: string[]): void {
 *     this.gameStore.fieldCards = cards
 *   }
 *
 *   getLocalPlayerId(): string {
 *     return this.gameStore.currentPlayerId
 *   }
 * }
 * ```
 */

import type { FlowState, PlayerInfo, Ruleset, GameSnapshotRestore } from '../../types'

export interface UIStatePort {
  /**
   * 初始化遊戲上下文（GameStarted 使用）
   *
   * @param gameId - 遊戲 ID
   * @param players - 玩家資訊列表
   * @param ruleset - 遊戲規則集
   *
   * @example
   * ```typescript
   * updateUIState.initializeGameContext(
   *   'game-123',
   *   [{ player_id: 'p1', player_name: 'Alice', is_ai: false }],
   *   { target_score: 100, yaku_settings: [...], special_rules: {...} }
   * )
   * ```
   */
  initializeGameContext(gameId: string, players: PlayerInfo[], ruleset: Ruleset): void

  /**
   * 恢復完整遊戲狀態（GameSnapshotRestore 使用，靜默恢復無動畫）
   *
   * @param snapshot - 完整的遊戲快照數據
   *
   * @example
   * ```typescript
   * updateUIState.restoreGameState(snapshot)
   * ```
   */
  restoreGameState(snapshot: GameSnapshotRestore): void

  /**
   * 設定當前流程階段
   *
   * @param stage - 流程階段
   *
   * @example
   * ```typescript
   * updateUIState.setFlowStage('AWAITING_HAND_PLAY')
   * ```
   */
  setFlowStage(stage: FlowState): void

  /**
   * 更新場牌列表
   *
   * @param cards - 場牌 ID 列表
   *
   * @example
   * ```typescript
   * updateUIState.updateFieldCards(['0341', '0342', '0343'])
   * ```
   */
  updateFieldCards(cards: string[]): void

  /**
   * 更新手牌列表
   *
   * @param cards - 手牌 ID 列表
   *
   * @example
   * ```typescript
   * updateUIState.updateHandCards(['0344', '0345'])
   * ```
   */
  updateHandCards(cards: string[]): void

  /**
   * 更新獲得區卡片
   *
   * @param playerCards - 玩家獲得區
   * @param opponentCards - 對手獲得區
   *
   * @example
   * ```typescript
   * updateUIState.updateDepositoryCards(
   *   ['0341', '0342'],
   *   ['0343', '0344']
   * )
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
   * updateUIState.updateScores(10, 5)
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
   * updateUIState.updateDeckRemaining(24)
   * ```
   */
  updateDeckRemaining(count: number): void

  /**
   * 更新玩家 Koi-Koi 倍率
   *
   * @param playerId - 玩家 ID
   * @param multiplier - 倍率
   *
   * @example
   * ```typescript
   * updateUIState.updateKoiKoiMultiplier('player-1', 2)
   * ```
   */
  updateKoiKoiMultiplier(playerId: string, multiplier: number): void

  /**
   * 取得本地玩家 ID
   *
   * @returns 本地玩家的 player_id
   *
   * @description
   * 返回代表「本地玩家」（非 AI、非遠端玩家）的 player_id。
   * 通常在 GameStarted 事件時，由 initializeGameContext() 設定。
   *
   * ⚠️ 注意：localPlayerId 具有領域意義，但目前存儲在 UI State 中。
   * 這是 MVP 階段的妥協方案。未來若玩家邏輯變複雜，應考慮：
   * 1. 在 Domain Layer 引入 Player Entity
   * 2. 重構為獨立的 GameContextPort
   *
   * @example
   * ```typescript
   * const localPlayerId = uiState.getLocalPlayerId()
   * const isPlayerWinner = winnerId === localPlayerId
   * ```
   */
  getLocalPlayerId(): string
}
