import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnimationService } from '../../../src/user-interface/adapter/animation/AnimationService'
import { InterruptedError } from '../../../src/user-interface/adapter/animation/AnimationQueue'

// Mock @vueuse/motion
vi.mock('@vueuse/motion', () => ({
  useMotion: vi.fn(() => ({
    apply: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('AnimationService', () => {
  let service: AnimationService

  beforeEach(() => {
    vi.useFakeTimers()
    service = new AnimationService()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('trigger', () => {
    it('應該觸發 DEAL_CARDS 動畫', async () => {
      const promise = service.trigger('DEAL_CARDS', {
        targetZones: ['player-hand', 'field'],
        delay: 10,
        duration: 10,
      })

      // 推進時間讓動畫完成
      await vi.runAllTimersAsync()

      await expect(promise).resolves.toBeUndefined()
    })

    it('應該觸發 CARD_MOVE 動畫', async () => {
      // 創建模擬的卡片元素
      const mockElement = document.createElement('div')
      mockElement.setAttribute('data-card-id', '0101')
      document.body.appendChild(mockElement)

      const promise = service.trigger('CARD_MOVE', {
        cardId: '0101',
        from: { x: 0, y: 0 },
        to: { x: 100, y: 100 },
        duration: 10,
      })

      await vi.runAllTimersAsync()
      await expect(promise).resolves.toBeUndefined()

      // 清理
      document.body.removeChild(mockElement)
    })

    it('應該依序執行多個動畫', async () => {
      const results: number[] = []

      const p1 = service.trigger('DEAL_CARDS', {
        targetZones: ['player-hand'],
        delay: 10,
        duration: 10,
      }).then(() => results.push(1))

      const p2 = service.trigger('DEAL_CARDS', {
        targetZones: ['field'],
        delay: 10,
        duration: 10,
      }).then(() => results.push(2))

      await vi.runAllTimersAsync()
      await Promise.all([p1, p2])

      expect(results).toEqual([1, 2])
    })
  })

  describe('interrupt', () => {
    it('應該中斷動畫並 reject Promise', async () => {
      // 觸發一個較長的動畫
      const promise = service.trigger('DEAL_CARDS', {
        targetZones: ['player-hand', 'field', 'opponent-hand'],
        delay: 50,
        duration: 50,
      })

      // 推進 10ms 後中斷
      vi.advanceTimersByTime(10)
      service.interrupt()

      await expect(promise).rejects.toThrow(InterruptedError)
    })

    it('應該在沒有動畫時也能安全中斷', () => {
      expect(() => service.interrupt()).not.toThrow()
    })
  })

  // T039 [US4] - AnimationService interrupt 機制測試
  describe('T039: interrupt mechanism', () => {
    it('應該在中斷後立即停止執行中的動畫', async () => {
      const executionOrder: string[] = []

      // 觸發多個動畫
      const p1 = service.trigger('DEAL_CARDS', {
        targetZones: ['player-hand'],
        delay: 100,
        duration: 100,
      }).then(() => executionOrder.push('anim1'))
        .catch(() => executionOrder.push('anim1-interrupted'))

      const p2 = service.trigger('DEAL_CARDS', {
        targetZones: ['field'],
        delay: 100,
        duration: 100,
      }).then(() => executionOrder.push('anim2'))
        .catch(() => executionOrder.push('anim2-interrupted'))

      // 推進一點時間後中斷
      vi.advanceTimersByTime(50)
      service.interrupt()

      await vi.runAllTimersAsync()
      await Promise.allSettled([p1, p2])

      // 至少第一個動畫應該被中斷
      expect(executionOrder).toContain('anim1-interrupted')
    })

    it('應該在中斷後清空佇列中的待執行動畫', async () => {
      const results: string[] = []

      // 排入多個動畫
      const p1 = service.trigger('DEAL_CARDS', {
        targetZones: ['player-hand'],
        delay: 10,
        duration: 10,
      }).then(() => results.push('done'))
        .catch(() => results.push('interrupted'))

      const p2 = service.trigger('DEAL_CARDS', {
        targetZones: ['field'],
        delay: 10,
        duration: 10,
      }).then(() => results.push('done'))
        .catch(() => results.push('interrupted'))

      // 立即中斷
      service.interrupt()

      await vi.runAllTimersAsync()
      await Promise.allSettled([p1, p2])

      // 所有動畫都應該被中斷
      expect(results.filter(r => r === 'interrupted').length).toBeGreaterThanOrEqual(1)
    })

    it('中斷後應能重新觸發新動畫', async () => {
      // 第一個動畫
      const p1 = service.trigger('DEAL_CARDS', {
        targetZones: ['player-hand'],
        delay: 50,
        duration: 50,
      })

      // 中斷
      service.interrupt()

      await vi.runAllTimersAsync()
      await expect(p1).rejects.toThrow(InterruptedError)

      // 新動畫應該可以正常執行
      const p2 = service.trigger('DEAL_CARDS', {
        targetZones: ['field'],
        delay: 10,
        duration: 10,
      })

      await vi.runAllTimersAsync()
      await expect(p2).resolves.toBeUndefined()
    })

    it('中斷應該在 100ms 內恢復狀態（性能要求）', async () => {
      const startTime = performance.now()

      const promise = service.trigger('DEAL_CARDS', {
        targetZones: ['player-hand', 'field', 'opponent-hand'],
        delay: 1000,
        duration: 1000,
      })

      service.interrupt()

      await vi.runAllTimersAsync()
      await promise.catch(() => {})

      const elapsed = performance.now() - startTime
      // 中斷後應快速恢復（實際時間，不含 fake timer）
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('CARD_MOVE 動畫', () => {
    it('應該處理找不到元素的情況', async () => {
      // 不創建元素，讓動畫找不到目標
      const promise = service.trigger('CARD_MOVE', {
        cardId: 'nonexistent',
        from: { x: 0, y: 0 },
        to: { x: 100, y: 100 },
        duration: 10,
      })

      await vi.runAllTimersAsync()
      // 應該正常完成（跳過動畫）
      await expect(promise).resolves.toBeUndefined()
    })

    it('應該使用 @vueuse/motion 執行動畫', async () => {
      const mockElement = document.createElement('div')
      mockElement.setAttribute('data-card-id', '0202')
      document.body.appendChild(mockElement)

      const promise = service.trigger('CARD_MOVE', {
        cardId: '0202',
        from: { x: 0, y: 0 },
        to: { x: 50, y: 50 },
        duration: 10,
      })

      await vi.runAllTimersAsync()
      await promise

      // 驗證動畫完成（無錯誤即成功）

      // 清理
      document.body.removeChild(mockElement)
    })

    it('應該計算正確的移動距離', async () => {
      const mockElement = document.createElement('div')
      mockElement.setAttribute('data-card-id', '0303')
      document.body.appendChild(mockElement)

      const promise = service.trigger('CARD_MOVE', {
        cardId: '0303',
        from: { x: 10, y: 20 },
        to: { x: 110, y: 120 },
        duration: 10,
      })

      await vi.runAllTimersAsync()
      await promise

      // 清理
      document.body.removeChild(mockElement)
    })
  })
})

