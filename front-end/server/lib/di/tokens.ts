/**
 * Backend DI Container Tokens
 *
 * @description
 * 定義所有後端依賴注入的 Token (Symbol 常數)。
 * 使用 Symbol 避免命名衝突，確保型別安全。
 *
 * 設計原則：
 * - API 端點透過 Token 從 Container 取得 Input Port
 * - 確保依賴抽象（Dependency Inversion Principle）
 * - 便於搜尋依賴使用位置
 *
 * @module server/lib/di/tokens
 */

export const BACKEND_TOKENS = {
  // ===== Adapters - Persistence =====
  GameStore: Symbol('GameStore'),
  GameRepository: Symbol('GameRepository'),
  PlayerStatsRepository: Symbol('PlayerStatsRepository'),
  GameLogRepository: Symbol('GameLogRepository'),

  // ===== Adapters - Event Publisher =====
  EventPublisher: Symbol('EventPublisher'),

  // ===== Adapters - Mappers =====
  EventMapper: Symbol('EventMapper'),

  // ===== Adapters - Timeout =====
  GameTimeoutManager: Symbol('GameTimeoutManager'),

  // ===== Adapters - Lock =====
  GameLock: Symbol('GameLock'),

  // ===== Output Ports (跨 BC 通訊) =====
  PlayerIdentityPort: Symbol('PlayerIdentityPort'),

  // ===== Input Ports (Use Cases) =====
  JoinGameInputPort: Symbol('JoinGameInputPort'),
  JoinGameAsAiInputPort: Symbol('JoinGameAsAiInputPort'),
  PlayHandCardInputPort: Symbol('PlayHandCardInputPort'),
  SelectTargetInputPort: Symbol('SelectTargetInputPort'),
  MakeDecisionInputPort: Symbol('MakeDecisionInputPort'),
  LeaveGameInputPort: Symbol('LeaveGameInputPort'),
  AutoActionInputPort: Symbol('AutoActionInputPort'),
  RecordGameStatsInputPort: Symbol('RecordGameStatsInputPort'),
  ConfirmContinueInputPort: Symbol('ConfirmContinueInputPort'),

  // ===== Application Services =====
  TurnFlowService: Symbol('TurnFlowService'),
} as const

export type BackendTokenKey = keyof typeof BACKEND_TOKENS
export type BackendToken = (typeof BACKEND_TOKENS)[BackendTokenKey]
