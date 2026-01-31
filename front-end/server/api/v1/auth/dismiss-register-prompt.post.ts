/**
 * POST /api/v1/auth/dismiss-register-prompt
 *
 * @description
 * 設定 skip_register_prompt cookie（由 server-side 設定以確保安全旗標）。
 * 用於訪客玩家選擇暫時不顯示註冊提示。
 */

const DISMISS_COOKIE_MAX_AGE = 86400 // 24 小時

export default defineEventHandler((event) => {
  setCookie(event, 'skip_register_prompt', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: DISMISS_COOKIE_MAX_AGE,
    path: '/',
  })

  return { success: true }
})
