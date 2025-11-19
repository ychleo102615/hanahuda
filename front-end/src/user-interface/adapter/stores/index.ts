/**
 * Stores Barrel File
 *
 * @description
 * 匯出所有 Pinia Stores 與 Port Adapters
 */

export { useGameStateStore, createUIStatePortAdapter } from './gameState'
export { useUIStateStore, createTriggerUIEffectPortAdapter } from './uiState'

export type { GameStateStoreState, GameStateStoreGetters, GameStateStoreActions } from './gameState'
export type {
  UIStateStoreState,
  UIStateStoreActions,
  DecisionModalData,
  GameFinishedData,
  ConnectionStatus,
} from './uiState'
