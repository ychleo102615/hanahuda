/**
 * Matchmaking Use Cases
 *
 * @description
 * 線上配對相關的 Use Cases。
 * 所有 Use Cases 實作對應的 Input Port 介面。
 *
 * Event Types 從 '#shared/contracts' 匯入。
 *
 * @module app/user-interface/application/use-cases/matchmaking
 */

export { HandleMatchmakingStatusUseCase } from './HandleMatchmakingStatusUseCase'
export { HandleMatchFoundUseCase } from './HandleMatchFoundUseCase'
export { HandleMatchmakingCancelledUseCase } from './HandleMatchmakingCancelledUseCase'
export { HandleMatchmakingErrorUseCase } from './HandleMatchmakingErrorUseCase'
