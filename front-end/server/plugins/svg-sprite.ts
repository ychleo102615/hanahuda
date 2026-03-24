import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getCookie } from 'h3'
import { SPRITE_FILENAME, SPRITE_PATH, SPRITE_CACHED_COOKIE } from '#shared/constants/svgSprite'

// Fetch script：注入到 <body> 開頭，在 HTML parse 階段執行
// 若 inline sprite 已在 DOM → querySelector 命中 → no-op
// 若 inline sprite 未注入（sprite 載入失敗 or cookie 路徑）→ fetch 補注入
const FETCH_SCRIPT = `<script>if(!document.querySelector('body>svg[style*="display:none"]'))fetch('${SPRITE_PATH}').then(function(r){if(!r.ok)return;return r.text()}).then(function(s){if(s)document.body.insertAdjacentHTML('afterbegin',s)}).catch(function(){})</script>`

export default defineNitroPlugin(async (nitroApp) => {
  // Production（fly.io）：Nuxt build 把 public/ 複製到 .output/public/，
  // runner stage 只複製 .output/，所以直接讀 .output/public/
  const spritePath = process.env.NODE_ENV === 'production'
    ? resolve(process.cwd(), '.output', 'public', SPRITE_FILENAME)
    : resolve(process.cwd(), 'public', SPRITE_FILENAME)

  let spriteHtml: string | null = null
  try {
    spriteHtml = await readFile(spritePath, 'utf-8')
  }
  catch (err) {
    console.error('[svg-sprite] readFile failed:', err)
    // sprite 載入失敗時不 return——仍注入 FETCH_SCRIPT 作為保底
    // 若直接 return，hook 不會被註冊，fetch script 也不會被注入，卡牌完全空白
  }

  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const pathname = event.path.split('?')[0]
    if (pathname !== '/') return

    // 首次訪問（無 cookie）或 dev 模式：inline sprite 在 HTML 即可見，不依賴任何 fetch
    // 若 spriteHtml 為 null（readFile 失敗），跳過 inline，由 FETCH_SCRIPT 補救
    const isFirstVisit = process.env.NODE_ENV !== 'production' || !getCookie(event, SPRITE_CACHED_COOKIE)
    if (isFirstVisit && spriteHtml) {
      html.bodyPrepend.push(spriteHtml)
    }

    // 始終注入 FETCH_SCRIPT：
    // - inline sprite 已注入 → querySelector 命中 → no-op（零額外成本）
    // - inline sprite 未注入（cookie 路徑 or 載入失敗）→ fetch 補注入
    html.bodyPrepend.push(FETCH_SCRIPT)
  })
})
