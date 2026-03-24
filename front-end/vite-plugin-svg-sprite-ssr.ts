import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { compilerIcons } from 'vite-plugin-svg-icons'
import type { ViteSvgIconsPlugin } from 'vite-plugin-svg-icons'

const XMLNS = 'http://www.w3.org/2000/svg'
const XMLNS_LINK = 'http://www.w3.org/1999/xlink'

type SvgSpriteSSROptions = Required<Pick<ViteSvgIconsPlugin, 'iconDirs' | 'symbolId' | 'customDomId'>> &
  Pick<ViteSvgIconsPlugin, 'svgoOptions'>

export function svgSpriteSSRPlugin(options: SvgSpriteSSROptions) {
  let written = false
  return {
    name: 'svg-sprite-ssr',
    async buildStart() {
      if (written) return
      written = true

      const cache = new Map()
      // compilerIcons JS implementation accepts boolean/object/undefined;
      // type declaration requires OptimizeOptions, so we cast through unknown
      const { insertHtml } = await (compilerIcons as unknown as (
        cache: Map<string, unknown>,
        svgOptions: unknown,
        options: unknown,
      ) => Promise<{ insertHtml: string }>)(cache, options.svgoOptions ?? {}, options)

      const innerHtml = insertHtml
        .replace(new RegExp(`xmlns="${XMLNS}"`, 'g'), '')
        .replace(new RegExp(`xmlns:xlink="${XMLNS_LINK}"`, 'g'), '')

      // 輸出為外部靜態 SVG 檔（display:none 隱藏，供 <use href="/sprite.svg#..."> 引用）
      const spriteSvg = `<svg xmlns="${XMLNS}" xmlns:xlink="${XMLNS_LINK}" style="display:none">${innerHtml}</svg>`

      const outputDir = path.resolve(process.cwd(), 'public')
      await mkdir(outputDir, { recursive: true })
      await writeFile(path.join(outputDir, 'sprite.svg'), spriteSvg, 'utf-8')

      // 同步寫入 .nuxt/svg/sprite.html 供 Nitro server asset 讀取（首頁 inline 注入用）
      const nuxtSvgDir = path.resolve(process.cwd(), '.nuxt/svg')
      await mkdir(nuxtSvgDir, { recursive: true })
      await writeFile(path.join(nuxtSvgDir, 'sprite.html'), spriteSvg, 'utf-8')
    },
  }
}
