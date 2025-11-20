/**
 * AnimationQueue - 動畫佇列管理
 *
 * @description
 * FIFO 佇列管理，同時只執行一個動畫，支援中斷機制。
 */

import type { Animation, AnimationParams, AnimationType } from './types'

/**
 * 中斷錯誤
 */
export class InterruptedError extends Error {
  constructor() {
    super('Animation interrupted')
    this.name = 'InterruptedError'
  }
}

/**
 * 動畫佇列
 */
export class AnimationQueue {
  private queue: Animation[] = []
  private isPlaying: boolean = false
  private currentAnimation: Animation | null = null
  private executor: ((animation: Animation) => Promise<void>) | null = null

  /**
   * 設定動畫執行器
   *
   * @param executor - 執行單個動畫的函數
   */
  setExecutor(executor: (animation: Animation) => Promise<void>): void {
    this.executor = executor
  }

  /**
   * 將動畫加入佇列
   *
   * @param animation - 要加入的動畫
   */
  enqueue(animation: Animation): void {
    this.queue.push(animation)
    console.info('[AnimationQueue] Enqueue', { id: animation.id, type: animation.type, queueSize: this.queue.length })

    if (!this.isPlaying) {
      this.playNext()
    }
  }

  /**
   * 中斷所有動畫
   */
  interrupt(): void {
    console.warn('[AnimationQueue] Interrupt all animations')

    // 中斷當前動畫
    if (this.currentAnimation) {
      this.currentAnimation.status = 'interrupted'
      this.currentAnimation.callback?.()
      this.currentAnimation = null
    }

    // 中斷佇列中的所有動畫
    this.queue.forEach(animation => {
      animation.status = 'interrupted'
      animation.callback?.()
    })

    this.queue = []
    this.isPlaying = false
  }

  /**
   * 檢查佇列是否為空
   */
  isEmpty(): boolean {
    return this.queue.length === 0
  }

  /**
   * 取得佇列大小
   */
  size(): number {
    return this.queue.length
  }

  /**
   * 執行下一個動畫
   */
  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false
      this.currentAnimation = null
      return
    }

    this.isPlaying = true
    this.currentAnimation = this.queue.shift()!

    await this.play(this.currentAnimation)

    // 遞迴處理下一個
    this.playNext()
  }

  /**
   * 執行單個動畫
   *
   * @param animation - 要執行的動畫
   */
  private async play(animation: Animation): Promise<void> {
    const startTime = Date.now()

    try {
      console.info('[AnimationQueue] Start', { id: animation.id, type: animation.type })

      if (this.executor) {
        await this.executor(animation)
      }

      animation.status = 'completed'
      const elapsed = Date.now() - startTime
      console.info('[AnimationQueue] Complete', { id: animation.id, duration: elapsed })
    } catch (error) {
      console.error('[AnimationQueue] Failed', { animation, error })
      animation.status = 'completed' // 標記為完成避免卡住
    } finally {
      animation.callback?.()
    }
  }
}
