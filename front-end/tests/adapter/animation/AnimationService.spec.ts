import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnimationService } from '../../../src/user-interface/adapter/animation/AnimationService'
import { InterruptedError } from '../../../src/user-interface/adapter/animation/AnimationQueue'

describe('AnimationService', () => {
  let service: AnimationService

  beforeEach(() => {
    service = new AnimationService()
  })

  describe('trigger', () => {
    it('應該觸發 DEAL_CARDS 動畫', async () => {
      const promise = service.trigger('DEAL_CARDS', {
        targetZones: ['player-hand', 'field'],
        delay: 10,
        duration: 10,
      })

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

      // 立即中斷
      setTimeout(() => service.interrupt(), 10)

      await expect(promise).rejects.toThrow(InterruptedError)
    })

    it('應該在沒有動畫時也能安全中斷', () => {
      expect(() => service.interrupt()).not.toThrow()
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

      // 應該正常完成（跳過動畫）
      await expect(promise).resolves.toBeUndefined()
    })

    it('應該設定正確的 CSS transition', async () => {
      const mockElement = document.createElement('div')
      mockElement.setAttribute('data-card-id', '0202')
      document.body.appendChild(mockElement)

      const promise = service.trigger('CARD_MOVE', {
        cardId: '0202',
        from: { x: 0, y: 0 },
        to: { x: 50, y: 50 },
        duration: 10,
      })

      // 檢查動畫期間的樣式
      await sleep(5)
      expect(mockElement.style.transform).toContain('translate')

      await promise

      // 清理
      document.body.removeChild(mockElement)
    })
  })
})

// 輔助函數
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
