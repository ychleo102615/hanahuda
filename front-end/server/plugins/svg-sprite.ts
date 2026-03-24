export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (html, { event }) => {
    const pathname = event.path.split('?')[0]
    if (pathname !== '/') return

    const spriteHtml = await useStorage('assets/svg').getItem<string>('sprite.html')
    if (!spriteHtml) return

    html.bodyPrepend.push(spriteHtml)
  })
})
