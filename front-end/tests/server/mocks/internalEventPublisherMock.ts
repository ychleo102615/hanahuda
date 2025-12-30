/**
 * InternalEventPublisher Mock
 *
 * @description
 * InternalEventPublisherPort 的測試用 mock 實作。
 * 提供可配置的 mock 函數以驗證內部事件發布行為。
 *
 * @module server/__tests__/mocks/internalEventPublisherMock
 */

import { vi } from 'vitest'
import type {
  InternalEventPublisherPort,
  RoomCreatedPayload,
} from '~/server/application/ports/output/internalEventPublisherPort'

/**
 * InternalEventPublisher Mock 類型
 */
export type MockInternalEventPublisher = {
  [K in keyof InternalEventPublisherPort]: ReturnType<typeof vi.fn>
}

/**
 * 建立 InternalEventPublisher Mock
 *
 * @returns 可配置的 InternalEventPublisher mock
 */
export function createMockInternalEventPublisher(): MockInternalEventPublisher {
  return {
    publishRoomCreated: vi.fn<(payload: RoomCreatedPayload) => void>(),
  }
}

/**
 * 取得所有發布的 RoomCreated 事件
 *
 * @param mock - InternalEventPublisher mock
 * @returns 所有發布的 RoomCreated payloads
 */
export function getRoomCreatedPayloads(mock: MockInternalEventPublisher): RoomCreatedPayload[] {
  return mock.publishRoomCreated.mock.calls.map((call) => call[0] as RoomCreatedPayload)
}
