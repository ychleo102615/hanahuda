import { SPRITE_LS_KEY, SPRITE_CACHED_COOKIE, SPRITE_CACHE_MAX_AGE_SECONDS } from '#shared/constants/svgSprite'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    const svg = document.body.querySelector<SVGElement>('svg[style*="display:none"]')
    if (!svg) return
    try {
      localStorage.setItem(SPRITE_LS_KEY, svg.outerHTML)
    }
    catch {
      return
    }
    document.cookie = `${SPRITE_CACHED_COOKIE}=1; max-age=${SPRITE_CACHE_MAX_AGE_SECONDS}; path=/`
  })
})
