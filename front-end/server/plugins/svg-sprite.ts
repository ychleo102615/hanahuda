import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineNitroPlugin((nitroApp) => {
  let cachedSprite: string | null = null

  nitroApp.hooks.hook('render:html', async (html) => {
    if (cachedSprite === null) {
      try {
        // Try server assets storage first (production)
        const fromStorage = await useStorage('assets:svg').getItem<string>('sprite.html')
        if (fromStorage) {
          cachedSprite = fromStorage
        } else {
          // Fallback: read directly from filesystem (dev mode)
          const filePath = resolve(process.cwd(), '.nuxt/svg/sprite.html')
          cachedSprite = await readFile(filePath, 'utf-8')
        }
      } catch {
        cachedSprite = ''
      }
    }

    if (cachedSprite) {
      html.bodyPrepend.push(cachedSprite)
    }
  })
})
