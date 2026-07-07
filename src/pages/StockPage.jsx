import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Nav from '../components/Nav'
import PriceChart from '../components/PriceChart'
import Icon, { TrendArrow } from '../components/Icon'
import { fetchStockQuote, fetchStockSeries } from '../lib/stocksApi'
import { fetchRates } from '../lib/api'
import { formatPrice, formatBig, formatNum, formatPct, trendOf, convertPrice } from '../lib/format'
import { getFavorites, toggleFavorite } from '../lib/favorites'
import { addHolding } from '../lib/portfolio'
import { logActivity } from '../lib/activity'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }

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
    <div className="rounded-xl bg-panel2 border border-line px-3 py-2.5">
      <div className="text-[11px] text-faint">{label}</div>
      <div className="text-sm font-semibold tnum mt-0.5">{value}</div>
    </div>
  )
}

export default function StockPage() {
  const { sym } = useParams()
  const symbol = String(sym || '').toUpperCase()
  const { currency } = useSettings()
  const t = useT()

  const [stock, setStock] = useState(null)
  const [series, setSeries] = useState(null)
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [favs, setFavs] = useState(() => getFavorites())
  const [amount, setAmount] = useState('')
  const [buyPrice, setBuyPrice] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchRates().then((r) => alive && setRates(r)).catch(() => {})
    fetchStockQuote(symbol)
      .then((q) => { if (alive) { setStock(q); setLoading(false); if (q) logActivity('view', q.symbol) } })
      .catch(() => alive && setLoading(false))
    fetchStockSeries(symbol, 90).then((s) => alive && setSeries(s)).catch(() => {})
    return () => { alive = false }
  }, [symbol])

  const isFav = favs.has(symbol)
  const toggleFav = () => setFavs(new Set(toggleFavorite(symbol)))

  // Цена и производные — в валюте юзера (акции котируются в USD)
  const toCur = (usd) => (usd == null ? null : currency === 'usd' || !rates ? usd : convertPrice(usd, 'usd', currency, rates))
  const d = stock?.price_change_percentage_24h
  const tr = trendOf(d)

  const chartData = useMemo(() => {
    if (!series) return null
    return series.map((p) => ({ label: p.t?.slice(5), price: toCur(p.price) }))
  }, [series, rates, currency])

  const range52 = useMemo(() => {
    const w = stock?.fifty_two_week
    if (!w || w.low == null || w.high == null) return null
    const lo = Number(w.low), hi = Number(w.high), cur = stock.current_price
    if (!(hi > lo) || cur == null) return null
    return { lo, hi, pct: Math.max(0, Math.min(100, ((cur - lo) / (hi - lo)) * 100)) }
  }, [stock])

  const addToPortfolio = () => {
    const amt = parseFloat(String(amount).replace(',', '.'))
    if (!stock || isNaN(amt) || amt <= 0) return
    const bp = parseFloat(String(buyPrice).replace(',', '.'))
    // buyPrice юзер вводит в своей валюте → храним в USD
    const bpUsd = !isNaN(bp) && bp > 0 ? (currency === 'usd' || !rates ? bp : convertPrice(bp, currency, 'usd', rates)) : null
    addHolding({ coinId: stock.id, symbol: stock.symbol, image: '', kind: 'stock', amount: amt, buyPriceUsd: bpUsd })
    logActivity('portfolio', `+ ${stock.symbol} ×${amt}`)
    setAmount(''); setBuyPrice('')
  }

  return (
    <div className="min-h-[100dvh] page">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-5">
        <Link to="/?tab=stocks" className="inline-flex items-center gap-1.5 text-sm text-soft hover:text-ink mb-4">
          <Icon name="back" size={16} /> {t('tabStocks')}
        </Link>

        {loading && !stock && (
          <div className="space-y-3">
            <div className="skeleton h-10 w-48 rounded" />
            <div className="skeleton h-64 w-full rounded-2xl" />
          </div>
        )}

        {!loading && !stock && (
          <div className="card rounded-xl p-6 text-center text-soft">{t('stocksEmpty')}</div>
        )}

        {stock && (
          <>
            {/* Шапка */}
            <div className="flex items-start gap-3 mb-5">
              <span className="grid place-items-center w-12 h-12 rounded-2xl bg-brand-soft text-brand-ink text-sm font-bold uppercase shrink-0">
                {stock.symbol.slice(0, 2)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold truncate">{stock.name}</h1>
                  <span className="text-faint text-sm uppercase tnum">{stock.symbol}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                  {stock.exchange && <span className="text-faint">{stock.exchange}</span>}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${stock.is_market_open ? 'bg-up/10 text-up' : 'bg-panel2 text-soft'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${stock.is_market_open ? 'bg-up animate-pulse' : 'bg-faint'}`} />
                    {stock.is_market_open ? t('marketOpen') : t('marketClosed')}
                  </span>
                </div>
              </div>
              <button
                onClick={toggleFav}
                aria-label={t('favorites')}
                className={`grid place-items-center w-10 h-10 rounded-xl transition hover:bg-panel2 ${isFav ? 'text-brand-ink' : 'text-faint hover:text-soft'}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
                  <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
                </svg>
              </button>
            </div>

            {/* Цена */}
            <div className="flex items-end gap-3 mb-5">
              <div className="text-3xl font-bold tnum">{formatPrice(toCur(stock.current_price), currency)}</div>
              <div className={`text-sm font-semibold tnum inline-flex items-center gap-1 mb-1 ${trendColor[tr]}`}>
                <TrendArrow dir={tr} size={11} /> {formatPct(d)}
              </div>
            </div>

            {/* График */}
            <div className="card rounded-2xl p-3 mb-5">
              <PriceChart data={chartData} up={(d ?? 0) >= 0} />
            </div>

            {/* 52-недельный диапазон */}
            {range52 && (
              <section className="mb-6">
                <SectionTitle icon="about">{t('st52w')}</SectionTitle>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-soft tnum">{formatPrice(toCur(range52.lo), currency)}</span>
                  <div className="flex-1 h-2 rounded-full bg-panel2 relative">
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand border-2 border-bg" style={{ left: `calc(${range52.pct}% - 6px)` }} />
                  </div>
                  <span className="text-xs text-soft tnum">{formatPrice(toCur(range52.hi), currency)}</span>
                </div>
              </section>
            )}

            {/* Показатели дня */}
            <section className="mb-6">
              <SectionTitle icon="grid">{t('stDayRange')}</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Stat label={t('stOpen')} value={formatPrice(toCur(stock.open), currency)} />
                <Stat label={t('lblDay') + ' ↑'} value={formatPrice(toCur(stock.high), currency)} />
                <Stat label={t('lblDay') + ' ↓'} value={formatPrice(toCur(stock.low), currency)} />
                <Stat label={t('stPrevClose')} value={formatPrice(toCur(stock.previous_close), currency)} />
                <Stat label={t('lblVol')} value={formatBig(stock.total_volume, '')} />
                <Stat label={t('stExchange')} value={stock.exchange || '—'} />
              </div>
            </section>

            {/* Добавить в портфель (смешанный портфель крипта+акции) */}
            <section className="mb-8">
              <SectionTitle icon="coins">{t('portfolioTitle')}</SectionTitle>
              <div className="flex gap-2">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
                  placeholder={t('portfolioAmount')}
                  className="flex-1 bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60 tnum" />
                <input value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} inputMode="decimal"
                  placeholder={`${t('portfolioBuyPrice')} (${currency.toUpperCase()})`}
                  className="flex-1 min-w-0 bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60 tnum" />
                <button onClick={addToPortfolio} className="px-4 rounded-xl bg-brand text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition">+</button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
