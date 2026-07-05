// Лента последней активности пользователя (просмотры, портфель, алерты).
// Хранится локально, максимум 25 последних записей.

const KEY = 'tidewatch:activity'

export function getActivity() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function logActivity(type, label, ref = null) {
  try {
    const list = getActivity()
    // Не дублируем подряд одинаковые просмотры
    if (list[0] && list[0].type === type && list[0].label === label) return
    list.unshift({ type, label, ref, ts: Date.now() })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 25)))
    window.dispatchEvent(new Event('tidewatch:activity'))
  } catch {
    /* не критично */
  }
}

// Список id недавно просмотренных монет (без повторов, новые первыми)
export function getRecentlyViewed(limit = 10) {
  const ids = []
  for (const a of getActivity()) {
    if (a.type === 'view' && a.ref && !ids.includes(a.ref)) ids.push(a.ref)
    if (ids.length >= limit) break
  }
  return ids
}

// Относительное время «5 мин назад» по локали
export function relativeTime(ts, lang = 'en') {
  const diff = Date.now() - ts
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const min = Math.round(diff / 60000)
  if (Math.abs(min) < 60) return rtf.format(-min, 'minute')
  const hr = Math.round(min / 60)
  if (Math.abs(hr) < 24) return rtf.format(-hr, 'hour')
  return rtf.format(-Math.round(hr / 24), 'day')
}
