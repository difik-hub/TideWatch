// Локальные алерты на цену (без сервера). Хранятся в localStorage,
// проверяются при каждом обновлении данных.

const KEY = 'tidewatch:alerts'

export function getAlerts() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
  window.dispatchEvent(new Event('tidewatch:state-changed'))
}

export function addAlert(alert) {
  const list = getAlerts()
  const item = {
    id: `${alert.coinId}-${Date.now()}`,
    triggered: false,
    createdAt: Date.now(),
    ...alert,
  }
  list.push(item)
  save(list)
  return list
}

export function removeAlert(id) {
  const list = getAlerts().filter((a) => a.id !== id)
  save(list)
  return list
}

// Проверяет алерты против карты цен { coinId: priceInUsd }.
// Возвращает список сработавших (и помечает их triggered).
export function checkAlerts(priceByIdUsd) {
  const list = getAlerts()
  const fired = []
  let changed = false
  for (const a of list) {
    if (a.triggered) continue
    const price = priceByIdUsd[a.coinId]
    if (price == null) continue
    const hit = a.direction === 'above' ? price >= a.targetUsd : price <= a.targetUsd
    if (hit) {
      a.triggered = true
      changed = true
      fired.push(a)
    }
  }
  if (changed) save(list)
  return fired
}

// Запрос разрешения и показ браузерного уведомления
export function notify(title, body) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((p) => {
      if (p === 'granted') new Notification(title, { body })
    })
  }
}

export function requestNotifyPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Короткий двухтоновый сигнал через WebAudio (без файлов)
export function playAlertSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.16
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.16)
    })
    setTimeout(() => ctx.close(), 600)
  } catch {
    /* звук не критичен */
  }
}

export function countActiveAlerts() {
  return getAlerts().filter((a) => !a.triggered).length
}
