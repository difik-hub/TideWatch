// Общие помощники для постинга новостей в Telegram (перефраз + отправка).
// Используются /api/news-post (mirror) и /api/news-digest (ручной/бэкап).

export const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const cut = (s, n) => (s && s.length > n ? s.slice(0, s.slice(0, n).lastIndexOf(' ')).trim() + '…' : s || '')

// Перевод EN→RU (Google, без ключа) — фолбэк, если нет LLM
export async function toRu(text) {
  if (!text) return ''
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(text)}`
    const j = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).json()
    return (j[0] || []).map((x) => x[0]).join('') || text
  } catch { return text }
}

// Перефраз через Groq (бесплатный, OpenAI-совместимый) → {ruTitle,ru,enTitle,en}
export async function rewrite(title, summary) {
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          // Браузерный UA — иначе Cloudflare Groq может резать (error 1010)
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        },
        body: JSON.stringify(body),
      })
      const j = await r.json()
      const txt = j?.choices?.[0]?.message?.content || ''
      const parsed = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1))
      if (parsed.ru && parsed.en) return parsed
    } catch { /* фолбэк ниже */ }
  }
  const [ruTitle, ru] = await Promise.all([toRu(title), toRu(summary)])
  return { ruTitle, ru, enTitle: title, en: summary }
}

export async function tg(method, token, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  return r.json().catch(() => ({ ok: false }))
}

// Собрать текст поста (RU сверху ➖ EN снизу, без ссылок на источник)
export function buildPostText(p, fallbackTitle) {
  return (
    `📰 <b>${esc(p.ruTitle || fallbackTitle)}</b>\n\n${esc(p.ru)}\n\n` +
    `➖➖➖\n\n` +
    `📰 <b>${esc(p.enTitle || fallbackTitle)}</b>\n\n${esc(p.en)}`
  )
}

// Отправить один пост-новость (фото если есть, иначе текст). Кнопка — сайт.
export async function postNews(token, channel, item, site) {
  const p = await rewrite(item.title, cut(item.summary, 320))
  const text = buildPostText(p, item.title)
  const btn = { inline_keyboard: [[{ text: '🌊 TideWatch', url: site }]] }
  let out
  if (item.image) {
    out = await tg('sendPhoto', token, { chat_id: channel, photo: item.image, caption: cut(text, 1020), parse_mode: 'HTML', reply_markup: btn })
    if (!out.ok) out = null
  }
  if (!out || !out.ok) {
    out = await tg('sendMessage', token, { chat_id: channel, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: btn })
  }
  return !!out.ok
}
