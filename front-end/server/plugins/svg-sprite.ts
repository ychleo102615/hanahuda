import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineNitroPlugin(async (nitroApp) => {
  // 嘗試從 server assets 讀取（production bundle）
  let spriteHtml = await useStorage('assets:svg').getItem<string>('sprite.html')

  // Fallback：直接讀取 public/sprite.svg（dev 模式，已 commit 到 git）
  if (!spriteHtml) {
    try {
      spriteHtml = await readFile(resolve(process.cwd(), 'public/sprite.svg'), 'utf-8')
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
    html.bodyPrepend.push(sprite)
  })
})
