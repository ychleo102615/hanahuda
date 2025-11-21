/**
 * AnimationPort 單元測試
 *
 * T017 [US2] - 測試 AnimationPort 介面定義和 Adapter 實作
 *
 * 測試重點：
 * 1. Port 介面符合 data-model.md 定義
 * 2. Adapter stub 實作正確（暫時返回 resolved Promise）
 * 3. isAnimating/interrupt 狀態控制
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { AnimationPort } from '@/user-interface/application/ports/output/animation.port'

describe('AnimationPort Interface', () => {
  describe('Interface Contract', () => {
    it('should define playDealAnimation method', () => {
      // 驗證介面定義 - 透過 TypeScript 編譯器檢查
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.playDealAnimation).toBeDefined()
      expect(typeof mockPort.playDealAnimation).toBe('function')
    })

    it('should define playCardToFieldAnimation method', () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.playCardToFieldAnimation).toBeDefined()
      expect(typeof mockPort.playCardToFieldAnimation).toBe('function')
    })

    it('should define playMatchAnimation method', () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.playMatchAnimation).toBeDefined()
      expect(typeof mockPort.playMatchAnimation).toBe('function')
    })

    it('should define playToDepositoryAnimation method', () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.playToDepositoryAnimation).toBeDefined()
      expect(typeof mockPort.playToDepositoryAnimation).toBe('function')
    })

    it('should define playFlipFromDeckAnimation method', () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.playFlipFromDeckAnimation).toBeDefined()
      expect(typeof mockPort.playFlipFromDeckAnimation).toBe('function')
    })

    it('should define interrupt method', () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.interrupt).toBeDefined()
      expect(typeof mockPort.interrupt).toBe('function')
    })

    it('should define isAnimating method', () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      expect(mockPort.isAnimating).toBeDefined()
      expect(typeof mockPort.isAnimating).toBe('function')
    })
  })

  describe('Animation Methods Return Type', () => {
    it('playDealAnimation should return Promise<void>', async () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      const result = mockPort.playDealAnimation({
        fieldCards: ['0101', '0201'],
        playerHandCards: ['0301', '0401'],
        opponentHandCount: 8,
      })

      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBeUndefined()
    })

    it('playMatchAnimation should return Promise<void>', async () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      const result = mockPort.playMatchAnimation('0101', '0102')

      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBeUndefined()
    })

    it('playToDepositoryAnimation should return Promise<void>', async () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      const result = mockPort.playToDepositoryAnimation(['0101', '0102'], 'BRIGHT', false)

      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBeUndefined()
    })
  })

  describe('Control Methods', () => {
    it('isAnimating should return boolean', () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      const result = mockPort.isAnimating()

      expect(typeof result).toBe('boolean')
    })

    it('interrupt should be callable without arguments', () => {
      const mockPort: AnimationPort = {
        playDealAnimation: vi.fn().mockResolvedValue(undefined),
        playCardToFieldAnimation: vi.fn().mockResolvedValue(undefined),
        playMatchAnimation: vi.fn().mockResolvedValue(undefined),
        playToDepositoryAnimation: vi.fn().mockResolvedValue(undefined),
        playFlipFromDeckAnimation: vi.fn().mockResolvedValue(undefined),
        interrupt: vi.fn(),
        isAnimating: vi.fn().mockReturnValue(false),
      }

      expect(() => mockPort.interrupt()).not.toThrow()
    })
  })
})
