// Клиентская часть алертов в Telegram. Регистрации нет: у браузера есть токен,
// он же удостоверение владельца. Токен уходит боту в ссылке /start и связывается
// с чатом — после этого алерты живут на сервере и приходят с закрытой вкладкой.

const KEY = 'tidewatch:tgtoken'
const BOT = 'tiddewatchbot'

// 32 символа из безопасного алфавита — тот же, что проверяет сервер
export function getToken() {
  let t = localStorage.getItem(KEY)
  if (!t) {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    t = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    localStorage.setItem(KEY, t)
  }
  return t
}

async function call(action, payload) {
  const r = await fetch(`/api/alerts?a=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: getToken(), ...payload }),
  })
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }
}

// Состояние связки и список серверных алертов
export async function fetchStatus() {
  try {
    const r = await fetch(`/api/alerts?a=status&token=${encodeURIComponent(getToken())}`)
    if (!r.ok) return { chatLinked: false, alerts: [], available: r.status !== 503 }
    const d = await r.json()
    return { chatLinked: !!d.chatLinked, alerts: d.alerts || [], available: true }
  } catch {
    return { chatLinked: false, alerts: [], available: false }
  }
}

// Завести токен на сервере и открыть бота: он поймает /start <токен> и свяжет чат
export async function connectTelegram() {
  const token = getToken()
  await call('init', {})
  window.open(`https://t.me/${BOT}?start=${token}`, '_blank', 'noopener')
}

export async function pushAlert({ kind, assetId, symbol, name, direction, targetUsd }) {
  const r = await call('add', { kind, assetId, symbol, name, direction, targetUsd })
  return r
}

export async function dropAlert(id) {
  const r = await call('del', { id })
  return r.ok
}
