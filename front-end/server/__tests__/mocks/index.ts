/**
 * Mock Index
 *
 * @description
 * 所有測試用 mock 的統一匯出入口。
 * 方便 test files 從單一位置 import 所有需要的 mock。
 *
 * @module server/__tests__/mocks
 */

// GameStore
export {
  createMockGameStore,
  createMockGameStore as createGameStoreMock,
  createMockGameStoreWithGame,
  type MockGameStore,
} from './gameStoreMock'

// EventPublisher
export {
  createMockEventPublisher,
  createMockEventPublisher as createEventPublisherMock,
  getPublishedEvents,
  getEventsForGame,
  type MockEventPublisher,
} from './eventPublisherMock'

// GameRepository
export {
  createMockGameRepository,
  createMockGameRepository as createGameRepositoryMock,
  createMockGameRepositoryWithGame,
  type MockGameRepository,
} from './gameRepositoryMock'

// InternalEventPublisher
export {
  createMockInternalEventPublisher,
  createMockInternalEventPublisher as createInternalEventPublisherMock,
  getRoomCreatedPayloads,
  type MockInternalEventPublisher,
} from './internalEventPublisherMock'

// GameTimeout
export {
  createMockGameTimeout,
  createMockGameTimeout as createGameTimeoutMock,
  triggerTimeout,
  triggerDisconnectTimeout,
  triggerMatchmakingTimeout,
  type MockGameTimeout,
} from './gameTimeoutMock'

// EventMapper
export {
  createMockEventMapper,
  createMockEventMapper as createEventMapperMock,
  type MockEventMapper,
} from './eventMapperMock'

// PlayerStatsRepository
export {
  createMockPlayerStatsRepository,
  createMockPlayerStatsRepository as createPlayerStatsRepositoryMock,
  createMockPlayerStatsRepositoryWithStats,
  getUpsertCalls,
  type MockPlayerStatsRepository,
} from './playerStatsRepositoryMock'
