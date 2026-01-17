/**
 * Leaderboard BC Plugin
 *
 * @description
 * 初始化 Leaderboard Bounded Context。
 * 訂閱 GAME_FINISHED 事件以更新玩家統計和排行榜。
 *
 * @module server/plugins/leaderboard
 */

import { db } from '~~/server/utils/db'
import { getLeaderboardContainer } from '~~/server/leaderboard/adapters/di/container'

export default defineNitroPlugin(() => {
  // 初始化 Leaderboard 容器並開始訂閱事件
  const container = getLeaderboardContainer(db)

  // 訂閱 GAME_FINISHED 事件
  container.gameFinishedSubscriber.subscribe()

  console.log('[LeaderboardPlugin] Initialized and subscribed to GAME_FINISHED events')
})
