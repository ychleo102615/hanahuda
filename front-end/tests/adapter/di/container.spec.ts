/**
 * DIContainer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DIContainer, DependencyNotFoundError } from '../../../src/user-interface/adapter/di/container';

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  describe('基本功能', () => {
    it('應該成功註冊並解析依賴', () => {
      // Arrange
      const token = Symbol('TestService');
      const factory = () => ({ name: 'TestService' });

      // Act
      container.register(token, factory);
      const instance = container.resolve(token);

      // Assert
      expect(instance).toEqual({ name: 'TestService' });
    });

    it('應該每次解析時建立新實例 (非單例)', () => {
      // Arrange
      const token = Symbol('TestService');
      let counter = 0;
      const factory = () => ({ id: ++counter });

      // Act
      container.register(token, factory);
      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      // Assert
      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(2);
      expect(instance1).not.toBe(instance2);
    });

    it('應該在未註冊時拋出 DependencyNotFoundError', () => {
      // Arrange
      const token = Symbol('NonExistentService');

      // Act & Assert
      expect(() => container.resolve(token)).toThrow(DependencyNotFoundError);
      expect(() => container.resolve(token)).toThrow('Dependency not found');
    });
  });

  describe('單例模式', () => {
    it('應該在單例模式下返回相同實例', () => {
      // Arrange
      const token = Symbol('SingletonService');
      let counter = 0;
      const factory = () => ({ id: ++counter });

      // Act
      container.register(token, factory, { singleton: true });
      const instance1 = container.resolve(token);
      const instance2 = container.resolve(token);

      // Assert
      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(1);
      expect(instance1).toBe(instance2);
    });

    it('應該在註冊時預先建立單例實例', () => {
      // Arrange
      const token = Symbol('SingletonService');
      let instantiated = false;
      const factory = () => {
        instantiated = true;
        return { name: 'Singleton' };
      };

      // Act
      container.register(token, factory, { singleton: true });

      // Assert
      expect(instantiated).toBe(true);
    });
  });

  describe('輔助方法', () => {
    it('has() 應該正確檢查依賴是否已註冊', () => {
      // Arrange
      const token1 = Symbol('Service1');
      const token2 = Symbol('Service2');
      const factory = () => ({});

      // Act
      container.register(token1, factory);

      // Assert
      expect(container.has(token1)).toBe(true);
      expect(container.has(token2)).toBe(false);
    });

    it('clear() 應該清除所有依賴', () => {
      // Arrange
      const token1 = Symbol('Service1');
      const token2 = Symbol('Service2');
      const factory = () => ({});

      container.register(token1, factory);
      container.register(token2, factory, { singleton: true });

      // Act
      container.clear();

      // Assert
      expect(container.has(token1)).toBe(false);
      expect(container.has(token2)).toBe(false);
    });

    it('getRegisteredTokens() 應該返回所有已註冊的 Token', () => {
      // Arrange
      const token1 = Symbol('Service1');
      const token2 = Symbol('Service2');
      const factory = () => ({});

      // Act
      container.register(token1, factory);
      container.register(token2, factory);

      const tokens = container.getRegisteredTokens();

      // Assert
      expect(tokens).toHaveLength(2);
      expect(tokens).toContain(token1);
      expect(tokens).toContain(token2);
    });
  });

  describe('型別支援', () => {
    interface TestService {
      name: string;
      getValue(): number;
    }

    it('應該支援 TypeScript 泛型型別', () => {
      // Arrange
      const token = Symbol('TypedService');
      const factory = (): TestService => ({
        name: 'Test',
        getValue: () => 42,
      });

      // Act
      container.register<TestService>(token, factory);
      const instance = container.resolve<TestService>(token);

      // Assert
      expect(instance.name).toBe('Test');
      expect(instance.getValue()).toBe(42);
    });
  });

  describe('邊緣案例', () => {
    it('應該支援字串 Token', () => {
      // Arrange
      const token = 'StringToken';
      const factory = () => ({ name: 'StringService' });

      // Act
      container.register(token, factory);
      const instance = container.resolve(token);

      // Assert
      expect(instance).toEqual({ name: 'StringService' });
    });

    it('應該允許覆蓋已註冊的依賴', () => {
      // Arrange
      const token = Symbol('Service');
      const factory1 = () => ({ version: 1 });
      const factory2 = () => ({ version: 2 });

      // Act
      container.register(token, factory1);
      const instance1 = container.resolve(token);

      container.register(token, factory2);
      const instance2 = container.resolve(token);

      // Assert
      expect(instance1.version).toBe(1);
      expect(instance2.version).toBe(2);
    });
  });
});
