/**
 * Opponent Store
 *
 * @description
 * 管理 AI 對手實例，追蹤每個遊戲的 AI 對手。
 * 設計類似 ConnectionStore，使用嵌套 Map 結構。
 *
 * 結構：Map<gameId, OpponentInfo>
 *
 * @module server/adapters/opponent/opponentStore
 */

import type { AiStrategyType } from '~~/server/application/ports/input/joinGameAsAiInputPort'
import type { GameEvent } from '#shared/contracts'

/**
 * 事件處理器類型
 */
export type OpponentEventHandler = (event: GameEvent) => void

/**
 * 對手資訊
 */
export interface OpponentInfo {
  /** 遊戲 ID */
  readonly gameId: string
  /** AI 玩家 ID */
  readonly playerId: string
  /** AI 策略類型 */
  readonly strategyType: AiStrategyType
  /** 建立時間 */
  readonly createdAt: Date
  /** 事件處理器（由 OpponentInstance 提供） */
  readonly handler: OpponentEventHandler
}

/**
 * Opponent Store
 *
 * @description
 * 使用 Map 儲存每個遊戲的 AI 對手資訊。
 * 單例模式，全域共用。
 */
class OpponentStore {
  /**
   * 遊戲 ID -> 對手資訊
   */
  private opponents: Map<string, OpponentInfo> = new Map()

  /**
   * 註冊對手
   *
   * @param info 對手資訊
   */
  register(info: OpponentInfo): void {
    this.opponents.set(info.gameId, info)
  }

  /**
   * 移除對手
   *
   * @param gameId 遊戲 ID
   */
  unregister(gameId: string): void {
    const opponent = this.opponents.get(gameId)
    if (opponent) {
      this.opponents.delete(gameId)
    }
  }

  /**
   * 取得對手資訊
   *
   * @param gameId 遊戲 ID
   * @returns 對手資訊（若存在）
   */
  get(gameId: string): OpponentInfo | undefined {
    return this.opponents.get(gameId)
  }

  /**
   * 檢查遊戲是否有 AI 對手
   *
   * @param gameId 遊戲 ID
   * @returns 是否有 AI 對手
   */
  hasOpponent(gameId: string): boolean {
    return this.opponents.has(gameId)
  }

  /**
   * 發送事件到對手
   *
   * @param gameId 遊戲 ID
   * @param event 遊戲事件
   * @returns 是否成功發送
   */
  sendEvent(gameId: string, event: GameEvent): boolean {
    const opponent = this.opponents.get(gameId)
    if (opponent) {
      try {
        opponent.handler(event)
        return true
      } catch {
        return false
      }
    }
    return false
  }

  /**
   * 取得所有活躍遊戲 ID
   *
   * @returns 遊戲 ID 列表
   */
  getActiveGameIds(): string[] {
    return Array.from(this.opponents.keys())
  }

  /**
   * 取得總對手數量
   *
   * @returns 對手數量
   */
  getOpponentCount(): number {
    return this.opponents.size
  }

  /**
   * 清除遊戲的對手
   *
   * @param gameId 遊戲 ID
   */
  clearGame(gameId: string): void {
    this.unregister(gameId)
  }
}

/**
 * 對手儲存單例
 */
export const opponentStore = new OpponentStore()
