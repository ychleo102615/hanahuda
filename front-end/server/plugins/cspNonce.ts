/**
 * CSP Nonce Injection Plugin
 *
 * @description
 * Nitro plugin，使用 render:response hook 將 nonce 注入 HTML 回應中的所有 <script> 標籤。
 * 搭配 securityHeaders middleware 產生的 per-request nonce，
 * 確保只有帶正確 nonce 的 script 能被瀏覽器執行。
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const nonce = event.context.security?.nonce as string | undefined
    if (!nonce || typeof response.body !== 'string') return

    response.body = response.body.replace(
      /<script(?![^>]*\bnonce=)/g,
      `<script nonce="${nonce}"`,
    )
  })
})
