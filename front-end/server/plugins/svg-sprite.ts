import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getCookie } from 'h3'
import { SPRITE_FILENAME, SPRITE_PATH, SPRITE_CACHED_COOKIE } from '#shared/constants/svgSprite'

export default defineNitroPlugin(async (nitroApp) => {
  // 嘗試從 server assets 讀取（production bundle）
  let spriteHtml = await useStorage('assets:svg').getItem<string>('sprite.html')

  // Fallback：直接讀取 public/sprite.svg（dev 模式，已 commit 到 git）
  if (!spriteHtml) {
    try {
      spriteHtml = await readFile(resolve(process.cwd(), 'public', SPRITE_FILENAME), 'utf-8')
    }
    catch {
      console.warn('[svg-sprite] Sprite not found — homepage will use external /sprite.svg')
      return
    }
  }

  const sprite = spriteHtml

  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const pathname = event.path.split('?')[0]
    if (pathname !== '/') return

    // Dev 模式或首次訪問（無 cookie）：注入 inline sprite，first paint 立即可見
    // Production 有 cookie 代表 sprite.svg 已快取：注入輕量 fetch script，
    // 在 HTML parse 階段就啟動載入，不依賴 Vue hydration
    if (process.env.NODE_ENV === 'production' && getCookie(event, SPRITE_CACHED_COOKIE)) {
      html.bodyPrepend.push(
        `<script>fetch('${SPRITE_PATH}').then(function(r){if(!r.ok)return;return r.text()}).then(function(s){if(s)document.body.insertAdjacentHTML('afterbegin',s)}).catch(function(){})</script>`,
      )
      return
    }

    html.bodyPrepend.push(sprite)
  })
})
