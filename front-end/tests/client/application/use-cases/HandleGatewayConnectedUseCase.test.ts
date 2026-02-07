/**
 * HandleGatewayConnectedUseCase Unit Tests - IN_PRIVATE_ROOM branch
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HandleGatewayConnectedUseCase } from '~/game-client/application/use-cases/HandleGatewayConnectedUseCase'
import type { MatchmakingStatePort, SessionContextPort, GameStatePort, ConnectionReadyPort, PrivateRoomStatePort } from '~/game-client/application/ports/output'

describe('HandleGatewayConnectedUseCase', () => {
  let useCase: HandleGatewayConnectedUseCase
  let mockMatchmakingState: MatchmakingStatePort
  let mockSessionContext: SessionContextPort
  let mockGameState: GameStatePort
  let mockConnectionReady: ConnectionReadyPort
  let mockPrivateRoomState: PrivateRoomStatePort

  beforeEach(() => {
    mockMatchmakingState = {
      setStatus: vi.fn(),
      setSessionToken: vi.fn(),
      setGameId: vi.fn(),
      setErrorMessage: vi.fn(),
      clearSession: vi.fn(),
      setElapsedSeconds: vi.fn(),
      setStatusMessage: vi.fn(),
      setOpponentInfo: vi.fn(),
      setMatchedState: vi.fn(),
      sessionToken: null,
      gameId: null,
      elapsedSeconds: 0,
      statusMessage: null,
      opponentName: null,
      isBot: false,
    } as unknown as MatchmakingStatePort

    mockSessionContext = {
      setCurrentGameId: vi.fn(),
      setSelectedRoomTypeId: vi.fn(),
    } as unknown as SessionContextPort

    mockGameState = {
      setCurrentGameId: vi.fn(),
    } as unknown as GameStatePort

    mockConnectionReady = {
      notifyConnectionReady: vi.fn(),
    } as ConnectionReadyPort

    mockPrivateRoomState = {
      setRoomInfo: vi.fn(),
      clearRoom: vi.fn(),
    } as PrivateRoomStatePort

    useCase = new HandleGatewayConnectedUseCase(
      mockMatchmakingState,
      mockSessionContext,
      mockGameState,
      mockConnectionReady,
      mockPrivateRoomState
    )
  })

  it('should set private room info when status is IN_PRIVATE_ROOM', async () => {
    await useCase.execute({
      player_id: 'player-1',
      status: 'IN_PRIVATE_ROOM',
      roomId: 'ABC123',
      roomType: 'STANDARD',
      hostName: 'TestHost',
      roomStatus: 'WAITING',
    })

    expect(mockPrivateRoomState.setRoomInfo).toHaveBeenCalledWith({
      roomId: 'ABC123',
      roomType: 'STANDARD',
      hostName: 'TestHost',
      roomStatus: 'WAITING',
    })
  })

  it('should notify connection ready with IN_PRIVATE_ROOM status', async () => {
    await useCase.execute({
      player_id: 'player-1',
      status: 'IN_PRIVATE_ROOM',
      roomId: 'ABC123',
      roomType: 'STANDARD',
      hostName: 'TestHost',
      roomStatus: 'FULL',
    })

    expect(mockConnectionReady.notifyConnectionReady).toHaveBeenCalledWith({
      playerId: 'player-1',
      status: 'IN_PRIVATE_ROOM',
      roomType: 'STANDARD',
      elapsedSeconds: undefined,
      gameId: undefined,
      roomId: 'ABC123',
    })
  })

  it('should clear currentGameId when status is IDLE', async () => {
    await useCase.execute({
      player_id: 'player-1',
      status: 'IDLE',
    })

    expect(mockSessionContext.setCurrentGameId).toHaveBeenCalledWith(null)
    expect(mockPrivateRoomState.setRoomInfo).not.toHaveBeenCalled()
  })

  it('should restore matchmaking UI when status is MATCHMAKING', async () => {
    await useCase.execute({
      player_id: 'player-1',
      status: 'MATCHMAKING',
      roomType: 'STANDARD',
      elapsedSeconds: 5,
    })

    expect(mockMatchmakingState.setElapsedSeconds).toHaveBeenCalledWith(5)
    expect(mockMatchmakingState.setStatus).toHaveBeenCalledWith('searching')
    expect(mockPrivateRoomState.setRoomInfo).not.toHaveBeenCalled()
  })
})
