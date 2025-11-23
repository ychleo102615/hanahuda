/**
 * ZoneRegistry 單元測試
 *
 * T037 [US4] - 測試 register/unregister 功能
 * T038 [US4] - 測試 getPosition/getCardPosition 功能
 *
 * 測試重點：
 * 1. 註冊區域後可取得位置
 * 2. 取消註冊後無法取得位置
 * 3. 卡片位置計算正確
 * 4. dispose 清理所有 observers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ZoneName } from '@/user-interface/adapter/animation/types'
import { ZoneRegistry, createZoneRegistry } from '@/user-interface/adapter/animation/ZoneRegistry'

describe('ZoneRegistry', () => {
  let registry: ZoneRegistry
  let mockElement: HTMLElement
  let resizeObserverCallback: ResizeObserverCallback | null = null

  // Mock ResizeObserver
  const mockResizeObserver = vi.fn((callback: ResizeObserverCallback) => {
    resizeObserverCallback = callback
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }
  })

  beforeEach(() => {
    // Setup ResizeObserver mock
    vi.stubGlobal('ResizeObserver', mockResizeObserver)

    // Create mock element with getBoundingClientRect
    mockElement = document.createElement('div')
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 200,
      width: 300,
      height: 400,
      top: 200,
      left: 100,
      right: 400,
      bottom: 600,
      toJSON: () => ({}),
    } as DOMRect)

    registry = createZoneRegistry()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    resizeObserverCallback = null
  })

  describe('T037: register/unregister', () => {
    it('should register a zone with an element', () => {
      registry.register('field', mockElement)

      const zones = registry.getAllZones()
      expect(zones).toContain('field')
    })

    it('should create ResizeObserver for registered element', () => {
      registry.register('player-hand', mockElement)

      expect(mockResizeObserver).toHaveBeenCalled()
    })

    it('should unregister a zone', () => {
      registry.register('field', mockElement)
      registry.unregister('field')

      const zones = registry.getAllZones()
      expect(zones).not.toContain('field')
    })

    it('should handle unregistering non-existent zone gracefully', () => {
      expect(() => registry.unregister('deck')).not.toThrow()
    })

    it('should replace existing zone when registering same name', () => {
      const element1 = document.createElement('div')
      const element2 = document.createElement('div')

      vi.spyOn(element1, 'getBoundingClientRect').mockReturnValue({
        x: 10, y: 20, width: 100, height: 100,
        top: 20, left: 10, right: 110, bottom: 120,
        toJSON: () => ({}),
      } as DOMRect)

      vi.spyOn(element2, 'getBoundingClientRect').mockReturnValue({
        x: 50, y: 60, width: 200, height: 200,
        top: 60, left: 50, right: 250, bottom: 260,
        toJSON: () => ({}),
      } as DOMRect)

      registry.register('field', element1)
      registry.register('field', element2)

      const position = registry.getPosition('field')
      expect(position?.rect.x).toBe(50)
    })

    it('should support depository group zone names', () => {
      registry.register('player-depository-BRIGHT', mockElement)

      const zones = registry.getAllZones()
      expect(zones).toContain('player-depository-BRIGHT')
    })

    it('should disconnect observer on unregister', () => {
      const mockObserver = {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }

      vi.stubGlobal('ResizeObserver', vi.fn(() => mockObserver))
      registry = createZoneRegistry()

      registry.register('field', mockElement)
      registry.unregister('field')

      expect(mockObserver.disconnect).toHaveBeenCalled()
    })
  })

  describe('T038: getPosition/getCardPosition', () => {
    it('should return ZonePosition for registered zone', () => {
      registry.register('field', mockElement)

      const position = registry.getPosition('field')

      expect(position).not.toBeNull()
      expect(position?.zoneName).toBe('field')
      expect(position?.rect).toBeDefined()
      expect(position?.rect.x).toBe(100)
      expect(position?.rect.y).toBe(200)
      expect(position?.rect.width).toBe(300)
      expect(position?.rect.height).toBe(400)
    })

    it('should return null for unregistered zone', () => {
      const position = registry.getPosition('deck')

      expect(position).toBeNull()
    })

    it('should update position when element resizes', () => {
      registry.register('field', mockElement)

      // 模擬 resize
      vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
        x: 150, y: 250, width: 350, height: 450,
        top: 250, left: 150, right: 500, bottom: 700,
        toJSON: () => ({}),
      } as DOMRect)

      // Trigger ResizeObserver callback
      if (resizeObserverCallback) {
        resizeObserverCallback([], {} as ResizeObserver)
      }

      const position = registry.getPosition('field')
      expect(position?.rect.x).toBe(150)
      expect(position?.rect.y).toBe(250)
    })

    it('should calculate card position as zone center', () => {
      // Setup element for card layout calculation
      vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
        x: 0, y: 0, width: 400, height: 100,
        top: 50, left: 100, right: 500, bottom: 150,
        toJSON: () => ({}),
      } as DOMRect)

      registry.register('player-hand', mockElement)

      // 目前實現返回區域中心 x 座標和頂部 y 座標
      const pos0 = registry.getCardPosition('player-hand', 0)
      const pos1 = registry.getCardPosition('player-hand', 1)

      // 所有卡片位置應相同（區域中心）
      expect(pos0.x).toBe(300) // left (100) + width (400) / 2
      expect(pos0.y).toBe(50)  // top
      expect(pos1.x).toBe(pos0.x)
      expect(pos1.y).toBe(pos0.y)
    })

    it('should return default position for unregistered zone card position', () => {
      const position = registry.getCardPosition('deck', 0)

      // 應返回預設位置（0, 0）或合理的預設值
      expect(position).toBeDefined()
      expect(typeof position.x).toBe('number')
      expect(typeof position.y).toBe('number')
    })

    it('should handle negative card index gracefully', () => {
      registry.register('field', mockElement)

      // 負數索引應被處理（返回第一張或預設位置）
      const position = registry.getCardPosition('field', -1)
      expect(position).toBeDefined()
    })
  })

  describe('dispose', () => {
    it('should disconnect all observers', () => {
      const observers: Array<{ disconnect: ReturnType<typeof vi.fn> }> = []

      vi.stubGlobal('ResizeObserver', vi.fn(() => {
        const observer = {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn(),
        }
        observers.push(observer)
        return observer
      }))

      registry = createZoneRegistry()

      registry.register('field', mockElement)
      registry.register('player-hand', mockElement)
      registry.register('deck', mockElement)

      registry.dispose()

      observers.forEach(obs => {
        expect(obs.disconnect).toHaveBeenCalled()
      })
    })

    it('should clear all zones after dispose', () => {
      registry.register('field', mockElement)
      registry.register('player-hand', mockElement)

      registry.dispose()

      const zones = registry.getAllZones()
      expect(zones).toHaveLength(0)
    })

    it('should be safe to call dispose multiple times', () => {
      registry.register('field', mockElement)

      expect(() => {
        registry.dispose()
        registry.dispose()
      }).not.toThrow()
    })
  })

  describe('getAllZones', () => {
    it('should return empty array when no zones registered', () => {
      const zones = registry.getAllZones()
      expect(zones).toEqual([])
    })

    it('should return all registered zone names', () => {
      registry.register('field', mockElement)
      registry.register('player-hand', mockElement)
      registry.register('deck', mockElement)

      const zones = registry.getAllZones()

      expect(zones).toContain('field')
      expect(zones).toContain('player-hand')
      expect(zones).toContain('deck')
      expect(zones).toHaveLength(3)
    })
  })
})
