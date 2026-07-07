// Крипто-новости в Telegram-канал (Vercel Cron). Каждая новость — НАШ пост:
// берём суть, ПЕРЕФРАЗИРУЕМ (не копия), на 2 языках (RU сверху ➖ EN снизу),
// БЕЗ ссылок на источник, кнопка — только на наш сайт. Картинка — из статьи.
// env: TG_BOT_TOKEN, TG_CHANNEL_ID, опц. GROQ_API_KEY (перефраз), NEWS_COUNT(4), CRON_SECRET.

import { fetchAllNews } from '../src/lib/rss.js'

const SITE = 'https://tidewatchi.vercel.app'
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cut = (s, n) => (s && s.length > n ? s.slice(0, s.slice(0, n).lastIndexOf(' ')).trim() + '…' : s || '')

// Перевод EN→RU (Google, без ключа) — фолбэк, если нет LLM для перефраза
async function toRu(text) {
  if (!text) return ''
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(text)}`
    const j = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).json()
    return (j[0] || []).map((x) => x[0]).join('') || text
  } catch { return text }
}

// Перефраз через Groq (бесплатный, OpenAI-совместимый). Возвращает {ruTitle,ru,enTitle,en}.
async function rewrite(title, summary) {
  const key = process.env.GROQ_API_KEY
  if (key) {
    try {
      const body = {
        model: 'llama-3.3-70b-versatile',
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You rewrite crypto news into short ORIGINAL posts for a Telegram channel. Paraphrase — never copy sentences verbatim. No source names, no links. Neutral, factual. Return JSON only.' },
          { role: 'user', content: `Title: ${title}\nSummary: ${summary}\n\nWrite an original 2-3 sentence post in Russian and English. Return JSON: {"ruTitle":"","ru":"","enTitle":"","en":""}` },
        ],
      }
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body),
      })
      const j = await r.json()
      const txt = j?.choices?.[0]?.message?.content || ''
      const parsed = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1))
      if (parsed.ru && parsed.en) return parsed
    } catch { /* упадём на перевод */ }
  }
  // Фолбэк: перевод (RU) + оригинал (EN)
  const [ruTitle, ru] = await Promise.all([toRu(title), toRu(summary)])
  return { ruTitle, ru, enTitle: title, en: summary }
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
      const p = await rewrite(n.title, cut(n.summary, 320))
      const text =
        `📰 <b>${esc(p.ruTitle || n.title)}</b>\n\n${esc(p.ru)}\n\n` +
        `➖➖➖\n\n` +
        `📰 <b>${esc(p.enTitle || n.title)}</b>\n\n${esc(p.en)}`

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
