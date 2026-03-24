import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { compilerIcons } from 'vite-plugin-svg-icons'
import type { ViteSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { SPRITE_FILENAME } from './shared/constants/svgSprite'

const XMLNS = 'http://www.w3.org/2000/svg'
const XMLNS_LINK = 'http://www.w3.org/1999/xlink'

type SvgSpriteSSROptions = Required<Pick<ViteSvgIconsPlugin, 'iconDirs' | 'symbolId' | 'customDomId'>> &
  Pick<ViteSvgIconsPlugin, 'svgoOptions'>

export function svgSpriteSSRPlugin(options: SvgSpriteSSROptions) {
  let written = false
  // Nuxt rootDir（nuxt.config.ts 所在位置）= process.cwd() at plugin creation time
  // Nuxt 4 中 config.root（Vite root）= srcDir（app/），不能用來定位 public/
  const nuxtRoot = process.cwd()

  return {
    name: 'svg-sprite-ssr',
    // icon 檔案變更時重置 written flag，確保 HMR 能重新生成 sprite
    watchChange(id: string) {
      if (options.iconDirs.some(dir => id.startsWith(dir))) {
        written = false
      }
    },
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
      // Server plugin（svg-sprite.ts）在 render:html 時直接從 .output/public/ 讀取此檔注入首頁
      const spriteSvg = `<svg xmlns="${XMLNS}" xmlns:xlink="${XMLNS_LINK}" style="display:none">${innerHtml}</svg>`

      const outputDir = path.resolve(nuxtRoot, 'public')
      await mkdir(outputDir, { recursive: true })
      await writeFile(path.join(outputDir, SPRITE_FILENAME), spriteSvg, 'utf-8')
    },
  }
}
