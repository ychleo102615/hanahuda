import { SPRITE_PATH, SPRITE_LS_KEY, SPRITE_CACHED_COOKIE, SPRITE_CACHE_MAX_AGE_SECONDS } from '#shared/constants/svgSprite'

const SPRITE_SELECTOR = 'svg[style*="display:none"]'

/**
 * 將 sprite HTML 注入 DOM（body 開頭）
 */
function injectSpriteToDOM(spriteHtml: string): void {
  const container = document.createElement('div')
  container.innerHTML = spriteHtml
  const svg = container.firstElementChild
  if (svg) {
    document.body.prepend(svg)
  }
}

/**
 * 將 sprite 存入 localStorage 並設定 cookie
 */
function cacheSpriteToStorage(spriteHtml: string): void {
  try {
    localStorage.setItem(SPRITE_LS_KEY, spriteHtml)
  }
  catch {
    return
  }
  document.cookie = `${SPRITE_CACHED_COOKIE}=1; max-age=${SPRITE_CACHE_MAX_AGE_SECONDS}; path=/`
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', async () => {
    const spriteInDOM = document.body.querySelector<SVGElement>(SPRITE_SELECTOR)

    let spriteInLS: string | null = null
    try {
      spriteInLS = localStorage.getItem(SPRITE_LS_KEY)
    }
    catch {
      // localStorage 不可用（private browsing 等）
    }

    if (spriteInDOM && spriteInLS) {
      // 情境 A：都有，不做任何事
      return
    }

    if (spriteInDOM && !spriteInLS) {
      // 情境 B：DOM 有但 localStorage 沒有（首次訪問首頁）
      cacheSpriteToStorage(spriteInDOM.outerHTML)
      return
    }

    if (!spriteInDOM && spriteInLS) {
      // 情境 C：DOM 沒有但 localStorage 有（SPA 頁面正常流程）
      injectSpriteToDOM(spriteInLS)
      return
    }

    // 情境 D：都沒有（直接訪問 /game 且無快取）
    try {
      const response = await fetch(SPRITE_PATH)
      if (!response.ok) return
      const spriteHtml = await response.text()
      injectSpriteToDOM(spriteHtml)
      cacheSpriteToStorage(spriteHtml)
    }
    catch {
      // fetch 失敗，靜默降級
    }
  })
})
