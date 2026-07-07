// Дневной дайджест крипто-новостей в Telegram-канал (Vercel Cron).
// Один аккуратный пост с топ-заголовками (курируемо, не спам).
// env: TG_BOT_TOKEN, TG_CHANNEL_ID, опц. CRON_SECRET.

import { fetchAllNews } from '../src/lib/rss.js'

const SITE = 'https://tidewatchi.vercel.app'
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const token = process.env.TG_BOT_TOKEN
  const channel = process.env.TG_CHANNEL_ID
  if (!token || !channel) {
    res.status(200).json({ skipped: 'TG not configured' })
    return
  }

  try {
    const news = await fetchAllNews(24)
    const top = news.slice(0, 6)
    if (!top.length) {
      res.status(200).json({ skipped: 'no news' })
      return
    }

    const lines = top.map((n, i) => `${i + 1}. <a href="${esc(n.url)}">${esc(n.title)}</a> — <i>${esc(n.source_name)}</i>`)
    const text = `📰 <b>Крипто-новости дня</b> · <b>Crypto headlines</b>\n\n${lines.join('\n\n')}`

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channel,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: '🌊 TideWatch', url: `${SITE}/news` }]] },
      }),
    })
    res.status(200).json({ ok: true, posted: top.length })
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 120) })
  }
}
