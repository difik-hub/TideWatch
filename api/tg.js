// Telegram-бот TideWatch (webhook на Vercel, без отдельного сервера).
// Команды: /start — приветствие; /market — сводка рынка понятным языком;
// /coin <название> — цена и динамика монеты.
// Токен бота — в env TG_BOT_TOKEN (Vercel → Settings → Environment Variables).

import { buildMarketSummary } from '../src/lib/marketSummary.js'

const CG = 'https://api.coingecko.com/api/v3'
const SITE = 'https://tidewatchi.vercel.app'

async function tg(method, token, payload) {
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// web_app — сайт открывается ВНУТРИ Telegram (Mini App), а не во внешнем браузере
const siteButton = {
  inline_keyboard: [[{ text: '🌊 Открыть TideWatch', web_app: { url: SITE } }]],
}

async function cmdMarket() {
  const [gRes, mRes] = await Promise.all([
    fetch(`${CG}/global`).then((r) => r.json()),
    fetch(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h`).then((r) => r.json()),
  ])
  const summary = buildMarketSummary(gRes?.data, Array.isArray(mRes) ? mRes : [], 'ru')
  const btc = Array.isArray(mRes) ? mRes.find((c) => c.id === 'bitcoin') : null
  const btcLine = btc ? `\n\n₿ Bitcoin: $${Math.round(btc.current_price).toLocaleString('en-US')} (${btc.price_change_percentage_24h > 0 ? '+' : ''}${btc.price_change_percentage_24h?.toFixed(2)}% за 24ч)` : ''
  return `📊 <b>Рынок сейчас</b>\n\n${summary}${btcLine}`
}

async function cmdCoin(query) {
  const s = await fetch(`${CG}/search?query=${encodeURIComponent(query)}`).then((r) => r.json())
  const hit = s?.coins?.[0]
  if (!hit) return `Монета «${query}» не нашлась. Попробуй тикер, например: /coin btc`
  const m = await fetch(`${CG}/coins/markets?vs_currency=usd&ids=${hit.id}&price_change_percentage=24h,7d`).then((r) => r.json())
  const c = Array.isArray(m) ? m[0] : null
  if (!c) return `Данные по «${hit.name}» сейчас недоступны, попробуй позже.`
  const p24 = c.price_change_percentage_24h
  const p7 = c.price_change_percentage_7d_in_currency
  const fmt = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`)
  const arrow = (n) => (n == null ? '•' : n >= 0 ? '▲' : '▼')
  return (
    `<b>${c.name} (${c.symbol.toUpperCase()})</b> · #${c.market_cap_rank}\n\n` +
    `💵 $${c.current_price >= 1000 ? Math.round(c.current_price).toLocaleString('en-US') : c.current_price}\n` +
    `${arrow(p24)} 24ч: ${fmt(p24)}\n` +
    `${arrow(p7)} 7д: ${fmt(p7)}\n\n` +
    `${SITE}/coin/${c.id}`
  )
}

export default async function handler(req, res) {
  const token = process.env.TG_BOT_TOKEN
  if (!token) {
    res.status(500).json({ error: 'TG_BOT_TOKEN not configured' })
    return
  }
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true, hint: 'telegram webhook' })
    return
  }

  try {
    const update = req.body
    const msg = update?.message
    const chatId = msg?.chat?.id
    const text = (msg?.text || '').trim()
    if (!chatId || !text) {
      res.status(200).json({ ok: true })
      return
    }

    let reply
    if (text.startsWith('/start')) {
      reply =
        '🌊 <b>TideWatch</b> — крипторынок понятным языком.\n\n' +
        'Команды:\n' +
        '/market — что происходит с рынком прямо сейчас\n' +
        '/coin btc — цена и динамика монеты\n\n' +
        'Без регистрации, бесплатно.'
    } else if (text.startsWith('/market')) {
      reply = await cmdMarket()
    } else if (text.startsWith('/coin')) {
      const q = text.replace('/coin', '').trim()
      reply = q ? await cmdCoin(q) : 'Напиши так: /coin btc (или название монеты)'
    } else {
      reply = 'Не понял 🤔 Доступно: /market — сводка рынка, /coin btc — монета.'
    }

    await tg('sendMessage', token, {
      chat_id: chatId,
      text: reply,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      reply_markup: siteButton,
    })
  } catch {
    /* Telegram ретраит при ошибке — отвечаем 200, чтобы не зациклить */
  }
  res.status(200).json({ ok: true })
}
