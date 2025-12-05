/**
 * Database Schema Barrel File
 *
 * @description
 * 匯出所有資料庫 Schema 定義。
 *
 * @example
 * ```typescript
 * import { games, sessions, playerStats, gameSnapshots } from '~/server/database/schema'
 * ```
 */

// Tables
export { games, type Game, type NewGame, type GameStatus } from './games'
export {
  gameSnapshots,
  type GameSnapshot,
  type NewGameSnapshot,
  type RoundSnapshot,
  type PlayerRoundStateSnapshot,
  type PendingSelection,
} from './gameSnapshots'
export { playerStats, type PlayerStat, type NewPlayerStat, type YakuCounts } from './playerStats'
export { sessions, type Session, type NewSession } from './sessions'
