/**
 * Backend DIContainer - 自訂輕量級依賴注入容器
 *
 * @description
 * 與前端 DIContainer 設計一致，支援 Symbol Token。
 *
 * 功能:
 * - 註冊依賴 (register)
 * - 解析依賴 (resolve)
 * - 單例模式支援 (singleton option)
 * - 清除所有依賴 (clear)
 *
 * @module server/lib/di/DIContainer
 */

/**
 * 依賴工廠函數
 */
export type DependencyFactory<T = unknown> = () => T

/**
 * 依賴註冊選項
 */
export interface DependencyOptions {
  singleton?: boolean
}

/**
 * 依賴注入錯誤
 */
export class DependencyNotFoundError extends Error {
  constructor(token: symbol) {
    super(`Dependency not found: ${token.toString()}`)
    this.name = 'DependencyNotFoundError'
  }
}

/**
 * DIContainer 類別
 */
export class DIContainer {
  private dependencies: Map<symbol, DependencyFactory>
  private singletons: Map<symbol, unknown>

  constructor() {
    this.dependencies = new Map()
    this.singletons = new Map()
  }

  /**
   * 註冊依賴
   *
   * @param token - 依賴 Token (Symbol)
   * @param factory - 工廠函數
   * @param options - 註冊選項 (singleton)
   *
   * @example
   * ```typescript
   * container.register(
   *   BACKEND_TOKENS.GameRepository,
   *   () => gameRepository,
   *   { singleton: true }
   * )
   * ```
   */
  register<T>(token: symbol, factory: DependencyFactory<T>, options?: DependencyOptions): void {
    this.dependencies.set(token, factory)

    if (options?.singleton) {
      this.singletons.set(token, factory())
    }
  }

  /**
   * 解析依賴
   *
   * @param token - 依賴 Token (Symbol)
   * @returns 依賴實例
   * @throws {DependencyNotFoundError} 若依賴未註冊
   *
   * @example
   * ```typescript
   * const repo = container.resolve<GameRepository>(BACKEND_TOKENS.GameRepository)
   * ```
   */
  resolve<T>(token: symbol): T {
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T
    }

    const factory = this.dependencies.get(token)
    if (!factory) {
      throw new DependencyNotFoundError(token)
    }

    return factory() as T
  }

  /**
   * 檢查依賴是否已註冊
   *
   * @param token - 依賴 Token (Symbol)
   * @returns 是否已註冊
   */
  has(token: symbol): boolean {
    return this.dependencies.has(token) || this.singletons.has(token)
  }

  /**
   * 清除所有依賴（用於測試）
   */
  clear(): void {
    this.dependencies.clear()
    this.singletons.clear()
  }

  /**
   * 取得所有已註冊的 Token（用於偵錯）
   */
  getRegisteredTokens(): Array<symbol> {
    return Array.from(this.dependencies.keys())
  }
}
