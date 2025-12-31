import { fileURLToPath, URL } from 'node:url'
import path from 'path'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  future: {
    compatibilityVersion: 4,
  },

  devtools: { enabled: false },

  app: {
    head: {
      meta: [
        // viewport-fit=cover: 讓內容延伸到 safe area
        // maximum-scale=1, user-scalable=no: 禁用雙擊放大和捏合縮放
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        // theme-color: Safari 頂部/底部 UI 顏色（配合 TopInfoBar 背景色）
        { name: 'theme-color', content: '#1f2937' }, // gray-800
        // iOS Safari 狀態列樣式
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: process.env.NODE_ENV === 'production', // dev 模式停用，避免 vite-plugin-checker race condition
  },

  alias: {
    '@': fileURLToPath(new URL('./app', import.meta.url)),
  },

  css: ['~/assets/styles/main.css'],

  vite: {
    plugins: [
      tailwindcss(),
      createSvgIconsPlugin({
        // 指定需要快取的圖示資料夾路徑
        iconDirs: [path.resolve(process.cwd(), 'app/assets/icons')],

        // 指定 symbolId 格式 - 直接使用檔名（所有 SVG 都在根目錄）
        symbolId: 'icon-[name]',

        // SVG 優化選項
        svgoOptions: {
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeViewBox: false, // 保留 viewBox 以確保縮放正確
                },
              },
            },
          ],
        },

        // DOM 插入位置
        inject: 'body-last',

        // 自定義容器 ID
        customDomId: '__playing_cards_svg_sprite__',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./app', import.meta.url)),
      },
    },
  },

  modules: ['@pinia/nuxt', '@vueuse/nuxt'],

  runtimeConfig: {
    // 公開變數（client 可用）
    public: {
      gameMode: 'backend', // 預設值，可被 NUXT_PUBLIC_GAME_MODE 覆蓋
    },
  },

  devServer: {
    host: '0.0.0.0',
    port: 5173, // 保持與原 Vite 一致
  },

  // Route Rules: 禁用特定頁面的 SSR
  routeRules: {
    '/': { ssr: false },  // 測試：首頁禁用 SSR
    '/lobby': { ssr: false },
    '/game': { ssr: false },
    '/game/**': { ssr: false },
  },
})
