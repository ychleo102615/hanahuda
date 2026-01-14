/**
 * WebSocket Adapter Module
 *
 * @description
 * 匯出 WebSocket 相關的 Adapter 類別。
 * 取代原本的 REST API Adapter。
 *
 * @module app/game-client/adapter/ws
 */

// Event Routers
export { EventRouter } from './EventRouter'
export { GatewayEventRouter } from './GatewayEventRouter'
export { MatchmakingEventRouter } from './MatchmakingEventRouter'

// WebSocket Client
export { GatewayWebSocketClient, CommandTimeoutError, ConnectionClosedError } from './GatewayWebSocketClient'

// Command Adapter
export { WsSendCommandAdapter } from './WsSendCommandAdapter'
