/**
 * Database Schema Barrel File
 *
 * @description
 * 匯出所有資料庫 Schema 定義。
 *
 * @example
 * ```typescript
 * import { games, playerStats } from '~/server/database/schema'
 * ```
 */

// Tables
export { games, type Game, type NewGame, type GameStatus } from './games'
export { playerStats, type PlayerStat, type NewPlayerStat, type YakuCounts } from './playerStats'
export { gameLogs, type GameLog, type NewGameLog, type GameLogEventType } from './gameLogs'
