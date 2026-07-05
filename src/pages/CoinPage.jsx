import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Nav from '../components/Nav'
import PriceChart from '../components/PriceChart'
import AnimatedNumber from '../components/AnimatedNumber'
import Icon, { TrendArrow } from '../components/Icon'
import { fetchCoin, fetchMarketChart, fetchMarkets } from '../lib/api'
import { buildSummary } from '../lib/summary'
import { formatPrice, formatBig, formatNum, formatPct, trendOf } from '../lib/format'
import { getFavorites, toggleFavorite } from '../lib/favorites'
import { logActivity } from '../lib/activity'
import { shareCoinCard } from '../lib/shareCard'
import { useSettings } from '../store/settings'
import { useUI } from '../store/ui'
import { useT } from '../i18n/useT'

const PERIODS = [
  { key: '1', labelKey: 'lblDay', days: 1, alt: '24h' },
  { key: '7', labelKey: 'lblWeek', days: 7, alt: '7d' },
  { key: '30', days: 30, alt: '30d' },
  { key: '365', days: 365, alt: '1y' },
]

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }

// Сборка объекта монеты из данных ленты (/coins/markets) — резервный источник,
// если тяжёлый /coins/{id} не ответил. Цена/динамика там уже в выбранной валюте.
function buildCoinFromMarket(m, currency) {
  const c = (v) => ({ [currency]: v })
  return {
    name: m.name,
    symbol: m.symbol,
    image: { large: m.image },
    market_cap_rank: m.market_cap_rank,
    description: { en: '' },
    market_data: {
      current_price: c(m.current_price),
      ath: c(m.ath),
      atl: c(m.atl),
      high_24h: c(m.high_24h),
      low_24h: c(m.low_24h),
      market_cap: c(m.market_cap),
      total_volume: c(m.total_volume),
      circulating_supply: m.circulating_supply,
      total_supply: m.total_supply,
      price_change_percentage_24h_in_currency: c(m.price_change_percentage_24h_in_currency ?? m.price_change_percentage_24h),
      price_change_percentage_7d_in_currency: c(m.price_change_percentage_7d_in_currency),
      price_change_percentage_30d_in_currency: c(m.price_change_percentage_30d_in_currency),
    },
  }
}

function cleanDescription(html) {
  if (!html) return ''
  return html
    .replace(/<a [^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function SectionTitle({ icon, children }) {
  return (
    <h2 className="text-[13px] font-semibold text-soft uppercase tracking-wide mb-2.5 flex items-center gap-2">
      <Icon name={icon} size={15} className="text-brand-ink" />
      {children}
    </h2>
  )
}

function Stat({ label, value }) {
  return (
    <div className="px-3.5 py-3">
      <div className="text-faint text-[11px]">{label}</div>
      <div className="font-medium mt-0.5 text-ink tnum text-[15px]">{value}</div>
    </div>
  )
}

export default function CoinPage() {
  const { id } = useParams()
  const { currency, lang, coinCount } = useSettings()
  const ui = useUI()
  const t = useT()

  const [coin, setCoin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(PERIODS[1])
  const [chart, setChart] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)
  const [others, setOthers] = useState([])
  const [favs, setFavs] = useState(() => getFavorites())
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const isFav = favs.has(id)

  useEffect(() => {
    let alive = true
    window.scrollTo(0, 0)
    setLoading(true)
    setError(null)
    setShowFullDesc(false)

    ;(async () => {
      try {
        const data = await fetchCoin(id)
        if (alive) { setCoin(data); logActivity('view', data.name, id) }
      } catch (e) {
        // Резерв: собрать монету из данных ленты (часто уже в кеше)
        try {
          const list = await fetchMarkets(Math.max(coinCount, 50), 1, currency)
          const m = list.find((c) => c.id === id)
          if (!alive) return
          if (m) { setCoin(buildCoinFromMarket(m, currency)); setError(null); logActivity('view', m.name, id) }
          else setError(e.message)
        } catch (e2) {
          if (alive) setError(e2.message)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()

    fetchMarkets(Math.max(coinCount, 50), 1, currency)
      .then((list) => { if (alive) setOthers(list.filter((c) => c.id !== id).slice(0, 6)) })
      .catch(() => {})
    return () => { alive = false }
  }, [id, currency, coinCount, reloadKey])

  useEffect(() => {
    let alive = true
    setChartLoading(true)
    fetchMarketChart(id, period.days, currency)
      .then((data) => {
        if (!alive) return
        const points = (data.prices || []).map(([ts, price]) => {
          const dt = new Date(ts)
          const label = period.days <= 1
            ? dt.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
            : dt.toLocaleDateString(lang, { day: '2-digit', month: 'short' })
          return { label, price }
        })
        setChart(points)
      })
      .catch(() => { if (alive) setChart(null) })
      .finally(() => { if (alive) setChartLoading(false) })
    return () => { alive = false }
  }, [id, period, currency, lang, reloadKey])

  const md = coin?.market_data

  const summaryObj = useMemo(() => {
    if (!coin || !md) return null
    const pick = (o) => (o && o[currency] != null ? o[currency] : null)
    return {
      name: coin.name,
      current_price: pick(md.current_price),
      ath: pick(md.ath),
      price_change_percentage_24h_in_currency: pick(md.price_change_percentage_24h_in_currency),
      price_change_percentage_7d_in_currency: pick(md.price_change_percentage_7d_in_currency),
      price_change_percentage_30d_in_currency: pick(md.price_change_percentage_30d_in_currency),
    }
  }, [coin, md, currency])

  const summary = useMemo(() => (summaryObj ? buildSummary(summaryObj, lang) : ''), [summaryObj, lang])

  const onToggleFav = () => setFavs(new Set(toggleFavorite(id)))

  const [shared, setShared] = useState(false)
  // Шеринг красивой карточки-сводки (картинка для репоста)
  const onShare = async () => {
    if (!coin || !md) return
    const cur = md.current_price?.[currency]
    const ch = md.price_change_percentage_24h_in_currency?.[currency]
    setShared(true)
    setTimeout(() => setShared(false), 1500)
    await shareCoinCard({
      name: coin.name,
      symbol: coin.symbol,
      price: formatPrice(cur, currency),
      change: ch,
      summary,
      fileName: `tidewatch-${coin.symbol}`,
    })
  }

  const periodLabel = (p) => (p.labelKey ? t(p.labelKey) : p.alt)

  if (loading) {
    return (
      <div className="min-h-[100dvh] page">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center text-soft">{t('loadingCoin')}…</div>
      </div>
    )
  }

  if (error || !coin) {
    return (
      <div className="min-h-[100dvh] page">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="card rounded-2xl p-6 inline-block">
            <div className="text-down font-medium mb-1">{t('errorTitle')}</div>
            <div className="text-soft text-sm mb-4 max-w-xs mx-auto">{error || t('notFound')}</div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => { setLoading(true); setError(null); setReloadKey((k) => k + 1) }}
                className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 active:scale-[0.99] transition inline-flex items-center gap-1.5"
              >
                <Icon name="refresh" size={15} /> {t('retry')}
              </button>
              <Link to="/" className="px-4 py-2 rounded-lg bg-panel2 text-soft text-sm hover:text-ink transition inline-flex items-center gap-1.5">
                <Icon name="back" size={15} /> {t('back')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const price = md?.current_price?.[currency]
  const d24 = md?.price_change_percentage_24h_in_currency?.[currency]
  const t24 = trendOf(d24)
  const up = (d24 ?? 0) >= 0
  const desc = cleanDescription(coin.description?.en)
  const descShort = desc.length > 320 && !showFullDesc ? desc.slice(0, 320) + '…' : desc

  return (
    <div className="min-h-[100dvh]">
      <Nav />

      <main className="max-w-2xl mx-auto px-4 py-5">
        <Link to="/" className="inline-flex items-center gap-1 text-soft hover:text-ink text-sm mb-5 transition">
          <Icon name="back" size={16} /> {t('back')}
        </Link>

        <div className="flex items-center gap-4">
          <img src={coin.image?.large} alt={coin.name} className="w-12 h-12 rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight">{coin.name}</h1>
              <span className="text-faint uppercase text-xs tnum">{coin.symbol}</span>
              {coin.market_cap_rank && (
                <span className="text-[11px] text-brand-ink bg-brand-soft border border-brand/25 px-2 py-0.5 rounded-md">
                  {t('rank')} #{coin.market_cap_rank}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2.5 mt-1 flex-wrap">
              <AnimatedNumber value={price} format={(n) => formatPrice(n, currency)} className="text-2xl font-semibold tnum" />
              <span className={`text-sm font-medium inline-flex items-center gap-1 tnum ${trendColor[t24]}`}>
                <TrendArrow dir={t24} size={10} /> {formatPct(d24)} {t('per24h')}
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={onShare}
              aria-label={t('share')}
              title={t('share')}
              className={`grid place-items-center w-10 h-10 rounded-xl border border-line hover:bg-panel2 transition ${shared ? 'text-up' : 'text-faint hover:text-brand-ink'}`}
            >
              <Icon name={shared ? 'check2' : 'share'} size={18} />
            </button>
            <button
              onClick={() => ui.openAlerts(id)}
              aria-label={t('alertAdd')}
              title={t('alertAdd')}
              className="grid place-items-center w-10 h-10 rounded-xl border border-line text-faint hover:text-brand-ink hover:bg-panel2 transition"
            >
              <Icon name="bell" size={19} />
            </button>
            <button
              onClick={onToggleFav}
              aria-label={t('favorites')}
              className={`grid place-items-center w-10 h-10 rounded-xl border border-line transition hover:bg-panel2 ${isFav ? 'text-brand-ink' : 'text-faint'}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
                <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-6 card rounded-2xl p-4">
          <div className="flex gap-1.5 mb-4">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition ${
                  period.key === p.key ? 'bg-brand text-white' : 'bg-panel2 text-soft hover:text-ink'
                }`}
              >
                {periodLabel(p)}
              </button>
            ))}
          </div>
          {chartLoading ? (
            <div className="h-64 flex items-center justify-center">
              <span className="skeleton w-full h-52 rounded-xl" />
            </div>
          ) : (
            <PriceChart data={chart} up={up} />
          )}
        </div>

        {summary && (
          <section className="mt-7">
            <SectionTitle icon="movement">{t('pWhats')}</SectionTitle>
            <div className="card rounded-2xl p-4 leading-relaxed text-ink tnum">{summary}</div>
          </section>
        )}

        <section className="mt-7">
          <SectionTitle icon="bars">{t('pDetails')}</SectionTitle>
          <div className="card rounded-2xl grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-line overflow-hidden">
            <Stat label={t('stMarketCap')} value={formatBig(md?.market_cap?.[currency], currency)} />
            <Stat label={t('stVolume')} value={formatBig(md?.total_volume?.[currency], currency)} />
            <Stat label={t('stHigh')} value={formatPrice(md?.high_24h?.[currency], currency)} />
            <Stat label={t('stLow')} value={formatPrice(md?.low_24h?.[currency], currency)} />
            <Stat label={t('stAth')} value={formatPrice(md?.ath?.[currency], currency)} />
            <Stat label={t('stAtl')} value={formatPrice(md?.atl?.[currency], currency)} />
            <Stat label={t('stCirc')} value={formatNum(md?.circulating_supply)} />
            <Stat label={t('stSupply')} value={md?.total_supply ? formatNum(md.total_supply) : '∞'} />
            <Stat label={t('stWeek')} value={formatPct(md?.price_change_percentage_7d_in_currency?.[currency])} />
          </div>
        </section>

        {desc && (
          <section className="mt-7">
            <SectionTitle icon="about">{t('pAbout')}</SectionTitle>
            <div className="card rounded-2xl p-4 text-soft leading-relaxed whitespace-pre-line">
              {descShort}
              {desc.length > 320 && (
                <button onClick={() => setShowFullDesc((v) => !v)} className="block mt-2 text-brand-ink hover:underline text-sm">
                  {showFullDesc ? t('collapse') : t('readMore')}
                </button>
              )}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="mt-8">
            <SectionTitle icon="grid">{t('otherCoins')}</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              {others.map((c) => {
                const dd = c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h
                const tt = trendOf(dd)
                return (
                  <Link key={c.id} to={`/coin/${c.id}`} className="card-link flex items-center gap-2.5 rounded-xl p-3">
                    <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-soft tnum">{formatPrice(c.current_price, currency)}</div>
                    </div>
                    <span className={`text-xs font-medium tnum ${trendColor[tt]}`}>{formatPct(dd)}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-faint py-10 leading-relaxed">
          <div>{t('footerData')}</div>
          <div className="mt-1">{t('disclaimer')}</div>
        </footer>
      </main>
    </div>
  )
}
