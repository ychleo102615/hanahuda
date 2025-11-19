/**
 * Adapter Layer Barrel File
 *
 * @description
 * 匯出 Adapter Layer 的公開 API
 */

// DI Container
export {
  DIContainer,
  DependencyNotFoundError,
  container,
  registerDependencies,
  TOKENS,
} from './di'

export type { DependencyFactory, DependencyOptions, GameMode, TokenKey, Token } from './di'

// Stores
export {
  useGameStateStore,
  useUIStateStore,
  createUIStatePortAdapter,
  createTriggerUIEffectPortAdapter,
} from './stores'

export type {
  GameStateStoreState,
  GameStateStoreGetters,
  GameStateStoreActions,
  UIStateStoreState,
  UIStateStoreActions,
  DecisionModalData,
  GameFinishedData,
  ConnectionStatus,
} from './stores'

// 注意: API, SSE, Animation, Router, Mock 模組將在後續 Phase 實作
