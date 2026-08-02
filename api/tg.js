// Telegram-бот TideWatch (webhook на Vercel, без отдельного сервера).
// Команды: /start /help /market /coin /stock /top /channel
// Меню команд регистрируется через Bot API setMyCommands (см. README-заметку ниже).
// env: TG_BOT_TOKEN

import { buildMarketSummary } from '../src/lib/marketSummary.js'
import { hasStore, validToken, linkChat } from '../src/lib/alertStore.js'

const CG = 'https://api.coingecko.com/api/v3'
const SITE = 'https://tidewatchi.vercel.app'
const CHANNEL = 'https://t.me/t1dewatch'

async function tg(method, token, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return r.json().catch(() => ({ ok: false }))
}

// Кнопки: приложение открывается ВНУТРИ Telegram (web_app), канал — обычной ссылкой
const mainButtons = {
  inline_keyboard: [
    [{ text: 'Открыть TideWatch', web_app: { url: SITE } }],
    [{ text: 'Наш канал', url: CHANNEL }],
  ],
}
const siteOnly = { inline_keyboard: [[{ text: 'Открыть TideWatch', web_app: { url: SITE } }]] }

const fmtPct = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`)
const arrow = (n) => (n == null ? '•' : n >= 0 ? '▲' : '▼')
const money = (n) => (n == null ? '—' : n >= 1000 ? `$${Math.round(n).toLocaleString('en-US')}` : `$${n}`)

async function cmdMarket() {
  const [gRes, mRes] = await Promise.all([
    fetch(`${CG}/global`).then((r) => r.json()),
    fetch(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h`).then((r) => r.json()),
  ])
  const coins = Array.isArray(mRes) ? mRes : []
  const summary = buildMarketSummary(gRes?.data, coins, 'ru')
  const btc = coins.find((c) => c.id === 'bitcoin')
  const eth = coins.find((c) => c.id === 'ethereum')
  const line = (c, icon) => (c ? `\n${icon} ${c.symbol.toUpperCase()}: ${money(c.current_price)} (${fmtPct(c.price_change_percentage_24h)})` : '')
  return `📊 <b>Рынок сейчас</b>\n\n${summary}\n${line(btc, '₿')}${line(eth, 'Ξ')}`
}

async function cmdTop() {
  const m = await fetch(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h`).then((r) => r.json())
  const coins = (Array.isArray(m) ? m : []).filter((c) => c.price_change_percentage_24h != null)
  if (!coins.length) return 'Данные сейчас недоступны, попробуй чуть позже.'
  const sorted = [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
  const row = (c) => `${arrow(c.price_change_percentage_24h)} <b>${c.symbol.toUpperCase()}</b> ${fmtPct(c.price_change_percentage_24h)} · ${money(c.current_price)}`
  const up = sorted.slice(0, 5).map(row).join('\n')
  const down = sorted.slice(-5).reverse().map(row).join('\n')
  return `🚀 <b>Лидеры роста (24ч)</b>\n${up}\n\n📉 <b>Лидеры падения (24ч)</b>\n${down}`
}

async function cmdCoin(query) {
  const s = await fetch(`${CG}/search?query=${encodeURIComponent(query)}`).then((r) => r.json())
  const hit = s?.coins?.[0]
  if (!hit) return `Монета «${query}» не нашлась 🤔\nПопробуй тикер, например: <code>/coin btc</code>`
  const m = await fetch(`${CG}/coins/markets?vs_currency=usd&ids=${hit.id}&price_change_percentage=24h,7d`).then((r) => r.json())
  const c = Array.isArray(m) ? m[0] : null
  if (!c) return `Данные по «${hit.name}» сейчас недоступны, попробуй позже.`
  const p7 = c.price_change_percentage_7d_in_currency
  const cap = c.market_cap ? `\n📦 Капитализация: $${(c.market_cap / 1e9).toFixed(2)} млрд` : ''
  return (
    `<b>${c.name} (${c.symbol.toUpperCase()})</b> · #${c.market_cap_rank}\n\n` +
    `💵 ${money(c.current_price)}\n` +
    `${arrow(c.price_change_percentage_24h)} 24ч: ${fmtPct(c.price_change_percentage_24h)}\n` +
    `${arrow(p7)} 7д: ${fmtPct(p7)}${cap}\n\n` +
    `🔗 ${SITE}/coin/${c.id}`
  )
}

// Акции — через наш же прокси FMP (ключ на сервере)
async function cmdStock(sym) {
  const s = String(sym).toUpperCase().replace(/[^A-Z.]/g, '')
  if (!s) return 'Напиши так: <code>/stock AAPL</code>'
  const d = await fetch(`${SITE}/api/fmp?p=quote&symbol=${s}`).then((r) => r.json()).catch(() => null)
  const q = Array.isArray(d) ? d[0] : null
  if (!q || q.price == null) return `Акция «${s}» не нашлась 🤔\nПопробуй тикер США, например: <code>/stock NVDA</code>`
  const cap = q.marketCap ? `\n📦 Капитализация: $${(q.marketCap / 1e9).toFixed(1)} млрд` : ''
  return (
    `<b>${q.name || s} (${s})</b>${q.exchange ? ` · ${q.exchange}` : ''}\n\n` +
    `💵 ${money(q.price)}\n` +
    `${arrow(q.changePercentage)} День: ${fmtPct(q.changePercentage)}${cap}\n\n` +
    `🔗 ${SITE}/stock/${s}`
  )
}

const HELP =
  '🌊 <b>TideWatch</b> — крипта и акции понятным языком.\n\n' +
  '<b>Команды:</b>\n' +
  '/market — что сейчас с рынком\n' +
  '/top — лидеры роста и падения\n' +
  '/coin btc — цена и динамика монеты\n' +
  '/stock nvda — цена акции\n' +
  '/channel — наш канал с новостями\n' +
  '/help — эта справка\n\n' +
  'Всё бесплатно, без регистрации.'

export default async function handler(req, res) {
  const token = process.env.TG_BOT_TOKEN
  if (!token) { res.status(500).json({ error: 'TG_BOT_TOKEN not configured' }); return }
  if (req.method !== 'POST') { res.status(200).json({ ok: true, hint: 'telegram webhook' }); return }

  // Секрет вебхука: Telegram шлёт его в заголовке, если задан при setWebhook.
  // Пока TG_WEBHOOK_SECRET не задан — бот работает как раньше (fail-open, чтобы
  // не молчать до перерегистрации). Задай секрет + перерегистрируй вебхук — и
  // чужие POST'ы (фейковые апдейты) будут отклоняться.
  const whSecret = process.env.TG_WEBHOOK_SECRET
  if (whSecret && req.headers['x-telegram-bot-api-secret-token'] !== whSecret) {
    res.status(401).json({ error: 'unauthorized' }); return
  }

  try {
    const msg = req.body?.message
    const chatId = msg?.chat?.id
    const text = (msg?.text || '').trim()
    if (!chatId || !text) { res.status(200).json({ ok: true }); return }

    // команда может прийти как /market@BotName — отрезаем хвост
    const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase()
    const arg = text.slice(text.split(/\s+/)[0].length).trim()

    let reply
    let buttons = mainButtons

    if (cmd === '/start') {
      // /start <токен> приходит по ссылке с сайта: привязываем чат, чтобы
      // алерты доходили сюда даже с закрытым браузером.
      if (arg && validToken(arg) && hasStore() && (await linkChat(arg, chatId))) {
        reply =
          '<b>Telegram подключён</b>\n\n' +
          'Теперь алерты на цену приходят сюда. Браузер можно закрывать: ' +
          'цену сверяет наш сервер, а не вкладка.\n\n' +
          'Возвращайся на сайт и ставь алерт на любую монету или акцию.'
      } else {
        reply =
          '<b>Привет! Это TideWatch</b>\n\n' +
          'Личный дежурный по рынкам: крипта и акции на одном экране, понятным языком.\n\n' +
          '<b>Что умею:</b>\n' +
          '/market — сводка рынка прямо сейчас\n' +
          '/top — кто растёт, а кто падает\n' +
          '/coin btc — разбор монеты\n' +
          '/stock nvda — цена акции\n' +
          '/channel — канал с новостями\n\n' +
          'Жми кнопку ниже, приложение откроется прямо здесь, в Telegram.'
      }
    } else if (cmd === '/help') {
      reply = HELP
    } else if (cmd === '/channel') {
      reply =
        '📢 <b>Наш канал: @t1dewatch</b>\n\n' +
        'Что там:\n' +
        '☀️ Утренняя сводка рынка — каждый день\n' +
        '📰 Свежие крипто-новости своими словами\n' +
        '🌊 Новости продукта и обновления\n\n' +
        'Подписывайся 👇'
      buttons = { inline_keyboard: [[{ text: '📢 Подписаться на канал', url: CHANNEL }], [{ text: 'Открыть TideWatch', web_app: { url: SITE } }]] }
    } else if (cmd === '/market') {
      reply = await cmdMarket()
    } else if (cmd === '/top') {
      reply = await cmdTop()
    } else if (cmd === '/coin') {
      reply = arg ? await cmdCoin(arg) : 'Напиши так: <code>/coin btc</code> (или название монеты)'
      buttons = siteOnly
    } else if (cmd === '/stock') {
      reply = arg ? await cmdStock(arg) : 'Напиши так: <code>/stock nvda</code> (тикер США)'
      buttons = siteOnly
    } else {
      reply = 'Не понял команду 🤔\n\n' + HELP
    }

    await tg('sendMessage', token, {
      chat_id: chatId,
      text: reply,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: buttons,
    })
  } catch {
    /* Telegram ретраит при ошибке — отвечаем 200, чтобы не зациклить */
  }
  res.status(200).json({ ok: true })
}
