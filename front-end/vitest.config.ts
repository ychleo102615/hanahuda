/**
 * Vitest Unified Configuration
 *
 * @description
 * 統一的 Vitest 配置，使用 projects 功能支援前端和後端的不同別名設定。
 * - tests/client: jsdom 環境，~ 指向 ./app
 * - tests/server: node 環境，~ 指向 ./
 *
 * @module vitest.config
 */

import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  test: {
    // 專案根目錄
    root: fileURLToPath(new URL('./', import.meta.url)),

    // 排除項目
    exclude: [...configDefaults.exclude, 'e2e/**'],

    // 全域變數設定
    globals: true,

    // 使用 projects 處理不同環境
    projects: [
      // 前端測試配置
      {
        plugins: [vue()],
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./app', import.meta.url)),
            '~': fileURLToPath(new URL('./app', import.meta.url)),
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
          },
        },
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['tests/client/**/*.{test,spec}.ts'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      // 後端測試配置
      {
        resolve: {
          alias: {
            '~': fileURLToPath(new URL('./', import.meta.url)),
            '~~': fileURLToPath(new URL('./', import.meta.url)),
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
          },
        },
        test: {
          name: 'server',
          environment: 'node',
          include: ['tests/server/**/*.test.ts'],
        },
      },
    ],

    // 覆蓋率設定
    coverage: {
      provider: 'v8',
      include: [
        'server/domain/**/*.ts',
        'server/application/**/*.ts',
        'app/user-interface/domain/**/*.ts',
        'app/user-interface/application/**/*.ts',
      ],
      exclude: [
        'server/adapters/**',
        'server/api/**',
        'server/database/**',
        'server/utils/**',
        'tests/**',
        '**/*.d.ts',
        '**/index.ts',
      ],
      thresholds: {
        'server/domain/services/**/*.ts': {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
        'server/domain/**/*.ts': {
          lines: 40,
          functions: 30,
          branches: 30,
          statements: 40,
        },
        'server/application/**/*.ts': {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0,
        },
      },
      reporter: ['text', 'html', 'json-summary'],
    },
  },
})
