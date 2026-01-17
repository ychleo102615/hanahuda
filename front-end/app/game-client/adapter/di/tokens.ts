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
  MatchmakingStatePort: Symbol('MatchmakingStatePort'),
  NavigationPort: Symbol('NavigationPort'),
  SessionContextPort: Symbol('SessionContextPort'),
  GameConnectionPort: Symbol('GameConnectionPort'),
  ErrorHandlerPort: Symbol('ErrorHandlerPort'),

  // ===== Output Ports - Operation & Timing =====
  OperationSessionPort: Symbol('OperationSessionPort'),
  DelayPort: Symbol('DelayPort'),
  LayoutPort: Symbol('LayoutPort'),

  // ===== Output Ports (Legacy - deprecated) =====
  UIStatePort: Symbol('UIStatePort'),

  // ===== Output Ports - Connection =====
  ConnectionReadyPort: Symbol('ConnectionReadyPort'),

  // ===== Input Ports - Game Initialization =====
  StartGamePort: Symbol('StartGamePort'),

  // ===== Input Ports - State Recovery =====
  HandleStateRecoveryPort: Symbol('HandleStateRecoveryPort'),

  // ===== Input Ports - Session Management =====
  ClearOrphanedSessionPort: Symbol('ClearOrphanedSessionPort'),

  // ===== Input Ports - Player Operations (3 個) =====
  PlayHandCardPort: Symbol('PlayHandCardPort'),
  SelectMatchTargetPort: Symbol('SelectMatchTargetPort'),
  MakeKoiKoiDecisionPort: Symbol('MakeKoiKoiDecisionPort'),

  // ===== Input Ports - Gateway Event Handlers =====
  HandleGatewayConnectedPort: Symbol('HandleGatewayConnectedPort'),

  // ===== Input Ports - Event Handlers (16 個) =====
  HandleGameStartedPort: Symbol('HandleGameStartedPort'),
  HandleRoundDealtPort: Symbol('HandleRoundDealtPort'),
  HandleTurnCompletedPort: Symbol('HandleTurnCompletedPort'),
  HandleSelectionRequiredPort: Symbol('HandleSelectionRequiredPort'),
  HandleTurnProgressAfterSelectionPort: Symbol('HandleTurnProgressAfterSelectionPort'),
  HandleDecisionRequiredPort: Symbol('HandleDecisionRequiredPort'),
  HandleDecisionMadePort: Symbol('HandleDecisionMadePort'),
  HandleYakuFormedPort: Symbol('HandleYakuFormedPort'),
  HandleRoundEndedPort: Symbol('HandleRoundEndedPort'),
  HandleGameFinishedPort: Symbol('HandleGameFinishedPort'),
  HandleTurnErrorPort: Symbol('HandleTurnErrorPort'),
  HandleGameErrorPort: Symbol('HandleGameErrorPort'),

  // ===== Adapters =====
  EventRouter: Symbol('EventRouter'),

  // ===== Stores =====
  GameStateStore: Symbol('GameStateStore'),
  UIStateStore: Symbol('UIStateStore'),
  AnimationLayerStore: Symbol('AnimationLayerStore'),
  ZoneRegistry: Symbol('ZoneRegistry'),
  MatchmakingStateStore: Symbol('MatchmakingStateStore'),

  // ===== Services =====
  CountdownManager: Symbol('CountdownManager'),
  OperationSessionManager: Symbol('OperationSessionManager'),
  RoomApiClient: Symbol('RoomApiClient'),
  MatchmakingApiClient: Symbol('MatchmakingApiClient'),

  // ===== Matchmaking Adapters =====
  MatchmakingEventRouter: Symbol('MatchmakingEventRouter'),

  // ===== Gateway Adapters =====
  GatewayEventRouter: Symbol('GatewayEventRouter'),
  GatewayWebSocketClient: Symbol('GatewayWebSocketClient'),

  // ===== Domain Facade =====
  DomainFacade: Symbol('DomainFacade'),

  // ===== Mock Adapters =====
  MockApiClient: Symbol('MockApiClient'),
  MockEventEmitter: Symbol('MockEventEmitter'),
} as const;

export type TokenKey = keyof typeof TOKENS;
export type Token = typeof TOKENS[TokenKey];
