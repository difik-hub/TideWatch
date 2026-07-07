// MIRROR крипто-новостей в канал: сколько выходит у источников — столько постим.
// Запускается часто (GitHub Actions ~раз в час). Постит статьи, вышедшие за
// последнее «окно», каждую ПЕРЕФРАЗИРУЕМ (наш пост, без ссылок на источник).
//
// Анти-спам без БД: Cache-Control s-maxage=3000 — функция реально исполняется
// (и постит) не чаще ~раза в 50 мин, даже если эндпоинт дёргают часто.
// Требует GROQ_API_KEY (иначе не постим — только перефраз, не перевод).
// env: TG_BOT_TOKEN, TG_CHANNEL_ID, GROQ_API_KEY, опц. NEWS_WINDOW_MIN(75), NEWS_MAX(6).

import { fetchAllNews } from '../src/lib/rss.js'
import { postNews } from '../src/lib/tgpost.js'

const SITE = 'https://tidewatchi.vercel.app'

export default async function handler(req, res) {
  // Кеш = анти-спам: повторные вызовы в течение 50 мин не исполняют функцию заново
  res.setHeader('Cache-Control', 's-maxage=3000')

  const token = process.env.TG_BOT_TOKEN
  const channel = process.env.TG_CHANNEL_ID
  if (!token || !channel) { res.status(200).json({ skipped: 'TG not configured' }); return }
  if (!process.env.GROQ_API_KEY) { res.status(200).json({ skipped: 'GROQ_API_KEY not set (нужен для перефраза)' }); return }

  const windowMin = Math.min(Math.max(Number(process.env.NEWS_WINDOW_MIN) || 75, 30), 240)
  const maxPost = Math.min(Math.max(Number(process.env.NEWS_MAX) || 6, 1), 10)

  try {
    const all = await fetchAllNews(30)
    const now = Date.now()
    // Свежие (в окне), от старых к новым — чтобы в канале читались по порядку
    const fresh = all
      .filter((n) => {
        const t = new Date(n.published_at).getTime()
        return t && now - t >= 0 && now - t <= windowMin * 60_000
      })
      .sort((a, b) => new Date(a.published_at) - new Date(b.published_at))
      .slice(-maxPost)

    let posted = 0
    for (const n of fresh) {
      if (await postNews(token, channel, n, SITE)) posted++
    }
    res.status(200).json({ ok: true, posted, windowMin })
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 120) })
  }
}
