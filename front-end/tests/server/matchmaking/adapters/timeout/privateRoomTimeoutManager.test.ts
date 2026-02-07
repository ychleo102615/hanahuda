/**
 * PrivateRoomTimeoutManager Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  PrivateRoomTimeoutManager,
  type PrivateRoomTimerCallbacks,
} from '~~/server/matchmaking/adapters/timeout/privateRoomTimeoutManager'

describe('PrivateRoomTimeoutManager', () => {
  let manager: PrivateRoomTimeoutManager
  let callbacks: PrivateRoomTimerCallbacks

  beforeEach(() => {
    vi.useFakeTimers()

    callbacks = {
      onExpire: vi.fn(),
      onWarning: vi.fn(),
      onDisconnect: vi.fn(),
    }

    manager = new PrivateRoomTimeoutManager(callbacks)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('setExpirationTimer', () => {
    it('should call onExpire after the specified duration', () => {
      manager.setExpirationTimer('ROOM-1', 5000)

      vi.advanceTimersByTime(4999)
      expect(callbacks.onExpire).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(callbacks.onExpire).toHaveBeenCalledWith('ROOM-1')
    })

    it('should replace existing timer for the same roomId', () => {
      manager.setExpirationTimer('ROOM-1', 5000)
      manager.setExpirationTimer('ROOM-1', 10000)

      vi.advanceTimersByTime(5000)
      expect(callbacks.onExpire).not.toHaveBeenCalled()

      vi.advanceTimersByTime(5000)
      expect(callbacks.onExpire).toHaveBeenCalledOnce()
    })
  })

  describe('setWarningTimer', () => {
    it('should call onWarning after the specified duration', () => {
      manager.setWarningTimer('ROOM-1', 3000)

      vi.advanceTimersByTime(3000)
      expect(callbacks.onWarning).toHaveBeenCalledWith('ROOM-1')
    })
  })

  describe('setDisconnectionTimer', () => {
    it('should call onDisconnect after the specified duration', () => {
      manager.setDisconnectionTimer('player-1', 30000)

      vi.advanceTimersByTime(30000)
      expect(callbacks.onDisconnect).toHaveBeenCalledWith('player-1')
    })
  })

  describe('clearTimers', () => {
    it('should cancel both expiration and warning timers', () => {
      manager.setExpirationTimer('ROOM-1', 5000)
      manager.setWarningTimer('ROOM-1', 3000)

      manager.clearTimers('ROOM-1')

      vi.advanceTimersByTime(10000)
      expect(callbacks.onExpire).not.toHaveBeenCalled()
      expect(callbacks.onWarning).not.toHaveBeenCalled()
    })

    it('should not affect other rooms', () => {
      manager.setExpirationTimer('ROOM-1', 5000)
      manager.setExpirationTimer('ROOM-2', 5000)

      manager.clearTimers('ROOM-1')

      vi.advanceTimersByTime(5000)
      expect(callbacks.onExpire).toHaveBeenCalledOnce()
      expect(callbacks.onExpire).toHaveBeenCalledWith('ROOM-2')
    })
  })

  describe('clearDisconnectionTimer', () => {
    it('should cancel disconnection timer for a player', () => {
      manager.setDisconnectionTimer('player-1', 30000)

      manager.clearDisconnectionTimer('player-1')

      vi.advanceTimersByTime(30000)
      expect(callbacks.onDisconnect).not.toHaveBeenCalled()
    })

    it('should not throw for non-existent timer', () => {
      expect(() => {
        manager.clearDisconnectionTimer('non-existent')
      }).not.toThrow()
    })
  })
})
