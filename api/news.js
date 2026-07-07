// Крипто-новости через RSS известных изданий (без ключей/регистраций).
// Сервер забирает RSS, парсит и отдаёт единый JSON. Кешируется на edge.

const FEEDS = [
  { source: 'Cointelegraph', domain: 'cointelegraph.com', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt', domain: 'decrypt.co', url: 'https://decrypt.co/feed' },
  { source: 'Bitcoin Magazine', domain: 'bitcoinmagazine.com', url: 'https://bitcoinmagazine.com/feed' },
]

const strip = (s) => (s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#38;/g, '&').replace(/&#8217;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
  .trim()

const field = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? strip(m[1]) : ''
}

// Картинка новости: media:content / media:thumbnail / enclosure / первый <img> в описании
const imageOf = (block) => {
  let m = block.match(/<media:content[^>]*url="([^"]+)"/i)
    || block.match(/<media:thumbnail[^>]*url="([^"]+)"/i)
    || block.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i)
    || block.match(/<enclosure[^>]*type="image[^>]*url="([^"]+)"/i)
    || block.match(/<img[^>]*src="([^"]+)"/i)
  return m ? m[1].replace(/&amp;/g, '&') : ''
}

async function parseFeed(feed) {
  try {
    const r = await fetch(feed.url, { headers: { 'user-agent': 'Mozilla/5.0 TideWatch', accept: 'application/rss+xml,text/xml,*/*' } })
    if (!r.ok) return []
    const xml = await r.text()
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) || []
    return items.slice(0, 12).map((it) => ({
      title: field(it, 'title'),
      url: field(it, 'link') || (it.match(/<link[^>]*href="([^"]+)"/i)?.[1] || ''),
      source_name: feed.source,
      domain: feed.domain,
      published_at: field(it, 'pubDate') || field(it, 'dc:date') || field(it, 'published'),
      image: imageOf(it),
      currencies: [],
    })).filter((x) => x.title && x.url)
  } catch {
    return []
  }
}

export default async function handler(req, res) {
  try {
    const lists = await Promise.all(FEEDS.map(parseFeed))
    const merged = lists.flat()
    // Сортировка по дате (свежие сверху), дедуп по заголовку, лимит
    const seen = new Set()
    const results = merged
      .filter((x) => { const k = x.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
      .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
      .slice(0, 24)

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600')
    res.status(200).json({ results })
  } catch {
    res.setHeader('Cache-Control', 's-maxage=30')
    res.status(200).json({ results: [] })
  }
}
