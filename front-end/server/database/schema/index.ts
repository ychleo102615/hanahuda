/**
 * Database Schema Barrel File
 *
 * @description
 * 匯出所有資料庫 Schema 定義。
 *
 * @example
 * ```typescript
 * import { games, playerStats, players } from '~/server/database/schema'
 * ```
 */

// Core Game BC Tables
export { games, type Game, type NewGame, type GameStatus } from './games'
export { playerStats, type PlayerStat, type NewPlayerStat, type YakuCounts } from './playerStats'
export { gameLogs, type GameLog, type NewGameLog, type GameLogEventType } from './gameLogs'

// Identity BC Tables
export { players, type Player, type NewPlayer } from './players'
export { accounts, type Account, type NewAccount } from './accounts'
export { oauthLinks, type OAuthLink, type NewOAuthLink, type OAuthProvider } from './oauthLinks'
export { sessions, type Session, type NewSession } from './sessions'
