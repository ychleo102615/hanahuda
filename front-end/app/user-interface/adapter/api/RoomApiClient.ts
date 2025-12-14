/**
 * RoomApiClient - 房間類型 API 客戶端
 *
 * @description
 * 提供取得房間類型列表的 API 呼叫功能。
 * 用於 Lobby 頁面顯示可選擇的房間類型。
 *
 * @module user-interface/adapter/api/RoomApiClient
 */

/**
 * 房間類型資料結構
 */
export interface RoomType {
  /** 房間類型 ID */
  id: string
  /** 房間名稱 */
  name: string
  /** 房間描述 */
  description: string
  /** 回合數 */
  rounds: number
  /** 目標分數 */
  targetScore: number
}

/**
 * RoomApiClient 類別
 *
 * @description
 * 封裝房間類型相關的 API 呼叫。
 */
export class RoomApiClient {
  private readonly baseURL: string

  /**
   * @param baseURL - API 伺服器基礎 URL（預設為空，使用同源）
   */
  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  /**
   * 取得房間類型列表
   *
   * @returns 房間類型陣列
   * @throws Error 當 API 呼叫失敗時
   *
   * @example
   * ```typescript
   * const client = new RoomApiClient()
   * const rooms = await client.getRoomTypes()
   * // [{ id: 'QUICK', name: 'Quick Match', ... }, ...]
   * ```
   */
  async getRoomTypes(): Promise<RoomType[]> {
    const response = await fetch(`${this.baseURL}/api/v1/rooms`, {
      method: 'GET',
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch room types: ${response.status}`)
    }

    const json = await response.json()
    return json.data
  }
}
