// Fixed-window rate-limit по IP через Upstash Redis REST (без SDK — только fetch).
// Файл с префиксом _ Vercel НЕ превращает в эндпоинт: это общий хелпер для прокси.
//
// Fail-open по двум причинам:
//  1) UPSTASH_* не заданы → прокси работают и без Redis; лимит включается, как
//     только зададишь env (не ломаем прод до настройки).
//  2) Redis недоступен → пропускаем, чтобы сбой стораджа не отрубил живых юзеров.
//
// ponytail: fixed window (INCR+EXPIRE), не sliding — на границе окна возможен
// всплеск до 2×limit. Для защиты бесплатной квоты этого хватает; если понадобится
// строгость — @upstash/ratelimit со sliding-window.

const RURL = process.env.UPSTASH_REDIS_REST_URL
const RTOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function redis(cmd) {
  const r = await fetch(RURL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${RTOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  })
  if (!r.ok) throw new Error(`redis ${r.status}`)
  return (await r.json()).result
}

// true = пропустить, false = лимит превышен. limit запросов за windowSec секунд с IP.
export async function allow(req, tag, limit = 30, windowSec = 60) {
  if (!RURL || !RTOKEN) return true
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const key = `rl:${tag}:${ip}`
  try {
    const n = await redis(['INCR', key])
    if (n === 1) await redis(['EXPIRE', key, windowSec]) // TTL ставим только на первом хите окна
    return n <= limit
  } catch {
    return true
  }
}
