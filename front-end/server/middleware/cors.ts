/**
 * CORS Middleware
 *
 * @description
 * 處理跨來源資源共享 (Cross-Origin Resource Sharing)。
 * 僅允許明確設定的 origin 存取 API。
 *
 * 設定方式：透過環境變數 NUXT_ALLOWED_ORIGINS（逗號分隔）
 * 例: NUXT_ALLOWED_ORIGINS="https://example.com,https://staging.example.com"
 */

export default defineEventHandler((event) => {
  const path = event.path

  // 僅處理 API 路徑
  if (!path.startsWith('/api/')) {
    return
  }

  const config = useRuntimeConfig()
  const allowedOriginsRaw = config.allowedOrigins as string
  const origin = getHeader(event, 'origin')

  // 解析允許的 origins
  const allowedOrigins = allowedOriginsRaw
    ? allowedOriginsRaw.split(',').map(o => o.trim()).filter(Boolean)
    : []

  // 開發環境自動允許 localhost
  if (process.env.NODE_ENV !== 'production') {
    if (!allowedOrigins.some(o => o.includes('localhost'))) {
      allowedOrigins.push('http://localhost:5173')
    }
  }

  // 驗證 origin
  if (origin && allowedOrigins.includes(origin)) {
    setHeader(event, 'Access-Control-Allow-Origin', origin)
    setHeader(event, 'Vary', 'Origin')
  }

  // 共用 CORS headers
  setHeader(event, 'Access-Control-Allow-Credentials', 'true')
  setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization')
  setHeader(event, 'Access-Control-Max-Age', '86400')

  // 處理 preflight 請求
  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
