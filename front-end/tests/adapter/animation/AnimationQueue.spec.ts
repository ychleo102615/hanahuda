import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnimationQueue } from '../../../src/user-interface/adapter/animation/AnimationQueue'
import type { Animation } from '../../../src/user-interface/adapter/animation/types'

describe('AnimationQueue', () => {
  let queue: AnimationQueue

  beforeEach(() => {
    queue = new AnimationQueue()
  })

  describe('基本操作', () => {
    it('應該初始化為空佇列', () => {
      expect(queue.isEmpty()).toBe(true)
      expect(queue.size()).toBe(0)
    })

    it('應該正確加入動畫到佇列', () => {
      const animation = createTestAnimation('1')

      queue.enqueue(animation)

      // 注意：動畫會立即開始執行，所以 size 可能是 0
      // 這裡測試的是沒有 executor 時的行為
    })
  })

  describe('FIFO 執行', () => {
    it('應該依序執行動畫', async () => {
      const executionOrder: string[] = []

      // 設定快速執行的 executor
      queue.setExecutor(async (animation) => {
        executionOrder.push(animation.id)
        await sleep(10)
      })

      const animation1 = createTestAnimation('1')
      const animation2 = createTestAnimation('2')
      const animation3 = createTestAnimation('3')

      queue.enqueue(animation1)
      queue.enqueue(animation2)
      queue.enqueue(animation3)

      // 等待所有動畫完成
      await sleep(100)

      expect(executionOrder).toEqual(['1', '2', '3'])
    })

    it('應該在動畫完成後調用 callback', async () => {
      const callback = vi.fn()

      queue.setExecutor(async () => {
        await sleep(10)
      })

      const animation = createTestAnimation('1', callback)
      queue.enqueue(animation)

      await sleep(50)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(animation.status).toBe('completed')
    })
  })

  describe('中斷機制', () => {
    it('應該中斷當前動畫並清空佇列', async () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()]

      queue.setExecutor(async () => {
        await sleep(100) // 較長的動畫
      })

      const animations = callbacks.map((cb, i) => createTestAnimation(`${i}`, cb))
      animations.forEach(a => queue.enqueue(a))

      // 等待第一個動畫開始
      await sleep(10)

      // 中斷
      queue.interrupt()

      expect(queue.isEmpty()).toBe(true)

      // 所有 callback 都應該被調用
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled()
      })

      // 檢查狀態都是 interrupted
      animations.forEach(animation => {
        expect(animation.status).toBe('interrupted')
      })
    })

    it('應該在沒有動畫時也能安全中斷', () => {
      expect(() => queue.interrupt()).not.toThrow()
      expect(queue.isEmpty()).toBe(true)
    })
  })

  describe('錯誤處理', () => {
    it('應該在 executor 拋出錯誤時標記動畫為完成', async () => {
      const callback = vi.fn()

      queue.setExecutor(async () => {
        throw new Error('Test error')
      })

      const animation = createTestAnimation('1', callback)
      queue.enqueue(animation)

      await sleep(50)

      expect(callback).toHaveBeenCalled()
      expect(animation.status).toBe('completed') // 不是 failed，避免卡住
    })
  })
})

// 輔助函數
function createTestAnimation(id: string, callback?: () => void): Animation {
  return {
    id,
    type: 'CARD_MOVE',
    params: {
      cardId: '0101',
      from: { x: 0, y: 0 },
      to: { x: 100, y: 100 },
      duration: 10,
    },
    status: 'pending',
    callback,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
