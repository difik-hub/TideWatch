// Утренняя сводка рынка в Telegram-канал (Vercel Cron → Bot API).
// Публикует «что на рынке» понятным языком + топ движений + ссылку на сайт.
// Нужно: env TG_BOT_TOKEN (есть), TG_CHANNEL_ID (@username или -100… id канала,
// бот должен быть админом), опц. TG_DIGEST_LANG (по умолч. en), опц. CRON_SECRET.

import { buildMarketSummary } from '../src/lib/marketSummary.js'

const CG = 'https://api.coingecko.com/api/v3'
const SITE = 'https://tidewatchi.vercel.app'

const L = {
  en: { title: '📊 Morning market brief', gainers: 'Top gainers (24h)', open: '🌊 Open TideWatch' },
  ru: { title: '📊 Утренняя сводка рынка', gainers: 'Лидеры роста (24ч)', open: '🌊 Открыть TideWatch' },
}

export default async function handler(req, res) {
  // Защита: если задан CRON_SECRET, пускаем только по нему (Vercel шлёт его в Authorization)
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const token = process.env.TG_BOT_TOKEN
  const channel = process.env.TG_CHANNEL_ID
  if (!token || !channel) {
    res.status(200).json({ skipped: 'TG_BOT_TOKEN or TG_CHANNEL_ID not set' })
    return
  }
  // 'both' (по умолч.) — русский + английский одним постом; или 'ru'/'en'
  const mode = ['ru', 'en'].includes(process.env.TG_DIGEST_LANG) ? process.env.TG_DIGEST_LANG : 'both'

  try {
    const [gRes, mRes] = await Promise.all([
      fetch(`${CG}/global`).then((r) => r.json()),
      fetch(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h`).then((r) => r.json()),
    ])
    const coins = Array.isArray(mRes) ? mRes : []
    const btc = coins.find((c) => c.id === 'bitcoin')
    const top = [...coins]
      .filter((c) => c.price_change_percentage_24h != null)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 3)

    const block = (lang) => {
      const t = L[lang]
      const summary = buildMarketSummary(gRes?.data, coins, lang)
      const btcLine = btc ? `\n₿ Bitcoin: $${Math.round(btc.current_price).toLocaleString('en-US')} (${btc.price_change_percentage_24h > 0 ? '+' : ''}${btc.price_change_percentage_24h?.toFixed(1)}%)` : ''
      const gainers = top.map((c) => `• ${c.symbol.toUpperCase()} +${c.price_change_percentage_24h.toFixed(1)}%`).join('\n')
      return `<b>${t.title}</b>\n\n${summary}${btcLine}\n\n<b>${t.gainers}</b>\n${gainers}`
    }

    const text = mode === 'both'
      ? `${block('ru')}\n\n➖➖➖\n\n${block('en')}`
      : block(mode)

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 120) })
  }
}
