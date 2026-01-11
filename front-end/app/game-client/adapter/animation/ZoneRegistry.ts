/**
 * ZoneRegistry - 區域位置註冊表
 *
 * @description
 * 管理所有遊戲區域（場牌、手牌、獲得區等）的螢幕位置追蹤。
 * 使用 ResizeObserver 監聽元素大小變化，自動更新位置資訊。
 * 供 AnimationService 計算卡片移動動畫的起點/終點座標。
 *
 * @since Phase 6 - User Story 4
 */

import type { ZoneName, ZonePosition } from './types'

/**
 * 區域註冊資料
 */
interface ZoneEntry {
  element: HTMLElement
  position: ZonePosition
  observer: ResizeObserver
}

/**
 * ZoneRegistry 類別
 *
 * @description
 * Adapter 層內部實現，不暴露到 Application Port。
 * 使用 ResizeObserver 追蹤區域位置變化。
 */
export class ZoneRegistry {
  private zones: Map<ZoneName, ZoneEntry> = new Map()

  /**
   * 註冊區域
   *
   * @param zoneName - 區域名稱
   * @param element - 區域 DOM 元素
   */
  register(zoneName: ZoneName, element: HTMLElement): void {
    // 若已存在，先取消註冊
    if (this.zones.has(zoneName)) {
      this.unregister(zoneName)
    }

    // 建立初始位置
    const rect = element.getBoundingClientRect()
    const position: ZonePosition = {
      zoneName,
      rect,
    }

    // 建立 ResizeObserver
    const observer = new ResizeObserver(() => {
      this.updatePosition(zoneName, element)
    })

    observer.observe(element)

    // 儲存註冊資料
    this.zones.set(zoneName, {
      element,
      position,
      observer,
    })
  }

  /**
   * 取消註冊區域
   *
   * @param zoneName - 區域名稱
   */
  unregister(zoneName: ZoneName): void {
    const entry = this.zones.get(zoneName)
    if (!entry) {
      return
    }

    entry.observer.disconnect()
    this.zones.delete(zoneName)
  }

  /**
   * 取得區域位置
   *
   * @param zoneName - 區域名稱
   * @returns 區域位置資訊，若未註冊則返回 null
   */
  getPosition(zoneName: ZoneName): ZonePosition | null {
    const entry = this.zones.get(zoneName)
    if (!entry) {
      return null
    }

    // 即時獲取位置，確保 RWD 調整後位置正確
    return {
      zoneName,
      rect: entry.element.getBoundingClientRect(),
    }
  }

  /**
   * 取得所有已註冊的區域名稱
   *
   * @returns 區域名稱陣列
   */
  getAllZones(): ZoneName[] {
    return Array.from(this.zones.keys())
  }

  /**
   * 在指定 zone 內查找卡片元素
   *
   * @param zoneName - Zone 名稱
   * @param cardId - 卡片 ID
   * @returns 卡片 DOM 元素，找不到或 zone 未註冊時返回 null
   */
  findCardInZone(zoneName: ZoneName, cardId: string): HTMLElement | null {
    const entry = this.zones.get(zoneName)
    if (!entry) {
      return null
    }
    return entry.element.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement | null
  }

  /**
   * 查找卡片元素，支援優先 zone 和 fallback
   *
   * @param cardId - 卡片 ID
   * @param preferredZone - 優先查找的 zone（可選）
   * @returns 卡片 DOM 元素或 null
   */
  findCard(cardId: string, preferredZone?: ZoneName): HTMLElement | null {
    // 1. 如果指定優先 zone，先在該 zone 查找
    if (preferredZone) {
      const element = this.findCardInZone(preferredZone, cardId)
      if (element) return element
    }

    // 2. Fallback: 遍歷所有已註冊的 zone
    for (const zoneName of this.zones.keys()) {
      const element = this.findCardInZone(zoneName, cardId)
      if (element) return element
    }

    return null
  }

  /**
   * 清理所有註冊和 observers
   */
  dispose(): void {
    for (const entry of this.zones.values()) {
      entry.observer.disconnect()
    }
    this.zones.clear()
  }

  /**
   * 更新區域位置
   *
   * @param zoneName - 區域名稱
   * @param element - 區域 DOM 元素
   */
  private updatePosition(zoneName: ZoneName, element: HTMLElement): void {
    const entry = this.zones.get(zoneName)
    if (!entry) {
      return
    }

    const rect = element.getBoundingClientRect()
    entry.position = {
      zoneName,
      rect,
    }
  }
}

/**
 * 建立 ZoneRegistry 實例
 *
 * @returns ZoneRegistry 實例
 */
export function createZoneRegistry(): ZoneRegistry {
  return new ZoneRegistry()
}

// 導出單例（供 DI Container 使用）
export const zoneRegistry = new ZoneRegistry()
