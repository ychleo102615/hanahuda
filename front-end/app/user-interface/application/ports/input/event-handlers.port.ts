/**
 * Event Handlers Input Ports
 *
 * @description
 * 由 Application Layer 定義並實作為 Use Cases，
 * 供 Adapter Layer（SSE Listener）呼叫。
 *
 * 包含 16 個事件處理器 Input Ports（對應 16 種 SSE 事件 + 快照恢復）：
 * - HandleGameStartedPort
 * - HandleRoundDealtPort
 * - HandleTurnCompletedPort
 * - HandleSelectionRequiredPort
 * - HandleTurnProgressAfterSelectionPort
 * - HandleDecisionRequiredPort
 * - HandleDecisionMadePort
 * - HandleRoundScoredPort
 * - HandleRoundDrawnPort
 * - HandleRoundEndedInstantlyPort
 * - HandleGameFinishedPort
 * - HandleTurnErrorPort
 * - HandleGameErrorPort
 * - HandleReconnectionPort (GameSnapshotRestore)
 */

import type {
  GameStartedEvent,
  RoundDealtEvent,
  TurnCompletedEvent,
  SelectionRequiredEvent,
  TurnProgressAfterSelectionEvent,
  DecisionRequiredEvent,
  DecisionMadeEvent,
  RoundScoredEvent,
  RoundDrawnEvent,
  RoundEndedInstantlyEvent,
  GameFinishedEvent,
  TurnErrorEvent,
  GameErrorEvent,
  GameSnapshotRestore,
} from '../../types'

/**
 * HandleGameStartedPort - Input Port
 *
 * @description
 * 處理 GameStarted 事件。
 *
 * 實作: HandleGameStartedUseCase
 */
export interface HandleGameStartedPort {
  /**
   * 執行 GameStarted 事件處理
   *
   * @param event - GameStarted 事件
   */
  execute(event: GameStartedEvent): void | Promise<void>
}

/**
 * HandleRoundDealtPort - Input Port
 *
 * @description
 * 處理 RoundDealt 事件。
 *
 * 實作: HandleRoundDealtUseCase
 */
export interface HandleRoundDealtPort {
  /**
   * 執行 RoundDealt 事件處理
   *
   * @param event - RoundDealt 事件
   */
  execute(event: RoundDealtEvent): void | Promise<void>
}

/**
 * HandleTurnCompletedPort - Input Port
 *
 * @description
 * 處理 TurnCompleted 事件（無中斷、無役種形成）。
 *
 * 實作: HandleTurnCompletedUseCase
 */
export interface HandleTurnCompletedPort {
  /**
   * 執行 TurnCompleted 事件處理
   *
   * @param event - TurnCompleted 事件
   */
  execute(event: TurnCompletedEvent): void | Promise<void>
}

/**
 * HandleSelectionRequiredPort - Input Port
 *
 * @description
 * 處理 SelectionRequired 事件（翻牌雙重配對）。
 *
 * 實作: HandleSelectionRequiredUseCase
 */
export interface HandleSelectionRequiredPort {
  /**
   * 執行 SelectionRequired 事件處理
   *
   * @param event - SelectionRequired 事件
   */
  execute(event: SelectionRequiredEvent): void | Promise<void>
}

/**
 * HandleTurnProgressAfterSelectionPort - Input Port
 *
 * @description
 * 處理 TurnProgressAfterSelection 事件。
 *
 * 實作: HandleTurnProgressAfterSelectionUseCase
 */
export interface HandleTurnProgressAfterSelectionPort {
  /**
   * 執行 TurnProgressAfterSelection 事件處理
   *
   * @param event - TurnProgressAfterSelection 事件
   */
  execute(event: TurnProgressAfterSelectionEvent): void | Promise<void>
}

/**
 * HandleDecisionRequiredPort - Input Port
 *
 * @description
 * 處理 DecisionRequired 事件（形成役種，需決策）。
 *
 * 實作: HandleDecisionRequiredUseCase
 */
export interface HandleDecisionRequiredPort {
  /**
   * 執行 DecisionRequired 事件處理
   *
   * @param event - DecisionRequired 事件
   */
  execute(event: DecisionRequiredEvent): void | Promise<void>
}

/**
 * HandleDecisionMadePort - Input Port
 *
 * @description
 * 處理 DecisionMade 事件（僅在選擇 KOI_KOI 時）。
 *
 * 實作: HandleDecisionMadeUseCase
 */
export interface HandleDecisionMadePort {
  /**
   * 執行 DecisionMade 事件處理
   *
   * @param event - DecisionMade 事件
   */
  execute(event: DecisionMadeEvent): void | Promise<void>
}

/**
 * HandleRoundScoredPort - Input Port
 *
 * @description
 * 處理 RoundScored 事件（局結束計分）。
 *
 * 實作: HandleRoundScoredUseCase
 */
export interface HandleRoundScoredPort {
  /**
   * 執行 RoundScored 事件處理
   *
   * @param event - RoundScored 事件
   */
  execute(event: RoundScoredEvent): void | Promise<void>
}

/**
 * HandleRoundDrawnPort - Input Port
 *
 * @description
 * 處理 RoundDrawn 事件（平局）。
 *
 * 實作: HandleRoundDrawnUseCase
 */
export interface HandleRoundDrawnPort {
  /**
   * 執行 RoundDrawn 事件處理
   *
   * @param event - RoundDrawn 事件
   */
  execute(event: RoundDrawnEvent): void | Promise<void>
}

/**
 * HandleRoundEndedInstantlyPort - Input Port
 *
 * @description
 * 處理 RoundEndedInstantly 事件（Teshi 或場牌流局）。
 *
 * 實作: HandleRoundEndedInstantlyUseCase
 */
export interface HandleRoundEndedInstantlyPort {
  /**
   * 執行 RoundEndedInstantly 事件處理
   *
   * @param event - RoundEndedInstantly 事件
   */
  execute(event: RoundEndedInstantlyEvent): void | Promise<void>
}

/**
 * HandleGameFinishedPort - Input Port
 *
 * @description
 * 處理 GameFinished 事件（遊戲結束）。
 *
 * 實作: HandleGameFinishedUseCase
 */
export interface HandleGameFinishedPort {
  /**
   * 執行 GameFinished 事件處理
   *
   * @param event - GameFinished 事件
   */
  execute(event: GameFinishedEvent): void | Promise<void>
}

/**
 * HandleTurnErrorPort - Input Port
 *
 * @description
 * 處理 TurnError 事件（操作錯誤）。
 *
 * 實作: HandleTurnErrorUseCase
 */
export interface HandleTurnErrorPort {
  /**
   * 執行 TurnError 事件處理
   *
   * @param event - TurnError 事件
   */
  execute(event: TurnErrorEvent): void | Promise<void>
}

/**
 * HandleGameErrorPort - Input Port
 *
 * @description
 * 處理 GameError 事件（遊戲層級錯誤）。
 *
 * 處理流程：
 * 1. 顯示錯誤通知（NotificationPort）
 * 2. 更新配對狀態為 'error'（MatchmakingStatePort）
 * 3. 若不可恢復，清除會話並導航回首頁
 *
 * 實作: HandleGameErrorUseCase
 */
export interface HandleGameErrorPort {
  /**
   * 執行 GameError 事件處理
   *
   * @param event - GameError 事件
   */
  execute(event: GameErrorEvent): void | Promise<void>
}

/**
 * HandleReconnectionPort - Input Port
 *
 * @description
 * 處理斷線重連的快照恢復。
 *
 * 實作: HandleReconnectionUseCase
 */
export interface HandleReconnectionPort {
  /**
   * 執行快照恢復處理
   *
   * @param snapshot - 遊戲狀態快照
   */
  execute(snapshot: GameSnapshotRestore): void | Promise<void>
}
