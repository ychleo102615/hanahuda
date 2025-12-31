/**
 * 請求超時錯誤
 *
 * @description
 * 當請求因 AbortController 超時而中止時使用。
 * 屬於技術層級錯誤，可在整個專案任何地方使用。
 *
 * @module shared/errors/TimeoutError
 */

import { HttpError } from './HttpError'

export class TimeoutError extends HttpError {
  override readonly name = 'TimeoutError'

  constructor(message: string = 'Request timed out') {
    super(message)
  }
}
