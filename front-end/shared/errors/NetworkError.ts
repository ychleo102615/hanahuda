/**
 * 網路連線失敗錯誤
 *
 * @description
 * 當 fetch 拋出 TypeError 時（通常為網路斷線）包裝為此錯誤。
 * 屬於技術層級錯誤，可在整個專案任何地方使用。
 *
 * @module shared/errors/NetworkError
 */

import { HttpError } from './HttpError'

export class NetworkError extends HttpError {
  override readonly name = 'NetworkError'

  constructor(message: string = 'Network connection failed') {
    super(message)
  }
}
