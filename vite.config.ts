import { fileURLToPath, URL } from 'node:url'

import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/hanahuda/',
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    createSvgIconsPlugin({
      // 指定需要快取的圖示資料夾路徑
      iconDirs: [path.resolve(process.cwd(), 'src/assets/icon')],

      // 指定 symbolId 格式 - 用於花牌專案的結構化命名
      symbolId: 'icon-[dir]-[name]',

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
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
