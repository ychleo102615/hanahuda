/**
 * Opponent BC - Module Entry
 *
 * @description
 * Opponent BC 的公開 API。
 * 對外只暴露 Container 建立函數和類型。
 *
 * @module server/opponent
 */

export {
  createOpponentContainer,
  type OpponentContainer,
  type OpponentContainerDependencies,
} from './adapter/di/container'

// 內部元件不對外暴露
// - AiNeededHandler
// - OpponentInstance
// - OpponentStateTracker
// - opponentStore
// - aiActionScheduler
