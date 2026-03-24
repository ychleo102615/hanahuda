import { fileURLToPath, URL } from 'node:url'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { svgSpriteSSRPlugin } from './vite-plugin-svg-sprite-ssr'
import { SPRITE_PATH, SPRITE_CACHE_MAX_AGE_SECONDS } from './shared/constants/svgSprite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  future: {
    compatibilityVersion: 4,
  },

  devtools: { enabled: false },

  app: {
    head: {
      link: [
        // Emoji favicon（花牌 🎴）
        { rel: 'icon', href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎴</text></svg>' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;800&family=Noto+Sans+JP:wght@300;400;500;700&display=swap',
        },
      ],
      meta: [
        // viewport-fit=cover: 讓內容延伸到 safe area
        // maximum-scale=1, user-scalable=no: 禁用雙擊放大和捏合縮放
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        // theme-color: Safari 頂部/底部 UI 顏色（配合 TopInfoBar 背景色）
        { name: 'theme-color', content: '#1f2937' }, // gray-800
        // iOS Safari 狀態列樣式
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        // PWA capable（新版標準）
        { name: 'mobile-web-app-capable', content: 'yes' },
      ],
      // Telegram WebApp SDK 改為動態載入（見 TelegramSdkClient.ts）
      // 避免在非 Telegram 環境產生 console 輸出
    },
  },

  typescript: {
    strict: true,
    typeCheck: process.env.NODE_ENV === 'production', // dev 模式停用，避免 vite-plugin-checker race condition
  },

  alias: {
    '@': fileURLToPath(new URL('./app', import.meta.url)),
    '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
  },

  css: ['~/assets/styles/main.css'],

  vite: {
    plugins: [
      svgSpriteSSRPlugin({
        iconDirs: [path.resolve(process.cwd(), 'app/assets/icons')],
        symbolId: 'icon-[name]',
        customDomId: '__playing_cards_svg_sprite__',
        svgoOptions: {
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeViewBox: false,
                },
              },
            },
          ],
        },
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./app', import.meta.url)),
      },
    },
  },

  modules: ['@pinia/nuxt', '@vueuse/nuxt', 'nuxt-delay-hydration'],

  delayHydration: {
    // 等待瀏覽器閒置後才開始 hydration（不阻塞 CSS animation）
    mode: 'init',
    debug: process.env.NODE_ENV === 'development',
  },

  runtimeConfig: {
    // 私有變數（僅 server 可用）
    // 允許的 CORS origin，可被 NUXT_ALLOWED_ORIGINS 覆蓋
    // 多個 origin 以逗號分隔，例: "https://example.com,https://staging.example.com"
    allowedOrigins: '',

    // 公開變數（client 可用）
    public: {
      gameMode: 'backend', // 預設值，可被 NUXT_PUBLIC_GAME_MODE 覆蓋
    },
  },


  devServer: {
    host: '0.0.0.0',
    port: 5173, // 保持與原 Vite 一致
  },

  nitro: {
    serverAssets: [{ baseName: 'svg', dir: '.nuxt/svg' }],
  },

  // Route Rules: 禁用特定頁面的 SSR + sprite.svg 快取
  routeRules: {
    [SPRITE_PATH]: { headers: { 'cache-control': `public, max-age=${SPRITE_CACHE_MAX_AGE_SECONDS}` } },
    '/lobby': { ssr: false },
    '/game': { ssr: false },
    '/game/**': { ssr: false },
  },

})
