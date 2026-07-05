import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

export const LANGS = ['ru', 'en', 'it', 'de', 'fr', 'es']
export const CURRENCIES = ['usd', 'eur', 'rub']
export const REFRESH_OPTIONS = [30000, 60000, 0] // 0 = вручную
export const COIN_COUNTS = [50, 100, 250]

const DEFAULTS = {
  lang: detectLang(),
  theme: 'dark', // dark | light | auto
  currency: 'usd',
  refresh: 60000,
  coinCount: 100,
  sparklines: true,
}

const KEY = 'tidewatch:settings'

function detectLang() {
  if (typeof navigator === 'undefined') return 'en'
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return LANGS.includes(nav) ? nav : 'en'
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { ...DEFAULTS, ...saved }
  } catch {
    return { ...DEFAULTS }
  }
}

// Какая тема реально применяется (с учётом 'auto')
function resolveTheme(theme) {
  if (theme === 'auto') {
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    return dark ? 'dark' : 'light'
  }
  return theme
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  // Применяем тему к <html data-theme="...">.
  // На время переключения глушим все CSS-transition, иначе браузер пытается
  // анимировать цвета сотен элементов разом — отсюда лаг при смене темы.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('no-transitions')
    const applied = resolveTheme(settings.theme)
    root.dataset.theme = applied
    root.style.colorScheme = applied
    const id = window.setTimeout(() => root.classList.remove('no-transitions'), 80)
    return () => window.clearTimeout(id)
  }, [settings.theme])

  // Следим за системной темой, когда выбран режим auto
  useEffect(() => {
    if (settings.theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const applied = resolveTheme('auto')
      document.documentElement.dataset.theme = applied
      document.documentElement.style.colorScheme = applied
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings.theme])

  // Язык в <html lang="...">
  useEffect(() => {
    document.documentElement.lang = settings.lang
  }, [settings.lang])

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(KEY, JSON.stringify(next))
      window.dispatchEvent(new Event('tidewatch:state-changed'))
      return next
    })
  }, [])

  const value = useMemo(() => ({ ...settings, update }), [settings, update])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
