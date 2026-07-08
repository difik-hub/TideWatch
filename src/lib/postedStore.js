// Память бота: какие новости уже опубликованы в канал (Supabase, таблица posted_news).
// Ходим СЕРВЕРНЫМ ключом (SUPABASE_SERVICE_KEY) — он обходит RLS и никогда не
// попадает в браузер. anon-ключ для этого не годится: он публичен в бандле сайта.

const URL_BASE = process.env.SUPABASE_URL || 'https://kxebsydsyotfkwcfsxez.supabase.co'

function headers() {
  const key = process.env.SUPABASE_SERVICE_KEY
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

export function hasStore() {
  return !!process.env.SUPABASE_SERVICE_KEY
}

// Ссылки, опубликованные за последние N дней (для отсева уже вышедших)
export async function getPostedUrls(days = 4) {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const url = `${URL_BASE}/rest/v1/posted_news?select=url&posted_at=gte.${since}&limit=500`
  const r = await fetch(url, { headers: headers() })
  if (!r.ok) return null
  const rows = await r.json()
  return new Set(rows.map((x) => x.url))
}

// Когда постили в последний раз (для выдержки интервала между постами)
export async function lastPostedAt() {
  const url = `${URL_BASE}/rest/v1/posted_news?select=posted_at&order=posted_at.desc&limit=1`
  const r = await fetch(url, { headers: headers() })
  if (!r.ok) return null
  const rows = await r.json()
  return rows[0]?.posted_at ? new Date(rows[0].posted_at).getTime() : 0
}

// Отметить новость как опубликованную
export async function markPosted(articleUrl) {
  const r = await fetch(`${URL_BASE}/rest/v1/posted_news`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({ url: articleUrl }),
  })
  return r.ok
}
