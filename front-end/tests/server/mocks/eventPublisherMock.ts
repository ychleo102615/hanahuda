/**
 * EventPublisher Mock
 *
 * @description
 * EventPublisherPort 的測試用 mock 實作。
 * 提供可配置的 mock 函數以驗證事件發布行為。
 *
 * @module server/__tests__/mocks/eventPublisherMock
 */

import { vi } from 'vitest'
import type { EventPublisherPort } from '~/server/application/ports/output/eventPublisherPort'
import type { GameEvent, GameStartedEvent, RoundDealtEvent } from '#shared/contracts'

/**
 * EventPublisher Mock 類型
 */
export type MockEventPublisher = {
  [K in keyof EventPublisherPort]: ReturnType<typeof vi.fn>
}

/**
 * 建立 EventPublisher Mock
 *
 * @returns 可配置的 EventPublisher mock
 */
export function createMockEventPublisher(): MockEventPublisher {
  return {
    publishToGame: vi.fn<(gameId: string, event: GameEvent) => void>(),
    publishGameStarted: vi.fn<(gameId: string, event: GameStartedEvent) => void>(),
    publishRoundDealt: vi.fn<(gameId: string, event: RoundDealtEvent) => void>(),
    publishToPlayer: vi.fn<(gameId: string, playerId: string, event: GameEvent) => void>(),
  }
}

/**
 * 取得所有發布的事件
 *
 * @param mock - EventPublisher mock
 * @returns 所有發布到 publishToGame 的事件
 */
export function getPublishedEvents(mock: MockEventPublisher): GameEvent[] {
  return mock.publishToGame.mock.calls.map((call) => call[1] as GameEvent)
}

/**
 * 取得發布到指定遊戲的事件
 *
 * @param mock - EventPublisher mock
 * @param gameId - 遊戲 ID
 * @returns 發布到該遊戲的所有事件
 */
export function getEventsForGame(mock: MockEventPublisher, gameId: string): GameEvent[] {
  return mock.publishToGame.mock.calls
    .filter((call) => call[0] === gameId)
    .map((call) => call[1] as GameEvent)
}
