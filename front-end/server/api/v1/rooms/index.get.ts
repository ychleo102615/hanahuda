/**
 * GET /api/v1/rooms - 取得房間類型列表
 *
 * @description
 * 回傳可用的房間類型配置，供前端 Lobby 頁面顯示選擇。
 *
 * @module server/api/v1/rooms
 */

import { ROOM_TYPES, type RoomTypeConfig } from '#shared/constants/roomTypes'

/**
 * API 回應格式
 */
interface RoomTypeResponse {
  id: string
  name: string
  description: string
  rounds: number
}

export default defineEventHandler((): { data: RoomTypeResponse[] } => {
  const rooms: RoomTypeResponse[] = Object.values(ROOM_TYPES).map((config: RoomTypeConfig) => ({
    id: config.id,
    name: config.name,
    description: config.description,
    rounds: config.ruleset.total_rounds,
  }))

  return { data: rooms }
})
