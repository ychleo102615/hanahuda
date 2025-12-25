/**
 * 伺服器錯誤 (5xx)
 *
 * @description
 * 當 HTTP 回應狀態碼為 5xx 時使用。
 * 屬於技術層級錯誤，可在整個專案任何地方使用。
 *
 * @module shared/errors/ServerError
 */

import { HttpError } from './HttpError'

export class ServerError extends HttpError {
  override readonly name = 'ServerError'
  readonly status: number

  constructor(status: number, message?: string) {
    super(message || `Server error (${status})`)
    this.status = status
  }
}
