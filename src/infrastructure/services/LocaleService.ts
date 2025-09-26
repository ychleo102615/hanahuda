export interface LocaleService {
  getCurrentLocale(): string
  setLocale(locale: string): void
  getAvailableLocales(): string[]
  translate(key: string, params?: Record<string, string | number>): string
}

// 直接 import 翻譯檔案
import zhTW from '../../locales/zh-TW.json'
import en from '../../locales/en.json'

export class LocalStorageLocaleService implements LocaleService {
  private currentLocale: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private translations: Record<string, any> = {
    'zh-TW': zhTW,
    'en': en
  }
  private readonly defaultLocale = 'zh-TW'
  private readonly availableLocales = ['zh-TW', 'en']
  private readonly storageKey = 'hanafuda-locale'

  constructor() {
    // 從 localStorage 讀取語言設定，若無則使用瀏覽器語言或預設語言
    const saved = localStorage.getItem(this.storageKey)
    const browserLang = navigator.language

    let initialLocale = this.defaultLocale
    if (saved && this.availableLocales.includes(saved)) {
      initialLocale = saved
    } else if (browserLang.startsWith('en')) {
      initialLocale = 'en'
    }

    this.currentLocale = initialLocale
  }

  getCurrentLocale(): string {
    return this.currentLocale
  }

  setLocale(locale: string): void {
    if (this.availableLocales.includes(locale)) {
      this.currentLocale = locale
      localStorage.setItem(this.storageKey, locale)
    }
  }

  getAvailableLocales(): string[] {
    return [...this.availableLocales]
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = this.translations[this.currentLocale]

    for (const k of keys) {
      if (value && typeof value === 'object') {
        // 支援陣列索引或物件屬性
        value = Array.isArray(value) ? value[parseInt(k)] : value[k]
      } else {
        // 如果找不到翻譯，嘗試使用預設語言
        value = this.translations[this.defaultLocale]
        for (const k2 of keys) {
          if (value && typeof value === 'object') {
            value = Array.isArray(value) ? value[parseInt(k2)] : value[k2]
          } else {
            break
          }
        }
        break
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation not found for key: ${key}`)
      return key
    }

    // 處理參數替換
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
        return params[paramKey]?.toString() || match
      })
    }

    return value
  }
}