// Крипто-новости в Telegram-канал (Vercel Cron). Каждая новость — отдельный пост:
// картинка + содержание НА ДВУХ ЯЗЫКАХ (RU сверху, EN снизу) + ссылка на источник
// В ТЕКСТЕ. Кнопка — только на наш сайт. Стиль как у утренней сводки.
// env: TG_BOT_TOKEN, TG_CHANNEL_ID, опц. NEWS_COUNT (по умолч. 4), CRON_SECRET.

import { fetchAllNews } from '../src/lib/rss.js'

const SITE = 'https://tidewatchi.vercel.app'
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cut = (s, n) => (s && s.length > n ? s.slice(0, s.slice(0, n).lastIndexOf(' ')).trim() + '…' : s || '')

// Перевод EN→RU через публичный эндпоинт Google (без ключа). Фолбэк — оригинал.
async function toRu(text) {
  if (!text) return ''
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(text)}`
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })
    const j = await r.json()
    return (j[0] || []).map((x) => x[0]).join('') || text
  } catch {
    return text
  }
}

async function tg(method, token, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  return r.json().catch(() => ({ ok: false }))
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) { res.status(401).json({ error: 'unauthorized' }); return }
  const token = process.env.TG_BOT_TOKEN
  const channel = process.env.TG_CHANNEL_ID
  if (!token || !channel) { res.status(200).json({ skipped: 'TG not configured' }); return }
  const count = Math.min(Math.max(Number(process.env.NEWS_COUNT) || 4, 1), 6)

  try {
    const top = (await fetchAllNews(24)).slice(0, count)
    if (!top.length) { res.status(200).json({ skipped: 'no news' }); return }

    let posted = 0
    for (const n of top) {
      const enTitle = n.title
      const enSummary = cut(n.summary, 300)
      const [ruTitle, ruSummary] = await Promise.all([toRu(enTitle), toRu(enSummary)])

      // RU сверху, EN снизу; ссылка на источник — в тексте; кнопка — только сайт
      const text =
        `📰 <b>${esc(ruTitle)}</b>\n\n${esc(ruSummary)}\n\n` +
        `➖➖➖\n\n` +
        `📰 <b>${esc(enTitle)}</b>\n\n${esc(enSummary)}\n\n` +
        `🔗 <a href="${esc(n.url)}">${esc(n.source_name)}</a>`

      const btn = { inline_keyboard: [[{ text: '🌊 TideWatch', url: SITE }]] }

      let out
      if (n.image) {
        out = await tg('sendPhoto', token, { chat_id: channel, photo: n.image, caption: cut(text, 1020), parse_mode: 'HTML', reply_markup: btn })
        if (!out.ok) out = null
      }
      if (!out || !out.ok) {
        out = await tg('sendMessage', token, { chat_id: channel, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: btn })
      }
      if (out.ok) posted++
    }
    res.status(200).json({ ok: true, posted })
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 120) })
  }
}
