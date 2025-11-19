/**
 * API Error Types
 *
 * 定義所有 API 相關的錯誤型別
 */

/**
 * 網路連線錯誤
 * 發生於無法連接到伺服器時（如網路中斷）
 */
export class NetworkError extends Error {
  constructor(message = '網路連線失敗') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * 伺服器錯誤
 * 發生於伺服器返回 4xx 或 5xx 狀態碼時
 */
export class ServerError extends Error {
  constructor(
    public status: number,
    message?: string
  ) {
    super(message || `伺服器錯誤 (${status})`);
    this.name = 'ServerError';
  }
}

/**
 * 請求超時錯誤
 * 發生於請求超過設定的超時時間時
 */
export class TimeoutError extends Error {
  constructor(message = '請求超時') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * 驗證錯誤
 * 發生於輸入資料驗證失敗時
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
