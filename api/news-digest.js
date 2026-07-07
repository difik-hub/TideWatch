// Крипто-новости в Telegram-канал (Vercel Cron). Постит САМ КОНТЕНТ статей
// (картинка + заголовок + суть), а не список ссылок — как настоящий новостной канал.
// env: TG_BOT_TOKEN, TG_CHANNEL_ID, опц. NEWS_COUNT (по умолч. 4), CRON_SECRET.

import { fetchAllNews } from '../src/lib/rss.js'

const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function tg(method, token, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return r.json().catch(() => ({ ok: false }))
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'unauthorized' }); return
  }
  const token = process.env.TG_BOT_TOKEN
  const channel = process.env.TG_CHANNEL_ID
  if (!token || !channel) { res.status(200).json({ skipped: 'TG not configured' }); return }

  const count = Math.min(Math.max(Number(process.env.NEWS_COUNT) || 4, 1), 6)

  try {
    const news = await fetchAllNews(24)
    const top = news.slice(0, count)
    if (!top.length) { res.status(200).json({ skipped: 'no news' }); return }

    let posted = 0
    for (const n of top) {
      const caption = `📰 <b>${esc(n.title)}</b>\n\n${esc(n.summary || '')}\n\n<i>${esc(n.source_name)}</i>`
      const btn = { inline_keyboard: [[{ text: '🔗 Источник / Source', url: n.url }]] }

      let out
      if (n.image) {
        out = await tg('sendPhoto', token, { chat_id: channel, photo: n.image, caption: caption.slice(0, 1024), parse_mode: 'HTML', reply_markup: btn })
        if (!out.ok) out = null // картинка не зашла — упадём на текст
      }
      if (!out || !out.ok) {
        out = await tg('sendMessage', token, { chat_id: channel, text: caption, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: btn })
      }
      if (out.ok) posted++
    }
    res.status(200).json({ ok: true, posted })
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 120) })
  }
}
