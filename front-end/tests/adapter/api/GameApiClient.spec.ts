/**
 * GameApiClient Contract Tests (User Story 1)
 *
 * @description
 * 測試 GameApiClient 實作 SendCommandPort 介面的正確性。
 * 根據 contracts/api-client.md 的契約規範撰寫。
 *
 * Test Cases:
 * - T014 [US1]: Contract test for joinGame API
 * - 其他測試將在 US2, US3 完成時新增
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GameApiClient } from '@/user-interface/adapter/api/GameApiClient'
import {
  NetworkError,
  ServerError,
  TimeoutError,
  ValidationError,
} from '@/user-interface/adapter/api/errors'

describe('GameApiClient - User Story 1 Contract Tests', () => {
  let apiClient: GameApiClient
  const baseURL = 'http://localhost:8080'

  beforeEach(() => {
    apiClient = new GameApiClient(baseURL)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('T014 [US1]: joinGame API Contract', () => {
    describe('成功場景', () => {
      it('should return JoinGameResponse when joining without session token', async () => {
        const mockResponse = {
          game_id: 'uuid-123',
          session_token: 'new-token-456',
          player_id: 'player-1',
          snapshot: null,
        }

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        })

        const result = await apiClient.joinGame()

        expect(result).toEqual(mockResponse)
        expect(global.fetch).toHaveBeenCalledTimes(1)
        expect(global.fetch).toHaveBeenCalledWith(
          `${baseURL}/api/v1/games/join`,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
        )
      })

      it('should include session token when reconnecting', async () => {
        const mockResponse = {
          game_id: 'uuid-123',
          session_token: 'new-token-456',
          player_id: 'player-1',
          snapshot: {
            game_id: 'uuid-123',
            flow_state: {},
            field: [],
            hands: [],
            depositories: [],
            scores: [],
            current_player_id: 'player-1',
            deck_remaining: 24,
          },
        }

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        })

        const sessionToken = 'existing-token-123'
        const result = await apiClient.joinGame(sessionToken)

        expect(result).toEqual(mockResponse)
        expect(global.fetch).toHaveBeenCalledWith(
          `${baseURL}/api/v1/games/join`,
          expect.objectContaining({
            body: JSON.stringify({ session_token: sessionToken }),
          })
        )
      })
    })

    describe('錯誤場景', () => {
      it('should throw ValidationError on 400 Bad Request', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: async () => 'Invalid session token',
        })

        await expect(apiClient.joinGame('invalid-token')).rejects.toThrow(
          ValidationError
        )
        await expect(apiClient.joinGame('invalid-token')).rejects.toThrow(
          '請求格式錯誤,請稍後再試'
        )
      })

      it('should throw ValidationError on 404 Not Found', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          text: async () => 'Game not found',
        })

        await expect(apiClient.joinGame('old-token')).rejects.toThrow(
          ValidationError
        )
        await expect(apiClient.joinGame('old-token')).rejects.toThrow(
          '遊戲不存在或已結束'
        )
      })

      it('should throw ServerError on 500 Internal Server Error', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        })

        await expect(apiClient.joinGame()).rejects.toThrow(ServerError)
        await expect(apiClient.joinGame()).rejects.toThrow(
          '伺服器暫時無法使用,請稍後再試'
        )
      })

      it('should throw NetworkError when fetch throws TypeError', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'))

        await expect(apiClient.joinGame()).rejects.toThrow(NetworkError)
        await expect(apiClient.joinGame()).rejects.toThrow('網路連線失敗')
      })

      it('should throw TimeoutError when request times out', async () => {
        global.fetch = vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              const abortError = new Error('The operation was aborted')
              abortError.name = 'AbortError'
              reject(abortError)
            }, 100)
          })
        })

        const fastClient = new GameApiClient(baseURL, { timeout: 50 })

        await expect(fastClient.joinGame()).rejects.toThrow(TimeoutError)
        await expect(fastClient.joinGame()).rejects.toThrow('請求超時')
      })
    })

    describe('重試機制 (joinGame 不應重試)', () => {
      it('should NOT retry on NetworkError', async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'))

        await expect(apiClient.joinGame()).rejects.toThrow(NetworkError)

        // joinGame 失敗時不重試，避免重複加入遊戲
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      it('should NOT retry on ServerError', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        })

        await expect(apiClient.joinGame()).rejects.toThrow(ServerError)

        // joinGame 失敗時不重試
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })
  })
})
