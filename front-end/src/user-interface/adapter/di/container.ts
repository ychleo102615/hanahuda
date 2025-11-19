/**
 * DIContainer - 自訂輕量級依賴注入容器
 *
 * 功能:
 * - 註冊依賴 (register)
 * - 解析依賴 (resolve)
 * - 單例模式支援 (singleton option)
 * - 清除所有依賴 (clear)
 *
 * 設計原則:
 * - 零外部依賴
 * - 型別安全 (使用 Symbol Token)
 * - 簡單易用 (~100 行程式碼)
 */

/**
 * 依賴工廠函數
 */
export type DependencyFactory<T = any> = () => T;

/**
 * 依賴註冊選項
 */
export interface DependencyOptions {
  singleton?: boolean;  // 是否為單例 (預設: false)
}

/**
 * 依賴注入錯誤
 */
export class DependencyNotFoundError extends Error {
  constructor(token: Symbol | string) {
    super(`Dependency not found: ${token.toString()}`);
    this.name = 'DependencyNotFoundError';
  }
}

/**
 * DIContainer 類別
 */
export class DIContainer {
  private dependencies: Map<Symbol | string, DependencyFactory>;
  private singletons: Map<Symbol | string, any>;

  constructor() {
    this.dependencies = new Map();
    this.singletons = new Map();
  }

  /**
   * 註冊依賴
   *
   * @param token - 依賴 Token (Symbol 或 string)
   * @param factory - 工廠函數
   * @param options - 註冊選項 (singleton)
   *
   * @example
   * ```typescript
   * container.register(
   *   TOKENS.GameApiClient,
   *   () => new GameApiClient('http://localhost:8080'),
   *   { singleton: true }
   * );
   * ```
   */
  register<T>(
    token: Symbol | string,
    factory: DependencyFactory<T>,
    options?: DependencyOptions
  ): void {
    this.dependencies.set(token, factory);

    // 若為單例模式，預先建立實例
    if (options?.singleton) {
      this.singletons.set(token, factory());
    }
  }

  /**
   * 解析依賴
   *
   * @param token - 依賴 Token
   * @returns 依賴實例
   * @throws {DependencyNotFoundError} 若依賴未註冊
   *
   * @example
   * ```typescript
   * const apiClient = container.resolve<GameApiClient>(TOKENS.GameApiClient);
   * ```
   */
  resolve<T>(token: Symbol | string): T {
    // 檢查是否為單例
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    // 檢查是否已註冊
    const factory = this.dependencies.get(token);
    if (!factory) {
      throw new DependencyNotFoundError(token);
    }

    // 建立新實例
    return factory() as T;
  }

  /**
   * 檢查依賴是否已註冊
   *
   * @param token - 依賴 Token
   * @returns 是否已註冊
   */
  has(token: Symbol | string): boolean {
    return this.dependencies.has(token) || this.singletons.has(token);
  }

  /**
   * 清除所有依賴
   * (用於測試清理)
   */
  clear(): void {
    this.dependencies.clear();
    this.singletons.clear();
  }

  /**
   * 取得所有已註冊的 Token
   * (用於偵錯)
   */
  getRegisteredTokens(): Array<Symbol | string> {
    return Array.from(this.dependencies.keys());
  }
}

/**
 * 全域單例容器實例
 * (提供便捷的全域存取)
 */
export const container = new DIContainer();
