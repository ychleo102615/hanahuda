/**
 * WebSocket Command Handler - WebSocket 命令處理器
 *
 * @description
 * 處理 Client → Server 的 WebSocket 命令。
 * 路由命令到對應的 UseCase，並發送回應。
 *
 * @module server/gateway/wsCommandHandler
 */

import type { Peer } from 'crossws'
import type { WsCommand, WsCommandType } from '#shared/contracts'
import { createSuccessResponse, createErrorResponse, type WsCommandResponse } from '#shared/contracts'
import { resolve, BACKEND_TOKENS } from '../utils/container'
import type { PlayHandCardInputPort } from '../core-game/application/ports/input/playHandCardInputPort'
import type { SelectTargetInputPort } from '../core-game/application/ports/input/selectTargetInputPort'
import type { MakeDecisionInputPort } from '../core-game/application/ports/input/makeDecisionInputPort'
import type { ConfirmContinueInputPort } from '../core-game/application/ports/input/confirmContinueInputPort'
import type { LeaveGameInputPort } from '../core-game/application/ports/input/leaveGameInputPort'
import { logger } from '../utils/logger'

// Matchmaking imports
import { getIdentityContainer } from '../identity/adapters/di/container'
import { getMatchmakingContainer } from '../matchmaking/adapters/di/container'
import { getMatchmakingRegistry } from '../matchmaking/adapters/registry/matchmakingRegistrySingleton'
import { getInMemoryMatchmakingPool } from '../matchmaking/adapters/persistence/inMemoryMatchmakingPool'
import type { BotFallbackInfo } from '../matchmaking/adapters/registry/matchmakingRegistry'
import type { RoomTypeId } from '#shared/constants/roomTypes'
import type { PlayerId } from '../identity/domain/player/player'

/**
 * WsCommandHandler 介面
 */
export interface IWsCommandHandler {
  /**
   * 處理 WebSocket 命令
   *
   * @param playerId - 玩家 ID
   * @param command - WebSocket 命令
   * @param peer - WebSocket peer 實例
   */
  handle(playerId: string, command: WsCommand, peer: Peer): Promise<void>
}

/**
 * 發送回應到 WebSocket 連線
 */
function sendResponse(peer: Peer, response: WsCommandResponse): void {
  try {
    peer.send(JSON.stringify(response))
  } catch (error) {
    logger.error('Failed to send WebSocket response', { error })
  }
}

/**
 * 從錯誤中提取 error code
 */
function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code)
  }
  return 'UNKNOWN_ERROR'
}

/**
 * 從錯誤中提取 message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

/**
 * WsCommandHandler 實作
 */
class WsCommandHandler implements IWsCommandHandler {
  async handle(playerId: string, command: WsCommand, peer: Peer): Promise<void> {
    const commandType = command.type as WsCommandType

    logger.info('Handling WebSocket command', {
      playerId,
      commandType,
      commandId: command.command_id,
    })

    try {
      switch (commandType) {
        case 'PING':
          sendResponse(peer, createSuccessResponse(command.command_id))
          break

        case 'JOIN_MATCHMAKING':
          await this.handleJoinMatchmaking(playerId, command, peer)
          break

        case 'PLAY_CARD':
          await this.handlePlayCard(playerId, command, peer)
          break

        case 'SELECT_TARGET':
          await this.handleSelectTarget(playerId, command, peer)
          break

        case 'MAKE_DECISION':
          await this.handleMakeDecision(playerId, command, peer)
          break

        case 'CONFIRM_CONTINUE':
          await this.handleConfirmContinue(playerId, command, peer)
          break

        case 'LEAVE_GAME':
          await this.handleLeaveGame(playerId, command, peer)
          break

        default:
          sendResponse(
            peer,
            createErrorResponse(command.command_id, 'UNKNOWN_COMMAND', `Unknown command type: ${commandType}`)
          )
      }
    } catch (error) {
      logger.error('WebSocket command error', {
        playerId,
        commandType,
        commandId: command.command_id,
        error,
      })

      sendResponse(
        peer,
        createErrorResponse(command.command_id, getErrorCode(error), getErrorMessage(error))
      )
    }
  }

  private async handlePlayCard(playerId: string, command: WsCommand, peer: Peer): Promise<void> {
    const payload = command.payload as {
      game_id: string
      card_id: string
      target_card_id?: string
    }

    const useCase = resolve<PlayHandCardInputPort>(BACKEND_TOKENS.PlayHandCardInputPort)

    await useCase.execute({
      gameId: payload.game_id,
      playerId,
      cardId: payload.card_id,
      targetCardId: payload.target_card_id,
    })

    sendResponse(peer, createSuccessResponse(command.command_id))
  }

  private async handleSelectTarget(playerId: string, command: WsCommand, peer: Peer): Promise<void> {
    const payload = command.payload as {
      game_id: string
      source_card_id: string
      target_card_id: string
    }

    const useCase = resolve<SelectTargetInputPort>(BACKEND_TOKENS.SelectTargetInputPort)

    await useCase.execute({
      gameId: payload.game_id,
      playerId,
      sourceCardId: payload.source_card_id,
      targetCardId: payload.target_card_id,
    })

    sendResponse(peer, createSuccessResponse(command.command_id))
  }

  private async handleMakeDecision(playerId: string, command: WsCommand, peer: Peer): Promise<void> {
    const payload = command.payload as {
      game_id: string
      decision: 'KOI_KOI' | 'END_ROUND'
    }

    const useCase = resolve<MakeDecisionInputPort>(BACKEND_TOKENS.MakeDecisionInputPort)

    await useCase.execute({
      gameId: payload.game_id,
      playerId,
      decision: payload.decision,
    })

    sendResponse(peer, createSuccessResponse(command.command_id))
  }

  private async handleConfirmContinue(playerId: string, command: WsCommand, peer: Peer): Promise<void> {
    const payload = command.payload as {
      game_id: string
      decision: 'CONTINUE' | 'LEAVE'
    }

    const useCase = resolve<ConfirmContinueInputPort>(BACKEND_TOKENS.ConfirmContinueInputPort)

    await useCase.execute({
      gameId: payload.game_id,
      playerId,
      decision: payload.decision,
    })

    sendResponse(peer, createSuccessResponse(command.command_id))
  }

  private async handleLeaveGame(playerId: string, command: WsCommand, peer: Peer): Promise<void> {
    const payload = command.payload as {
      game_id: string
    }

    const useCase = resolve<LeaveGameInputPort>(BACKEND_TOKENS.LeaveGameInputPort)

    await useCase.execute({
      gameId: payload.game_id,
      playerId,
    })

    sendResponse(peer, createSuccessResponse(command.command_id))
  }

  /**
   * 處理加入配對命令
   *
   * @description
   * 透過 WebSocket 發送配對請求，確保連線已建立後才加入配對池。
   * 這解決了 HTTP 配對的 Race Condition 問題。
   */
  private async handleJoinMatchmaking(playerId: string, command: WsCommand, peer: Peer): Promise<void> {
    const payload = command.payload as {
      room_type: RoomTypeId
    }

    // 1. 取得玩家名稱
    const identityContainer = getIdentityContainer()
    const player = await identityContainer.playerRepository.findById(playerId as PlayerId)

    if (!player) {
      sendResponse(
        peer,
        createErrorResponse(command.command_id, 'PLAYER_NOT_FOUND', 'Player not found')
      )
      return
    }

    // 2. 呼叫 Use Case
    const matchmakingContainer = getMatchmakingContainer()
    const result = await matchmakingContainer.enterMatchmakingUseCase.execute({
      playerId,
      playerName: player.displayName,
      roomType: payload.room_type,
    })

    // 3. 處理結果
    if (!result.success) {
      sendResponse(
        peer,
        createErrorResponse(command.command_id, result.errorCode ?? 'MATCHMAKING_ERROR', result.message)
      )
      return
    }

    // 4. 如果是等待配對狀態，註冊到 MatchmakingRegistry
    const isWaitingForMatch = result.message.includes('Searching')

    if (isWaitingForMatch && result.entryId) {
      const registry = getMatchmakingRegistry()
      const pool = getInMemoryMatchmakingPool()
      const entry = await pool.findById(result.entryId)

      if (entry) {
        // Bot Fallback 回調
        const { processMatchmakingUseCase } = matchmakingContainer
        const botFallbackCallback = async (info: BotFallbackInfo) => {
          try {
            await processMatchmakingUseCase.executeBotFallback({
              entryId: info.entryId,
              playerId: info.playerId,
              playerName: info.playerName,
              roomType: info.roomType,
            })
          } catch (error) {
            logger.error('Bot fallback failed', { error })
          }
        }

        // 註冊到 Registry（啟動計時器）
        registry.registerEntry(entry, () => {}, botFallbackCallback)
      }
    }

    // 5. 回應成功（entry_id 透過事件通知，無需在回應中返回）
    sendResponse(peer, createSuccessResponse(command.command_id))
  }

}

/**
 * WsCommandHandler 單例
 */
export const wsCommandHandler: IWsCommandHandler = new WsCommandHandler()
