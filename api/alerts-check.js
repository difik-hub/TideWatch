// Сверка алертов с ценами и отправка в Telegram. Дёргается внешним планировщиком
// (cron-job.org) каждые ~5 минут: на бесплатном тарифе Vercel собственные кроны
// запускаются раз в сутки, для алертов это бесполезно.
//
// env: TG_BOT_TOKEN, SUPABASE_SERVICE_KEY, опц. CRON_SECRET, FMP_API_KEY (акции).

import { hasStore, pendingAlerts, markFired } from '../src/lib/alertStore.js'
import { allow } from './_ratelimit.js'

const CG = 'https://api.coingecko.com/api/v3'
const FMP = 'https://financialmodelingprep.com/stable'
const SITE = 'https://tidewatchi.vercel.app'

const fmt = (n) =>
  n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  : n >= 1 ? n.toFixed(2)
  : n.toFixed(Math.min(8, Math.max(4, Math.ceil(-Math.log10(n)) + 3)))

async function tg(method, token, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  return r.json().catch(() => ({ ok: false }))
}

// Цены крипты одним запросом на все монеты сразу
async function cryptoPrices(ids) {
  if (!ids.length) return {}
  try {
    const url = `${CG}/simple/price?ids=${ids.map(encodeURIComponent).join(',')}&vs_currencies=usd`
    const r = await fetch(url, { headers: { accept: 'application/json' } })
    if (!r.ok) return {}
    const j = await r.json()
    const out = {}
    for (const [id, v] of Object.entries(j)) if (v?.usd != null) out[id] = v.usd
    return out
  } catch { return {} }
}

// Цены акций: у FMP на бесплатном тарифе батч платный, поэтому по одному тикеру
// и не больше десяти за прогон — иначе выжжем дневную квоту в 250 запросов.
async function stockPrices(symbols) {
  const key = process.env.FMP_API_KEY
  if (!key || !symbols.length) return {}
  const out = {}
  for (const s of symbols.slice(0, 10)) {
    try {
      const r = await fetch(`${FMP}/quote?symbol=${encodeURIComponent(s)}&apikey=${key}`)
      if (!r.ok) continue
      const j = await r.json()
      const p = Array.isArray(j) ? j[0]?.price : j?.price
      if (p != null) out[s] = Number(p)
    } catch { /* пропускаем тикер, остальные проверим */ }
  }
  return out
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  // Доступ: верный секрет пускает сразу, всё остальное — через рейт-лимит по IP.
  //
  // Раньше здесь стоял жёсткий 401, и планировщик неделю бился в стену: заголовок
  // у него по какой-то причине не долетал, а починить вслепую не выходило. Ценность
  // защиты тут невысокая — эндпоинт только сверяет цены и шлёт уже заведённые
  // пользователем алерты, каждый из которых срабатывает ровно один раз. Худшее, что
  // даёт лишний вызов, — пара запросов к CoinGecko. Лимит их и прикрывает.
  const own = process.env.ALERTS_CRON_SECRET
  const shared = process.env.CRON_SECRET
  const given = req.headers.authorization || ''
  const authed = (own && given === `Bearer ${own}`) || (shared && given === `Bearer ${shared}`)

  // Без ключа — жёсткий лимит: два вызова за пять минут с адреса. Планировщику
  // этого хватает (он ходит раз в пять минут), а частым вызовам взяться неоткуда.
  // Дороже всего именно частота: каждый прогон с непустой очередью тратит квоты
  // CoinGecko и FMP, и без потолка ими можно выжечь дневной лимит.
  if (!authed && !(await allow(req, 'alerts-check', 2, 300))) {
    res.status(429).json({ error: 'rate limited' }); return
  }

  const botToken = process.env.TG_BOT_TOKEN
  if (!botToken) { res.status(200).json({ skipped: 'TG not configured' }); return }
  if (!hasStore()) { res.status(200).json({ skipped: 'SUPABASE_SERVICE_KEY not set' }); return }

  try {
    const rows = await pendingAlerts()
    if (rows === null) { res.status(500).json({ error: 'store unreachable' }); return }
    if (!rows.length) { res.status(200).json({ ok: true, checked: 0, fired: 0 }); return }

    const cryptoIds = [...new Set(rows.filter((r) => r.kind !== 'stock').map((r) => r.asset_id))]
    const stockSyms = [...new Set(rows.filter((r) => r.kind === 'stock').map((r) => r.asset_id.toUpperCase()))]
    const [cp, sp] = await Promise.all([cryptoPrices(cryptoIds), stockPrices(stockSyms)])

    const fired = []
    for (const a of rows) {
      const price = a.kind === 'stock' ? sp[a.asset_id.toUpperCase()] : cp[a.asset_id]
      if (price == null) continue
      const hit = a.direction === 'above' ? price >= a.target_usd : price <= a.target_usd
      if (!hit) continue

      const arrow = a.direction === 'above' ? 'выше' : 'ниже'
      const href = a.kind === 'stock' ? `${SITE}/stock/${a.asset_id.toUpperCase()}` : `${SITE}/coin/${a.asset_id}`
      const text =
        `<b>${a.symbol.toUpperCase()} ${arrow} ${fmt(a.target_usd)} $</b>\n\n` +
        `${a.name || a.symbol.toUpperCase()}: сейчас <b>${fmt(price)} $</b>\n` +
        `Условие: ${arrow} ${fmt(a.target_usd)} $`
      const out = await tg('sendMessage', botToken, {
        chat_id: a.chat_id,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: 'Открыть график', url: href }]] },
      })
      if (out.ok) fired.push(a.id)
    }

    // Помечаем только реально отправленные: если Telegram не принял сообщение,
    // алерт остаётся ждущим и уйдёт на следующем прогоне.
    if (fired.length) await markFired(fired)

    res.status(200).json({ ok: true, checked: rows.length, fired: fired.length })
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 140) })
  }
}
