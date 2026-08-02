// Серверное хранилище алертов, которые уходят в Telegram (Supabase, таблицы
// tg_subs и tg_alerts). Ходим СЕРВЕРНЫМ ключом: он обходит RLS и не попадает
// в браузер. Схема — db/tg-alerts.sql.

const URL_BASE = process.env.SUPABASE_URL || 'https://kxebsydsyotfkwcfsxez.supabase.co'

function headers(extra) {
  const key = process.env.SUPABASE_SERVICE_KEY
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export function hasStore() {
  return !!process.env.SUPABASE_SERVICE_KEY
}

// Токен приходит из браузера, поэтому пускаем только безопасный алфавит:
// он попадает и в URL запроса к PostgREST, и в ссылку /start у Telegram.
export function validToken(token) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(token)
}

// Завести токен связки (chat_id появится, когда человек нажмёт Start у бота)
export async function createSub(token) {
  const r = await fetch(`${URL_BASE}/rest/v1/tg_subs`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=ignore-duplicates' }),
    body: JSON.stringify({ token }),
  })
  return r.ok
}

export async function getSub(token) {
  const url = `${URL_BASE}/rest/v1/tg_subs?token=eq.${encodeURIComponent(token)}&select=token,chat_id&limit=1`
  const r = await fetch(url, { headers: headers() })
  if (!r.ok) return null
  const rows = await r.json()
  return rows[0] ?? null
}

// Привязать чат к токену — вызывается ботом на /start <токен>.
// Условие `chat_id is null или тот же чат` в фильтре: иначе подсмотренным токеном
// можно было бы переписать чужую связку на свой чат и увести все алерты.
// Повторный /start из того же чата остаётся безобидным.
export async function linkChat(token, chatId) {
  const id = Number(chatId)
  if (!Number.isFinite(id)) return false
  const url = `${URL_BASE}/rest/v1/tg_subs?token=eq.${encodeURIComponent(token)}`
    + `&or=(chat_id.is.null,chat_id.eq.${id})`
  const r = await fetch(url, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify({ chat_id: id, linked_at: new Date().toISOString() }),
  })
  if (!r.ok) return false
  const rows = await r.json()
  return rows.length > 0
}

export async function listAlerts(token) {
  const url = `${URL_BASE}/rest/v1/tg_alerts?token=eq.${encodeURIComponent(token)}&fired_at=is.null&select=id,kind,asset_id,symbol,name,direction,target_usd&order=created_at.desc&limit=50`
  const r = await fetch(url, { headers: headers() })
  if (!r.ok) return null
  return r.json()
}

export async function addAlert(row) {
  const r = await fetch(`${URL_BASE}/rest/v1/tg_alerts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(row),
  })
  return r.ok
}

export async function deleteAlert(token, id) {
  const url = `${URL_BASE}/rest/v1/tg_alerts?token=eq.${encodeURIComponent(token)}&id=eq.${Number(id)}`
  const r = await fetch(url, { method: 'DELETE', headers: headers() })
  return r.ok
}

// Все ждущие алерты вместе с чатом получателя — для планировщика.
// Внутренний join PostgREST: без chat_id слать некуда, такие строки отсеиваем.
export async function pendingAlerts(limit = 200) {
  const url = `${URL_BASE}/rest/v1/tg_alerts?fired_at=is.null&select=id,kind,asset_id,symbol,name,direction,target_usd,tg_subs!inner(chat_id)&tg_subs.chat_id=not.is.null&limit=${limit}`
  const r = await fetch(url, { headers: headers() })
  if (!r.ok) return null
  const rows = await r.json()
  return rows.map((x) => ({ ...x, chat_id: x.tg_subs?.chat_id }))
}

export async function markFired(ids) {
  if (!ids.length) return true
  const url = `${URL_BASE}/rest/v1/tg_alerts?id=in.(${ids.map(Number).join(',')})`
  const r = await fetch(url, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ fired_at: new Date().toISOString() }),
  })
  return r.ok
}
