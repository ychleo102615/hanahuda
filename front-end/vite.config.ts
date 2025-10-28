import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import path from 'path'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    createSvgIconsPlugin({
      // 指定需要快取的圖示資料夾路徑
      iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],

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
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
