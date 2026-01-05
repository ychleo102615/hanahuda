/**
 * CreateGuestUseCase Tests
 *
 * @description
 * 測試建立訪客玩家的 Use Case。
 *
 * 參考: specs/010-player-account/spec.md US1 - 訪客遊玩
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateGuestUseCase } from '~~/server/identity/application/use-cases/create-guest-use-case'
import type { PlayerRepositoryPort } from '~~/server/identity/application/ports/output/player-repository-port'
import type { SessionStorePort } from '~~/server/identity/application/ports/output/session-store-port'
import type { Player } from '~~/server/identity/domain/player/player'
import type { Session } from '~~/server/identity/domain/types/session'

describe('CreateGuestUseCase', () => {
  let useCase: CreateGuestUseCase
  let mockPlayerRepository: PlayerRepositoryPort
  let mockSessionStore: SessionStorePort

  beforeEach(() => {
    mockPlayerRepository = {
      save: vi.fn().mockImplementation((player: Player) => Promise.resolve(player)),
      findById: vi.fn(),
      findByDisplayName: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    mockSessionStore = {
      save: vi.fn().mockImplementation((session: Session) => Promise.resolve(session)),
      findById: vi.fn(),
      delete: vi.fn(),
      deleteByPlayerId: vi.fn(),
      refresh: vi.fn(),
    }

    useCase = new CreateGuestUseCase(mockPlayerRepository, mockSessionStore)
  })

  describe('execute', () => {
    it('should create a guest player with auto-generated display name', async () => {
      const result = await useCase.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.player.isGuest).toBe(true)
        expect(result.data.player.displayName).toMatch(/^Guest_[A-Z0-9]{4}$/)
      }
    })

    it('should save the guest player to repository', async () => {
      await useCase.execute()

      expect(mockPlayerRepository.save).toHaveBeenCalledTimes(1)
      expect(mockPlayerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isGuest: true,
          displayName: expect.stringMatching(/^Guest_[A-Z0-9]{4}$/),
        })
      )
    })

    it('should create a session for the guest player', async () => {
      const result = await useCase.execute()

      expect(mockSessionStore.save).toHaveBeenCalledTimes(1)
      if (result.success) {
        expect(mockSessionStore.save).toHaveBeenCalledWith(
          expect.objectContaining({
            playerId: result.data.player.id,
          })
        )
      }
    })

    it('should return session id for cookie storage', async () => {
      const result = await useCase.execute()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sessionId).toBeDefined()
        expect(result.data.sessionId.length).toBeGreaterThan(0)
      }
    })

    it('should handle repository save failure', async () => {
      mockPlayerRepository.save = vi.fn().mockRejectedValue(new Error('DB Error'))

      const result = await useCase.execute()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INTERNAL_ERROR')
      }
    })

    it('should handle session store save failure', async () => {
      mockSessionStore.save = vi.fn().mockRejectedValue(new Error('Session Error'))

      const result = await useCase.execute()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INTERNAL_ERROR')
      }
    })
  })
})
