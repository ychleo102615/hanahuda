/**
 * Security Headers Middleware
 *
 * @description
 * 為所有回應添加安全相關的 HTTP Headers。
 * 防禦 XSS、Clickjacking、MIME Sniffing、資訊洩漏等攻擊。
 *
 * @see https://owasp.org/www-project-secure-headers/
 */

export default defineEventHandler((event) => {
  // Content-Security-Policy: 限制資源載入來源，防止 XSS
  setHeader(event, 'Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://telegram.org",  // Telegram SDK
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",  // Tailwind + Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",              // SVG sprites 使用 data URI
    "connect-src 'self' wss: ws:",             // WebSocket 連線
    "frame-ancestors 'none'",                  // 禁止被 iframe 嵌入
    "base-uri 'self'",                         // 限制 <base> 標籤
    "form-action 'self'",                      // 限制表單提交目標
  ].join('; '))

  // X-Content-Type-Options: 防止 MIME Sniffing
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  // X-Frame-Options: 防止 Clickjacking（CSP frame-ancestors 的備援）
  setHeader(event, 'X-Frame-Options', 'DENY')

  // Referrer-Policy: 控制 Referer header 洩漏
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy: 限制瀏覽器 API 權限
  setHeader(event, 'Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
  ].join(', '))

  // Strict-Transport-Security: 強制 HTTPS（僅生產環境）
  if (process.env.NODE_ENV === 'production') {
    setHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // X-DNS-Prefetch-Control: 控制 DNS 預取
  setHeader(event, 'X-DNS-Prefetch-Control', 'off')
})
