import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getCookie } from 'h3'
import { SPRITE_FILENAME, SPRITE_CACHED_COOKIE, SPRITE_LS_KEY } from '#shared/constants/svgSprite'

// 後續訪問：同步讀取 localStorage 並注入到腳本位置之前（parse 階段，零空窗期）
// 若 localStorage 無資料（用戶清除儲存但保留 cookie），刪除 cookie，下次 server 重新 inline
const RESTORE_SCRIPT = `<script>(function(){var s;try{s=localStorage.getItem('${SPRITE_LS_KEY}')}catch(e){return}if(!s){document.cookie='${SPRITE_CACHED_COOKIE}=;max-age=0;path=/';return}var d=document.createElement('div');d.innerHTML=s;var svg=d.firstElementChild;if(svg)document.currentScript.before(svg)})()</script>`

export default defineNitroPlugin(async (nitroApp) => {
  const spritePath = resolve(process.cwd(), 'public', SPRITE_FILENAME)

  let spriteHtml: string | null = null
  try {
    spriteHtml = await readFile(spritePath, 'utf-8')
  }
  catch (err) {
    console.error('[svg-sprite] readFile failed:', err)
  }

  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const pathname = event.path.split('?')[0]
    if (pathname !== '/') return

    const hasCookie = process.env.NODE_ENV === 'production' && !!getCookie(event, SPRITE_CACHED_COOKIE)

    if (!hasCookie) {
      // 首次訪問（dev 永遠走這條）：inline sprite，存 localStorage + 設 cookie 由前端 onMounted 負責
      if (spriteHtml) {
        html.bodyPrepend.push(spriteHtml)
      }
    }
    else {
      // 後續訪問：從 localStorage 同步恢復 sprite
      html.bodyPrepend.push(RESTORE_SCRIPT)
    }
  })
})
