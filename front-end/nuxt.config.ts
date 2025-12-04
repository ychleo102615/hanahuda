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

  devtools: { enabled: true },

  typescript: {
    strict: true,
    typeCheck: true,
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

  devServer: {
    port: 5173, // 保持與原 Vite 一致
  },
})
