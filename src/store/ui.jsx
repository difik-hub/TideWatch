import { createContext, useContext, useState, useMemo, useCallback } from 'react'

// Глобальные оверлеи (настройки, конвертер, алерты), которые открываются
// из навбара на любой странице. Сами окна рендерятся один раз в App.
const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [overlay, setOverlay] = useState(null) // 'settings' | 'converter' | 'alerts' | null
  const [payload, setPayload] = useState(null)

  const open = useCallback((name, p = null) => { setPayload(p); setOverlay(name) }, [])
  const close = useCallback(() => setOverlay(null), [])

  // Стабильные открыватели — чтобы не пересобирать items/таймлайн навбара
  const openSettings = useCallback(() => open('settings'), [open])
  const openConverter = useCallback(() => open('converter'), [open])
  const openAlerts = useCallback((coinId) => open('alerts', coinId ? { coinId } : null), [open])
  const openPortfolio = useCallback(() => open('portfolio'), [open])
  const openFeedback = useCallback(() => open('feedback'), [open])

  const value = useMemo(
    () => ({
      overlay,
      payload,
      isOpen: (n) => overlay === n,
      openSettings,
      openConverter,
      openAlerts,
      openPortfolio,
      openFeedback,
      close,
    }),
    [overlay, payload, openSettings, openConverter, openAlerts, openPortfolio, openFeedback, close],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
