/**
 * HTTP 技術錯誤基類
 *
 * @description
 * 純技術層級錯誤，不包含業務邏輯。
 * 作為 NetworkError, TimeoutError, ServerError 的共同基類。
 *
 * @module shared/errors/HttpError
 */

export abstract class HttpError extends Error {
  abstract override readonly name: string

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
