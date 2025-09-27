import { ref, computed } from 'vue'
import { LocalStorageLocaleService } from '@/infrastructure/services/LocaleService'

const localeService = LocalStorageLocaleService.getInstance()
const currentLocale = ref(localeService.getCurrentLocale())

export function useLocale() {
  const availableLocales = computed(() => localeService.getAvailableLocales())

  const setLocale = (locale: string) => {
    localeService.setLocale(locale)
    currentLocale.value = localeService.getCurrentLocale()
  }

  const t = (key: string, params?: Record<string, string | number>) => {
    // 通過依賴 currentLocale.value 確保響應式更新
    currentLocale.value // 觸發響應式依賴
    return localeService.translate(key, params)
  }

  const getLocaleName = (locale: string) => {
    const names: Record<string, string> = {
      'zh-TW': '繁體中文',
      'en': 'English'
    }
    return names[locale] || locale
  }

  return {
    currentLocale: computed(() => currentLocale.value),
    availableLocales,
    setLocale,
    t,
    getLocaleName
  }
}