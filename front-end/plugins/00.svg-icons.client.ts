/**
 * SVG Icons Plugin
 *
 * @description
 * 註冊 vite-plugin-svg-icons 生成的 SVG sprite
 * 必須在 client-side 執行以確保 DOM 操作正常
 */

// 註冊 SVG Icons sprite
import 'virtual:svg-icons-register'

export default defineNuxtPlugin(() => {
  // Plugin 不需要返回任何內容
  // 單純執行 import 即可完成 SVG sprite 註冊
})
