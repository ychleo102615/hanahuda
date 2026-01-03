/**
 * InMemoryGameLock 測試
 *
 * @description
 * 測試悲觀鎖的互斥執行和可重入特性。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryGameLock } from '~~/server/core-game/adapters/lock/inMemoryGameLock'

describe('InMemoryGameLock', () => {
  let gameLock: InMemoryGameLock

  beforeEach(() => {
    gameLock = new InMemoryGameLock()
  })

  describe('withLock', () => {
    it('應成功執行操作並返回結果', async () => {
      const result = await gameLock.withLock('game-1', async () => {
        return 'success'
      })

      expect(result).toBe('success')
    })

    it('應在操作拋出錯誤時正確傳播錯誤', async () => {
      await expect(
        gameLock.withLock('game-1', async () => {
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')
    })

    it('應確保同一 gameId 的操作互斥執行', async () => {
      const executionOrder: number[] = []
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      // 同時啟動兩個操作
      const promise1 = gameLock.withLock('game-1', async () => {
        executionOrder.push(1)
        await delay(50)
        executionOrder.push(2)
        return 'op1'
      })

      const promise2 = gameLock.withLock('game-1', async () => {
        executionOrder.push(3)
        await delay(10)
        executionOrder.push(4)
        return 'op2'
      })

      await Promise.all([promise1, promise2])

      // 操作應該是序列執行的：1, 2, 3, 4
      expect(executionOrder).toEqual([1, 2, 3, 4])
    })

    it('應允許不同 gameId 的操作並行執行', async () => {
      const executionOrder: string[] = []
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      // 同時啟動兩個不同 gameId 的操作
      const promise1 = gameLock.withLock('game-1', async () => {
        executionOrder.push('game-1-start')
        await delay(50)
        executionOrder.push('game-1-end')
        return 'op1'
      })

      const promise2 = gameLock.withLock('game-2', async () => {
        executionOrder.push('game-2-start')
        await delay(10)
        executionOrder.push('game-2-end')
        return 'op2'
      })

      await Promise.all([promise1, promise2])

      // 兩個操作應該交錯執行
      // game-1-start 和 game-2-start 都應該在任何 end 之前
      const startIndices = [
        executionOrder.indexOf('game-1-start'),
        executionOrder.indexOf('game-2-start'),
      ]
      const endIndices = [
        executionOrder.indexOf('game-1-end'),
        executionOrder.indexOf('game-2-end'),
      ]

      // 兩個 start 都應該在前兩位
      expect(startIndices.every(i => i < 2)).toBe(true)
      // 兩個 end 都應該在後兩位
      expect(endIndices.every(i => i >= 2)).toBe(true)
    })

    it('應在操作完成後釋放鎖', async () => {
      const executionOrder: number[] = []

      await gameLock.withLock('game-1', async () => {
        executionOrder.push(1)
        return 'op1'
      })

      // 第二個操作應該能夠立即獲取鎖
      await gameLock.withLock('game-1', async () => {
        executionOrder.push(2)
        return 'op2'
      })

      expect(executionOrder).toEqual([1, 2])
    })

    it('應在操作拋出錯誤後釋放鎖', async () => {
      const executionOrder: number[] = []

      try {
        await gameLock.withLock('game-1', async () => {
          executionOrder.push(1)
          throw new Error('Test error')
        })
      } catch {
        // 忽略錯誤
      }

      // 第二個操作應該能夠獲取鎖
      await gameLock.withLock('game-1', async () => {
        executionOrder.push(2)
        return 'op2'
      })

      expect(executionOrder).toEqual([1, 2])
    })
  })

  describe('可重入鎖', () => {
    it('應支援同一 gameId 的嵌套呼叫', async () => {
      const executionOrder: number[] = []

      const result = await gameLock.withLock('game-1', async () => {
        executionOrder.push(1)

        // 嵌套呼叫同一 gameId 的 withLock
        const innerResult = await gameLock.withLock('game-1', async () => {
          executionOrder.push(2)
          return 'inner'
        })

        executionOrder.push(3)
        return `outer-${innerResult}`
      })

      expect(result).toBe('outer-inner')
      expect(executionOrder).toEqual([1, 2, 3])
    })

    it('應支援多層嵌套呼叫', async () => {
      const executionOrder: number[] = []

      const result = await gameLock.withLock('game-1', async () => {
        executionOrder.push(1)

        const level2 = await gameLock.withLock('game-1', async () => {
          executionOrder.push(2)

          const level3 = await gameLock.withLock('game-1', async () => {
            executionOrder.push(3)
            return 'level3'
          })

          executionOrder.push(4)
          return `level2-${level3}`
        })

        executionOrder.push(5)
        return `level1-${level2}`
      })

      expect(result).toBe('level1-level2-level3')
      expect(executionOrder).toEqual([1, 2, 3, 4, 5])
    })

    it('嵌套呼叫不同 gameId 時應正確處理', async () => {
      const executionOrder: string[] = []

      const result = await gameLock.withLock('game-1', async () => {
        executionOrder.push('game-1-start')

        // 在持有 game-1 鎖的情況下請求 game-2 鎖
        const innerResult = await gameLock.withLock('game-2', async () => {
          executionOrder.push('game-2')
          return 'game-2-result'
        })

        executionOrder.push('game-1-end')
        return `game-1-result-${innerResult}`
      })

      expect(result).toBe('game-1-result-game-2-result')
      expect(executionOrder).toEqual(['game-1-start', 'game-2', 'game-1-end'])
    })
  })
})
