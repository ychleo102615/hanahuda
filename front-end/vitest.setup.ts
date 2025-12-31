/**
 * Vitest 全域設定檔
 *
 * 在 jsdom 環境中 mock 瀏覽器 API
 */

import { vi } from 'vitest'

// Mock ResizeObserver - jsdom 不提供此 API
// 用於 ZoneRegistry 等需要監聽元素尺寸變化的功能
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.stubGlobal('ResizeObserver', ResizeObserverMock)
