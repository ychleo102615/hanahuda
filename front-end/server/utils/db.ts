/**
 * Drizzle Database Client
 *
 * @description
 * 提供 Drizzle ORM 資料庫連線實例。
 * 使用 PostgreSQL 連線。
 *
 * 參考: specs/008-nuxt-backend-server/quickstart.md
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '~~/server/database/schema'

/**
 * PostgreSQL 連線字串
 *
 * @description
 * 從環境變數 DATABASE_URL 讀取。
 * 格式: postgresql://user:password@host:port/database
 */
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

/**
 * PostgreSQL 連線實例
 *
 * @description
 * 使用 postgres.js 建立連線池。
 * max: 最大連線數（預設 10）
 * connection.TimeZone: 設定為 UTC 確保時間戳一致性
 */
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: {
    TimeZone: 'UTC',
  },
})

/**
 * Drizzle ORM 實例
 *
 * @description
 * 帶有完整 Schema 型別推斷的 Drizzle 實例。
 *
 * @example
 * ```typescript
 * import { db } from '~/server/utils/db'
 * import { games } from '~/server/database/schema'
 *
 * // 查詢所有遊戲
 * const allGames = await db.select().from(games)
 *
 * // 插入新遊戲
 * const newGame = await db.insert(games).values({...}).returning()
 * ```
 */
export const db = drizzle(client, { schema })

/**
 * 關閉資料庫連線
 *
 * @description
 * 在應用程式結束時呼叫，確保連線池正確關閉。
 */
export async function closeDatabase(): Promise<void> {
  await client.end()
}
