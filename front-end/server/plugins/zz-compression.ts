/**
 * SSR Response Compression Plugin
 *
 * @description
 * 為 SSR 渲染的 HTML response 啟用 gzip 壓縮。
 * 主要目的：首次訪問時 inline SVG sprite 使 HTML ~1.88 MB，
 * gzip 壓縮後降至 ~755 KB，大幅改善 FCP。
 *
 * 靜態資源由 Nitro compressPublicAssets 在 build 時預壓縮，
 * 此 plugin 僅處理動態 SSR response。
 */

import { gzipSync } from 'node:zlib'

const MIN_SIZE = 1024

export default defineNitroPlugin((nitroApp) => {
  // Dev 環境不壓縮，避免干擾 Vite HMR 和 CSP nonce 注入
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const acceptEncoding = getRequestHeader(event, 'accept-encoding') ?? ''
    if (!acceptEncoding.includes('gzip')) {
      return
    }

    if (!response.body || typeof response.body !== 'string') {
      return
    }

    if (response.body.length < MIN_SIZE) {
      return
    }

    const compressed = gzipSync(response.body)
    response.body = compressed
    response.headers['content-encoding'] = 'gzip'
    response.headers['content-length'] = String(compressed.length)
  })
})
