// Общий парсер крипто-новостей из RSS (используется и сайтом /api/news,
// и дайджестом в Telegram /api/news-digest). Без ключей.

export const FEEDS = [
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

// Краткое содержание статьи из <description>/<content:encoded>: чистим от
// boilerplate и обрезаем до N символов по границе слова.
function summarize(block, max = 400) {
  let s = field(block, 'description') || field(block, 'content:encoded') || ''
  s = s.replace(/The post .*? appeared first on .*/i, '')
       .replace(/Read more:.*/i, '')
       .replace(/\s+/g, ' ')
       .trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')).trim() + '…'
}

const imageOf = (block) => {
  const m = block.match(/<media:content[^>]*url="([^"]+)"/i)
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
      summary: summarize(it),
      currencies: [],
    })).filter((x) => x.title && x.url)
  } catch {
    return []
  }
}

// Свежие новости из всех фидов: мерж, дедуп по заголовку, сортировка по дате
export async function fetchAllNews(limit = 24) {
  const lists = await Promise.all(FEEDS.map(parseFeed))
  const seen = new Set()
  return lists.flat()
    .filter((x) => { const k = x.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
    .slice(0, limit)
}
