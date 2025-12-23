/**
 * Vitest Server Configuration
 *
 * @description
 * 專門用於後端 (server/) 單元測試的 Vitest 配置。
 * 與前端測試分離，使用 node 環境而非 jsdom。
 *
 * @module vitest.server.config
 */

import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    // 使用 node 環境（非 jsdom）
    environment: 'node',

    // 測試檔案範圍：只包含 server/__tests__ 下的測試
    include: ['server/__tests__/**/*.test.ts'],

    // 排除前端測試和 e2e 測試
    exclude: [
      ...configDefaults.exclude,
      'app/**',
      'e2e/**',
      'src/**',
    ],

    // 專案根目錄
    root: fileURLToPath(new URL('./', import.meta.url)),

    // 覆蓋率設定
    coverage: {
      provider: 'v8',
      // 只計算 Domain 和 Application 層的覆蓋率
      include: [
        'server/domain/**/*.ts',
        'server/application/**/*.ts',
      ],
      // 排除 Adapter 層和 API 層（由整合測試覆蓋）
      exclude: [
        'server/adapters/**',
        'server/api/**',
        'server/__tests__/**',
        'server/database/**',
        'server/utils/**',
        '**/*.d.ts',
        '**/index.ts', // barrel exports
      ],
      // 分層覆蓋率閾值
      thresholds: {
        // Domain Layer: 高覆蓋率要求
        'server/domain/services/**/*.ts': {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
        // Domain 其他模組: 漸進式改善
        'server/domain/**/*.ts': {
          lines: 40,
          functions: 30,
          branches: 30,
          statements: 40,
        },
        // Application Layer: 逐步提升
        'server/application/**/*.ts': {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0,
        },
      },
      // 報告格式
      reporter: ['text', 'html', 'json-summary'],
    },

    // 全域變數設定
    globals: true,
  },

  // 解析別名（與 Nuxt 4 一致）
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '~~': fileURLToPath(new URL('./', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
})
