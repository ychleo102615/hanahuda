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

      const spriteHtml = `<svg id="${options.customDomId}" xmlns="${XMLNS}" xmlns:xlink="${XMLNS_LINK}" style="position:absolute;width:0;height:0">${innerHtml}</svg>`

      const outputDir = path.resolve(process.cwd(), '.nuxt/svg')
      await mkdir(outputDir, { recursive: true })
      await writeFile(path.join(outputDir, 'sprite.html'), spriteHtml, 'utf-8')
    },
  }
}
