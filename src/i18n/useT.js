import { useCallback } from 'react'
import { useSettings } from '../store/settings'
import { translations } from './translations'

// Возвращает t(key, params) — перевод по текущему языку с подстановкой {param}
export function useT() {
  const { lang } = useSettings()
  const dict = translations[lang] || translations.en

  return useCallback(
    (key, params) => {
      let str = dict[key] ?? translations.en[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(`{${k}}`, v)
        }
      }
      return str
    },
    [dict],
  )
}
