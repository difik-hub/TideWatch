// Утренняя сводка в Telegram-канал (внешний планировщик или Vercel Cron).
//
// Раньше это был пересказ цифр: капитализация, биткоин, три лидера роста. То же
// самое печатает любой канал, и читать это незачем. Теперь сводка собирается тем
// же движком наблюдений, что и главный экран сайта: бот и сайт говорят одно и то
// же и одними словами. Лидеры роста остались хвостом, но уже не как главное.
//
// Нужно: env TG_BOT_TOKEN, TG_CHANNEL_ID (бот должен быть админом канала),
// опц. TG_DIGEST_LANG (ru | en | both, по умолчанию both), опц. CRON_SECRET.

import { buildMarketSummary } from '../src/lib/marketSummary.js'
import { buildInsights } from '../src/lib/insights.js'
import { translations } from '../src/i18n/translations.js'

const CG = 'https://api.coingecko.com/api/v3'
const SITE = 'https://tidewatchi.vercel.app'
const YF = 'https://query1.finance.yahoo.com/v8/finance/chart'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'

// Акции для кросс-рыночных наблюдений: берём мегакапы, этого хватает, чтобы
// понять, куда идёт рынок США, и не растягивает функцию по времени.
const STOCKS = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'COIN', 'MSTR']

const L = {
  en: { title: 'What is happening', gainers: 'Top gainers, 24h', open: 'Open TideWatch', quiet: 'Markets are quiet: nothing notable is moving.' },
  ru: { title: 'Что происходит', gainers: 'Лидеры роста за сутки', open: 'Открыть TideWatch', quiet: 'На рынке спокойно: заметных движений нет.' },
}

// Переводчик для движка: те же строки, что видит человек на сайте
const translator = (lang) => (key, params) => {
  const dict = translations[lang] || translations.en
  let s = dict[key] ?? translations.en[key] ?? key
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, v)
  return s
}

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function stockQuote(symbol) {
  try {
    const r = await fetch(`${YF}/${symbol}?range=5d&interval=1d`, { headers: { 'user-agent': UA } })
    if (!r.ok) return null
    const m = (await r.json())?.chart?.result?.[0]?.meta
    if (!m?.regularMarketPrice || !m.chartPreviousClose) return null
    return {
      id: symbol, symbol, name: symbol, kind: 'stock',
      current_price: m.regularMarketPrice,
      price_change_percentage_24h: ((m.regularMarketPrice - m.chartPreviousClose) / m.chartPreviousClose) * 100,
      fifty_two_week: { low: m.fiftyTwoWeekLow ?? null, high: m.fiftyTwoWeekHigh ?? null },
      href: `/stock/${symbol}`,
    }
  } catch { return null }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'unauthorized' }); return
  }

  const token = process.env.TG_BOT_TOKEN
  const channel = process.env.TG_CHANNEL_ID
  if (!token || !channel) { res.status(200).json({ skipped: 'TG_BOT_TOKEN or TG_CHANNEL_ID not set' }); return }

  const mode = ['ru', 'en'].includes(process.env.TG_DIGEST_LANG) ? process.env.TG_DIGEST_LANG : 'both'

  try {
    const [gRes, mRes, fngRes] = await Promise.all([
      fetch(`${CG}/global`).then((r) => r.json()).catch(() => null),
      fetch(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h,7d`)
        .then((r) => r.json()).catch(() => []),
      fetch('https://api.alternative.me/fng/?limit=1').then((r) => r.json()).catch(() => null),
    ])
    const coins = Array.isArray(mRes) ? mRes : []
    if (!coins.length) { res.status(502).json({ error: 'no market data' }); return }

    // Акции по одной: параллельно Yahoo отвечает нестабильно
    const stocks = []
    for (const s of STOCKS) {
      const q = await stockQuote(s)
      if (q) stocks.push(q)
    }

    const fng = Number(fngRes?.data?.[0]?.value)
    const top = [...coins]
      .filter((c) => c.price_change_percentage_24h != null)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 3)

    const block = (lang) => {
      const t = translator(lang)
      const cap = L[lang]
      // Портфеля у канала нет, поэтому личных наблюдений здесь не будет — только рынок
      const items = buildInsights({
        coins,
        stocks,
        global: isFinite(fng) ? { fng } : null,
        rows: [],
        calendar: {},
        t,
      }).slice(0, 5)

      const lines = items.length
        ? items.map((i) => `▸ <b>${esc(i.title)}</b>\n   ${esc(i.body)}`).join('\n\n')
        : esc(buildMarketSummary(gRes?.data, coins, lang) || cap.quiet)

      const gainers = top.map((c) => `• ${c.symbol.toUpperCase()} +${c.price_change_percentage_24h.toFixed(1)}%`).join('\n')
      return `<b>${cap.title}</b>\n\n${lines}\n\n<b>${cap.gainers}</b>\n${gainers}`
    }

    const text = mode === 'both' ? `${block('ru')}\n\n➖➖➖\n\n${block('en')}` : block(mode)

    // Прогон без отправки: посмотреть, что уйдёт в канал, не публикуя пост
    if (new URL(req.url, 'http://localhost').searchParams.get('dry') === '1') {
      res.status(200).json({ dry: true, stocks: stocks.length, text })
      return
    }

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channel,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: L[mode === 'ru' ? 'ru' : 'en'].open, url: SITE }]] },
      }),
    })
    const out = await r.json().catch(() => ({}))
    res.status(200).json({ ok: !!out.ok, stocks: stocks.length })
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 120) })
  }
}
