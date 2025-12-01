/**
 * MatchmakingStateStore Unit Tests
 *
 * @description
 * 測試 MatchmakingStateStore 的所有 actions 與 getters
 * 測試覆蓋率目標: > 80%
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMatchmakingStateStore } from '../../../src/user-interface/adapter/stores/matchmakingState'

describe('MatchmakingStateStore', () => {
  beforeEach(() => {
    // 建立新的 Pinia 實例
    setActivePinia(createPinia())
  })

  describe('初始狀態', () => {
    it('應該有正確的初始狀態', () => {
      const store = useMatchmakingStateStore()

      expect(store.status).toBe('idle')
      expect(store.sessionToken).toBeNull()
      expect(store.errorMessage).toBeNull()
    })
  })

  describe('setStatus', () => {
    it('應該正確設定配對狀態為 finding', () => {
      const store = useMatchmakingStateStore()

      store.setStatus('finding')
      expect(store.status).toBe('finding')
    })

    it('應該正確設定配對狀態為 error', () => {
      const store = useMatchmakingStateStore()

      store.setStatus('error')
      expect(store.status).toBe('error')
    })

    it('應該正確設定配對狀態為 idle', () => {
      const store = useMatchmakingStateStore()

      store.setStatus('finding')
      expect(store.status).toBe('finding')

      store.setStatus('idle')
      expect(store.status).toBe('idle')
    })
  })

  describe('setSessionToken', () => {
    it('應該正確設定會話 Token', () => {
      const store = useMatchmakingStateStore()

      const token = 'test-session-token-123'
      store.setSessionToken(token)
      expect(store.sessionToken).toBe(token)
    })

    it('應該能夠清除會話 Token', () => {
      const store = useMatchmakingStateStore()

      store.setSessionToken('test-token')
      expect(store.sessionToken).toBe('test-token')

      store.setSessionToken(null)
      expect(store.sessionToken).toBeNull()
    })
  })

  describe('setErrorMessage', () => {
    it('應該正確設定錯誤訊息', () => {
      const store = useMatchmakingStateStore()

      const errorMsg = '配對失敗，請稍後再試'
      store.setErrorMessage(errorMsg)
      expect(store.errorMessage).toBe(errorMsg)
    })

    it('應該能夠清除錯誤訊息', () => {
      const store = useMatchmakingStateStore()

      store.setErrorMessage('錯誤訊息')
      expect(store.errorMessage).toBe('錯誤訊息')

      store.setErrorMessage(null)
      expect(store.errorMessage).toBeNull()
    })
  })

  describe('clearSession', () => {
    it('應該重置所有配對相關狀態', () => {
      const store = useMatchmakingStateStore()

      // 先設定一些狀態
      store.setStatus('finding')
      store.setSessionToken('test-token-123')
      store.setErrorMessage('某個錯誤')

      // 清除會話
      store.clearSession()

      // 驗證所有狀態已重置
      expect(store.status).toBe('idle')
      expect(store.sessionToken).toBeNull()
      expect(store.errorMessage).toBeNull()
    })

    it('應該能多次調用 clearSession 而不出錯', () => {
      const store = useMatchmakingStateStore()

      store.setStatus('finding')
      store.setSessionToken('token')

      store.clearSession()
      expect(store.status).toBe('idle')

      // 再次調用應該不出錯
      store.clearSession()
      expect(store.status).toBe('idle')
      expect(store.sessionToken).toBeNull()
    })
  })

  describe('Getters', () => {
    describe('isFinding', () => {
      it('當狀態為 finding 時應該返回 true', () => {
        const store = useMatchmakingStateStore()

        store.setStatus('finding')
        expect(store.isFinding).toBe(true)
      })

      it('當狀態為 idle 時應該返回 false', () => {
        const store = useMatchmakingStateStore()

        store.setStatus('idle')
        expect(store.isFinding).toBe(false)
      })

      it('當狀態為 error 時應該返回 false', () => {
        const store = useMatchmakingStateStore()

        store.setStatus('error')
        expect(store.isFinding).toBe(false)
      })
    })

    describe('hasError', () => {
      it('當狀態為 error 時應該返回 true', () => {
        const store = useMatchmakingStateStore()

        store.setStatus('error')
        expect(store.hasError).toBe(true)
      })

      it('當狀態為 idle 時應該返回 false', () => {
        const store = useMatchmakingStateStore()

        store.setStatus('idle')
        expect(store.hasError).toBe(false)
      })

      it('當狀態為 finding 時應該返回 false', () => {
        const store = useMatchmakingStateStore()

        store.setStatus('finding')
        expect(store.hasError).toBe(false)
      })
    })

    describe('canStartMatchmaking', () => {
      it('當狀態為 idle 時應該返回 true', () => {
        const store = useMatchmakingStateStore()

        store.setStatus('idle')
        expect(store.canStartMatchmaking).toBe(true)
      })

      it('當狀態為 finding 時應該返回 false', () => {
        const store = useMatchmakingStateStore()

        store.setStatus('finding')
        expect(store.canStartMatchmaking).toBe(false)
      })

      it('當狀態為 error 時應該返回 false', () => {
        const store = useMatchmakingStateStore()

        store.setStatus('error')
        expect(store.canStartMatchmaking).toBe(false)
      })
    })
  })

  describe('MatchmakingStatePort 介面實作', () => {
    it('Store 應該實作 MatchmakingStatePort 的所有方法', () => {
      const store = useMatchmakingStateStore()

      // 驗證所有 Port 方法都存在
      expect(store).toHaveProperty('setStatus')
      expect(store).toHaveProperty('setSessionToken')
      expect(store).toHaveProperty('setErrorMessage')
      expect(store).toHaveProperty('clearSession')

      // 驗證方法可調用
      expect(typeof store.setStatus).toBe('function')
      expect(typeof store.setSessionToken).toBe('function')
      expect(typeof store.setErrorMessage).toBe('function')
      expect(typeof store.clearSession).toBe('function')
    })
  })

  describe('配對流程整合測試', () => {
    it('應該正確處理完整的配對成功流程', () => {
      const store = useMatchmakingStateStore()

      // 1. 初始狀態：閒置
      expect(store.status).toBe('idle')
      expect(store.canStartMatchmaking).toBe(true)

      // 2. 開始配對
      store.setStatus('finding')
      expect(store.isFinding).toBe(true)
      expect(store.canStartMatchmaking).toBe(false)

      // 3. 收到 session token
      store.setSessionToken('session-abc-123')
      expect(store.sessionToken).toBe('session-abc-123')

      // 4. 遊戲開始後清除配對狀態
      store.clearSession()
      expect(store.status).toBe('idle')
      expect(store.sessionToken).toBeNull()
    })

    it('應該正確處理配對失敗流程', () => {
      const store = useMatchmakingStateStore()

      // 1. 開始配對
      store.setStatus('finding')
      expect(store.isFinding).toBe(true)

      // 2. 配對失敗
      store.setStatus('error')
      store.setErrorMessage('配對超時，請重試')
      expect(store.hasError).toBe(true)
      expect(store.errorMessage).toBe('配對超時，請重試')

      // 3. 使用者點擊重試
      store.clearSession()
      expect(store.status).toBe('idle')
      expect(store.errorMessage).toBeNull()
      expect(store.canStartMatchmaking).toBe(true)
    })

    it('應該正確處理不可恢復的錯誤流程', () => {
      const store = useMatchmakingStateStore()

      // 1. 開始配對
      store.setStatus('finding')
      store.setSessionToken('temp-token')

      // 2. 收到不可恢復的錯誤
      store.setStatus('error')
      store.setErrorMessage('伺服器錯誤，請返回首頁')

      // 3. 清除會話並準備返回首頁
      store.clearSession()
      expect(store.status).toBe('idle')
      expect(store.sessionToken).toBeNull()
      expect(store.errorMessage).toBeNull()
    })
  })
})
