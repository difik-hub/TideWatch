// Крипто-новости для сайта (/api/news) — через общий RSS-модуль, без ключей.
import { fetchAllNews } from '../src/lib/rss.js'

export default async function handler(req, res) {
  try {
    const results = await fetchAllNews(24)
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')
    res.status(200).json({ results })
  } catch {
    res.setHeader('Cache-Control', 's-maxage=30')
    res.status(200).json({ results: [] })
  }
}
