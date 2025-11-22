/**
 * DI Container Tokens
 *
 * 定義所有依賴注入的 Token (Symbol 常數)
 * 使用 Symbol 避免命名衝突，確保型別安全
 */

export const TOKENS = {
  // ===== Output Ports (New) =====
  GameStatePort: Symbol('GameStatePort'),
  AnimationPort: Symbol('AnimationPort'),
  NotificationPort: Symbol('NotificationPort'),
  SendCommandPort: Symbol('SendCommandPort'),

  // ===== Output Ports (Legacy - deprecated) =====
  UIStatePort: Symbol('UIStatePort'),
  TriggerUIEffectPort: Symbol('TriggerUIEffectPort'),

  // ===== Input Ports - Player Operations (3 個) =====
  PlayHandCardPort: Symbol('PlayHandCardPort'),
  SelectMatchTargetPort: Symbol('SelectMatchTargetPort'),
  MakeKoiKoiDecisionPort: Symbol('MakeKoiKoiDecisionPort'),

  // ===== Input Ports - Event Handlers (15 個) =====
  HandleGameStartedPort: Symbol('HandleGameStartedPort'),
  HandleRoundDealtPort: Symbol('HandleRoundDealtPort'),
  HandleTurnCompletedPort: Symbol('HandleTurnCompletedPort'),
  HandleSelectionRequiredPort: Symbol('HandleSelectionRequiredPort'),
  HandleTurnProgressAfterSelectionPort: Symbol('HandleTurnProgressAfterSelectionPort'),
  HandleDecisionRequiredPort: Symbol('HandleDecisionRequiredPort'),
  HandleDecisionMadePort: Symbol('HandleDecisionMadePort'),
  HandleYakuFormedPort: Symbol('HandleYakuFormedPort'),
  HandleRoundScoredPort: Symbol('HandleRoundScoredPort'),
  HandleRoundEndedInstantlyPort: Symbol('HandleRoundEndedInstantlyPort'),
  HandleRoundDrawnPort: Symbol('HandleRoundDrawnPort'),
  HandleGameFinishedPort: Symbol('HandleGameFinishedPort'),
  HandleTurnErrorPort: Symbol('HandleTurnErrorPort'),
  HandleGameSnapshotRestorePort: Symbol('HandleGameSnapshotRestorePort'),
  HandleReconnectionPort: Symbol('HandleReconnectionPort'),

  // ===== Adapters =====
  GameApiClient: Symbol('GameApiClient'),
  GameEventClient: Symbol('GameEventClient'),
  EventRouter: Symbol('EventRouter'),
  AnimationQueue: Symbol('AnimationQueue'),

  // ===== Stores =====
  GameStateStore: Symbol('GameStateStore'),
  UIStateStore: Symbol('UIStateStore'),

  // ===== Domain Facade =====
  DomainFacade: Symbol('DomainFacade'),

  // ===== Mock Adapters =====
  MockApiClient: Symbol('MockApiClient'),
  MockEventEmitter: Symbol('MockEventEmitter'),
} as const;

export type TokenKey = keyof typeof TOKENS;
export type Token = typeof TOKENS[TokenKey];
