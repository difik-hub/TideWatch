// Капельный постинг новостей в канал: РОВНО ОДНА новость за вызов, с выдержкой
// интервала между постами. Много новостей → капают по одной. Одна новость →
// выходит на ближайшем срабатывании (практически сразу).
//
// Память (что уже постили) — Supabase, таблица posted_news, серверный ключ.
// Дёргается внешним планировщиком (cron-job.org) каждые ~10 мин; реальный
// интервал между постами держит MIN_GAP_MIN, а не частота пингов.
//
// env: TG_BOT_TOKEN, TG_CHANNEL_ID, GROQ_API_KEY, SUPABASE_SERVICE_KEY,
//      опц. MIN_GAP_MIN (по умолч. 20), MAX_AGE_HOURS (по умолч. 12).

import { fetchAllNews } from '../src/lib/rss.js'
import { postNews } from '../src/lib/tgpost.js'
import { hasStore, getPostedUrls, lastPostedAt, markPosted } from '../src/lib/postedStore.js'

const SITE = 'https://tidewatchi.vercel.app'

export default async function handler(req, res) {
  // Никакого кеша: каждый пинг должен реально проверить очередь.
  // Защиту от частых постов даёт MIN_GAP_MIN, а не кеш.
  res.setHeader('Cache-Control', 'no-store')

  const token = process.env.TG_BOT_TOKEN
  const channel = process.env.TG_CHANNEL_ID
  if (!token || !channel) { res.status(200).json({ skipped: 'TG not configured' }); return }
  if (!process.env.GROQ_API_KEY) { res.status(200).json({ skipped: 'GROQ_API_KEY not set' }); return }
  if (!hasStore()) { res.status(200).json({ skipped: 'SUPABASE_SERVICE_KEY not set' }); return }

  const minGapMs = (Number(process.env.MIN_GAP_MIN) || 20) * 60_000
  const maxAgeMs = (Number(process.env.MAX_AGE_HOURS) || 12) * 3600_000

  try {
    // 1. Выдержка интервала — не постим чаще, чем раз в MIN_GAP_MIN
    const last = await lastPostedAt()
    if (last === null) { res.status(500).json({ error: 'store unreachable' }); return }
    const waitedMs = Date.now() - last
    if (last > 0 && waitedMs < minGapMs) {
      res.status(200).json({ skipped: 'too soon', nextInMin: Math.ceil((minGapMs - waitedMs) / 60_000) })
      return
    }

    // 2. Свежие новости, ещё не опубликованные
    const posted = await getPostedUrls()
    if (posted === null) { res.status(500).json({ error: 'store unreachable' }); return }

    const now = Date.now()
    const queue = (await fetchAllNews(30))
      .filter((n) => {
        const t = new Date(n.published_at).getTime()
        return t && now - t >= 0 && now - t <= maxAgeMs && !posted.has(n.url)
      })
      // от старых к новым — публикуем в хронологическом порядке
      .sort((a, b) => new Date(a.published_at) - new Date(b.published_at))

    if (!queue.length) { res.status(200).json({ ok: true, posted: 0, note: 'queue empty' }); return }

    // 3. Ровно одна новость: перефразируем и публикуем
    const item = queue[0]
    const ok = await postNews(token, channel, item, SITE)
    if (!ok) { res.status(502).json({ error: 'telegram send failed' }); return }
    await markPosted(item.url)

    res.status(200).json({ ok: true, posted: 1, queueLeft: queue.length - 1, title: item.title.slice(0, 60) })
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 140) })
  }
}
