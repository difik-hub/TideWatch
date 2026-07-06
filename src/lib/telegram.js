// Интеграция с Telegram Mini App (когда сайт открыт внутри Telegram).
// Скрипт telegram-web-app.js подключён в index.html и создаёт window.Telegram.WebApp.

export function tma() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
}

// Запущены ли мы внутри Telegram
export function isTMA() {
  const wa = tma()
  return !!(wa && wa.initData && wa.initData.length > 0)
}

// Инициализация Mini App: раскрыть на весь экран, применить тему Telegram
// (если юзер не выбирал тему вручную), сообщить готовность.
export function initTMA() {
  const wa = tma()
  if (!wa || !isTMA()) return
  try {
    wa.ready()
    wa.expand()
    // Синхронизация темы: только если юзер не задал свою (theme=auto)
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem('tidewatch:settings') || '{}') } catch { /* пусто */ }
    if (!saved.theme || saved.theme === 'auto') {
      const scheme = wa.colorScheme === 'light' ? 'light' : 'dark'
      document.documentElement.dataset.theme = scheme
      document.documentElement.style.colorScheme = scheme
    }
    // Цвет шапки Telegram под наш фон
    if (wa.setHeaderColor) wa.setHeaderColor(wa.colorScheme === 'light' ? '#f5f7fa' : '#0b0e14')
  } catch {
    /* не критично */
  }
}
