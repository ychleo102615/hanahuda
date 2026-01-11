/**
 * OperationSessionPortAdapter - OperationSessionPort 的 Adapter 實作
 *
 * @description
 * 將 OperationSessionManager 適配為 OperationSessionPort 介面。
 * 這是一個輕量級的包裝，直接委派給 OperationSessionManager。
 *
 * @module game-client/adapter/abort/OperationSessionPortAdapter
 */

import type { OperationSessionPort } from '../../application/ports/output/operation-session.port'
import type { OperationSessionManager } from './OperationSessionManager'

export class OperationSessionPortAdapter implements OperationSessionPort {
  constructor(private readonly manager: OperationSessionManager) {}

  createNewSession(): AbortSignal {
    return this.manager.createNewSession()
  }

  getSignal(): AbortSignal {
    return this.manager.getSignal()
  }

  abortAll(): void {
    this.manager.abortAll()
  }

  isAborted(): boolean {
    return this.manager.isAborted()
  }

  hasActiveSession(): boolean {
    return this.manager.hasActiveSession()
  }
}
