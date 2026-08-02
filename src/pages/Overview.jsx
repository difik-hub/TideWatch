import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import Icon, { TrendArrow } from '../components/Icon'
import TickerLogo from '../components/TickerLogo'
import { fetchMarkets, fetchGlobal, fetchRates } from '../lib/api'
import { fetchStocks } from '../lib/stocksApi'
import { subscribeLive } from '../lib/binanceLive'
import { getPortfolio } from '../lib/portfolio'
import { computeRows, totals as computeTotals } from '../lib/portfolioCalc'
import { buildEvents } from '../lib/events'
import { buildMarketSummary } from '../lib/marketSummary'
import { formatPrice, formatPct, trendOf } from '../lib/format'
import { useSettings } from '../store/settings'
import { useUI } from '../store/ui'
import { useT } from '../i18n/useT'

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }

function MiniRows({ items, currency, owned, hrefOf }) {
  return (
    <div>
      {items.map((c) => {
        const d = c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h
        const tr = trendOf(d)
        return (
          <Link
            key={c.id}
            to={hrefOf(c)}
            className={`flex items-center gap-2 px-2.5 py-1.5 border-b border-line last:border-b-0 hover:bg-panel2 transition ${
              owned.has(c.id) ? 'shadow-[inset_3px_0_0_var(--brand)]' : ''
            }`}
          >
            <TickerLogo src={c.image} symbol={c.symbol} size={18} />
            <span className="text-[12px] font-semibold uppercase tnum min-w-0 flex-1 truncate">{c.symbol}</span>
            <span className="text-[12px] tnum text-soft">{formatPrice(c.current_price, currency)}</span>
            <span className={`text-[11px] font-medium tnum w-14 text-right ${trendColor[tr]}`}>{formatPct(d)}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default function Overview() {
  const { currency, lang } = useSettings()
  const ui = useUI()
  const t = useT()
  const navigate = useNavigate()

  const [coins, setCoins] = useState([])
  const [stocks, setStocks] = useState([])
  const [rates, setRates] = useState(null)
  const [global, setGlobal] = useState(null)
  const [holdings, setHoldings] = useState(() => getPortfolio())
  const [live, setLive] = useState(() => new Map())
  const [news, setNews] = useState([])

  useEffect(() => {
    fetchMarkets(100, 1, currency).then(setCoins).catch(() => {})
    fetchStocks().then(setStocks).catch(() => {})
    fetchRates().then(setRates).catch(() => {})
    fetchGlobal().then(setGlobal).catch(() => {})
    // Новости кешируются на edge, поэтому запрос дешёвый даже на каждый заход
    fetch('/api/news')
      .then((r) => r.json())
      .then((d) => setNews((d.results || []).slice(0, 5)))
      .catch(() => {})
  }, [currency])

  // Портфель мог измениться в панели или на странице актива
  useEffect(() => {
    const sync = () => setHoldings(getPortfolio())
    window.addEventListener('tidewatch:state-changed', sync)
    return () => window.removeEventListener('tidewatch:state-changed', sync)
  }, [])

  useEffect(() => subscribeLive((batch) => {
    setLive((prev) => {
      const next = new Map(prev)
      for (const [sym, price] of batch) next.set(sym, price)
      return next
    })
  }), [])

  // Живые цены Binance подмешиваем в рынок: иначе капитал на главном экране
  // отставал бы от котировок в ленте на минуту.
  const liveCoins = useMemo(() => {
    if (!live.size) return coins
    return coins.map((c) => {
      const p = live.get((c.symbol || '').toUpperCase())
      if (p == null) return c
      const inCur = rates && currency !== 'usd' ? p * (rates[currency]?.value / rates.usd?.value || 1) : p
      return { ...c, current_price: inCur }
    })
  }, [coins, live, rates, currency])

  const byId = useMemo(
    () => Object.fromEntries([...liveCoins, ...stocks].map((c) => [c.id, c])),
    [liveCoins, stocks],
  )
  const rows = useMemo(() => computeRows(holdings, byId, rates, currency), [holdings, byId, rates, currency])
  const tot = useMemo(() => computeTotals(rows), [rows])
  const events = useMemo(() => buildEvents(rows, tot, t), [rows, tot, t])
  const owned = useMemo(() => new Set(holdings.map((h) => h.coinId)), [holdings])

  const summary = buildMarketSummary(global, coins, lang)
  const hasPortfolio = rows.length > 0
  const sorted = useMemo(() => [...rows].sort((a, b) => (b.valueCur || 0) - (a.valueCur || 0)), [rows])

  return (
    <div className="min-h-[100dvh] page">
      <Nav />

      <div className="max-w-[1400px] mx-auto px-4 py-3 grid gap-3 items-start lg:grid-cols-[19rem_minmax(0,1fr)_20rem]">

        {/* ── Капитал ───────────────────────────────────────────── */}
        <aside className="border border-line bg-panel">
          <div className="px-3 py-1.5 border-b border-line text-[10px] uppercase tracking-[0.14em] text-brand-ink font-semibold">
            {t('ovCapital')}
          </div>

          {hasPortfolio ? (
            <>
              <div className="px-3 py-2.5">
                <div className="text-[26px] font-semibold tnum leading-none">
                  {formatPrice(tot.value, currency)}
                </div>
                <div className="text-[11px] tnum text-soft mt-1.5 flex flex-wrap gap-x-3">
                  <span>
                    {t('ovPerDay')}{' '}
                    <span className={trendColor[trendOf(tot.change24)]}>
                      {tot.change24 != null ? formatPct(tot.change24) : '—'}
                    </span>
                  </span>
                  <span>
                    {t('ovAllTime')}{' '}
                    <span className={trendColor[tot.trend]}>
                      {tot.plPct != null ? formatPct(tot.plPct) : '—'}
                    </span>
                  </span>
                </div>

                {/* Доли двух рынков: то, чего нет ни у одного конкурента */}
                <div className="flex h-1.5 mt-2.5">
                  <i className="block bg-brand" style={{ width: `${tot.cryptoShare}%` }} />
                  <i className="block bg-faint" style={{ width: `${tot.stockShare}%` }} />
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px] text-soft tnum">
                  <span><i className="inline-block w-1.5 h-1.5 bg-brand mr-1" />{t('tabCrypto')} {Math.round(tot.cryptoShare)}%</span>
                  <span><i className="inline-block w-1.5 h-1.5 bg-faint mr-1" />{t('tabStocks')} {Math.round(tot.stockShare)}%</span>
                </div>
              </div>

              <div>
                {sorted.map((r) => (
                  <div key={r.h.id} className="px-3 py-1.5 border-t border-line grid grid-cols-[1fr_auto] gap-x-2 text-[12px] tnum">
                    <span className="font-semibold uppercase">
                      {r.c?.symbol || r.h.symbol || r.h.coinId}
                      <span className="ml-1.5 text-[9px] uppercase tracking-wider text-faint border border-line px-1">
                        {r.kind === 'stock' ? t('tabStocks') : t('tabCrypto')}
                      </span>
                    </span>
                    <span>{r.valueCur != null ? formatPrice(r.valueCur, currency) : '—'}</span>
                    <span className="text-[10px] text-faint">
                      {r.h.amount} {t('ovPcs')}
                      {r.h.buyPriceUsd ? ` · ${t('ovAvg')} ${formatPrice(r.h.buyPriceUsd, 'usd')}` : ''}
                    </span>
                    <span className={`text-[10px] ${trendColor[trendOf(r.plPct)]}`}>
                      {r.plPct != null ? formatPct(r.plPct) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Пустой экран — не заглушка, а объяснение выгоды и один шаг к ней */
            <div className="px-3 py-4 text-[13px] text-soft leading-relaxed">
              {t('ovEmpty')}
            </div>
          )}

          <div className="p-2 border-t border-line">
            <button
              onClick={() => ui.openPortfolio()}
              className="w-full py-2 bg-brand text-white text-[11px] font-bold uppercase tracking-[0.08em] hover:opacity-90 active:translate-y-px transition"
            >
              {hasPortfolio ? t('ovManage') : t('ovAddFirst')}
            </button>
          </div>
        </aside>

        {/* ── События ───────────────────────────────────────────── */}
        <main className="min-w-0 flex flex-col gap-3">
          <section className="border border-line bg-panel">
            <div className="px-3 py-1.5 border-b border-line text-[10px] uppercase tracking-[0.14em] text-faint flex justify-between">
              <span>{t('ovEvents')}</span>
              <span>{t('per24h')}</span>
            </div>
            {events.length > 0 ? (
              <div>
                {events.map((e) => (
                  <div key={e.id} className="px-3 py-2 border-b border-line last:border-b-0 flex gap-2.5">
                    <span className={`mt-1.5 w-1.5 h-1.5 shrink-0 ${
                      e.kind === 'alert' ? 'bg-brand' : e.kind === 'up' ? 'bg-up' : 'bg-down'
                    }`} />
                    <span className="min-w-0">
                      <span className="block text-[13px] leading-snug">{e.title}</span>
                      <span className="block text-[11px] text-faint leading-snug">{e.note}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-4 text-[13px] text-soft">{t('ovEventsEmpty')}</div>
            )}
          </section>

          {summary && (
            <section className="border border-line bg-panel">
              <div className="px-3 py-1.5 border-b border-line text-[10px] uppercase tracking-[0.14em] text-faint">
                {t('marketNow')}
              </div>
              <p className="px-3 py-2 text-[13px] leading-relaxed text-soft">{summary}</p>
            </section>
          )}

          {news.length > 0 && (
            <section className="border border-line bg-panel">
              <div className="px-3 py-1.5 border-b border-line text-[10px] uppercase tracking-[0.14em] text-faint flex justify-between">
                <span>{t('newsMarket')}</span>
                <Link to="/news" className="text-brand-ink hover:underline">{t('ovAll')}</Link>
              </div>
              {news.map((n) => (
                <a
                  key={n.url}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-1.5 border-b border-line last:border-b-0 hover:bg-panel2 transition"
                >
                  <span className="block text-[13px] leading-snug">{n.title}</span>
                  <span className="block text-[10px] text-faint tnum mt-0.5">
                    {n.source_name} · {new Date(n.published_at).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </a>
              ))}
            </section>
          )}
        </main>

        {/* ── Рынки ─────────────────────────────────────────────── */}
        <aside className="border border-line bg-panel">
          <div className="px-3 py-1.5 border-b border-line text-[10px] uppercase tracking-[0.14em] text-faint flex justify-between">
            <span>{t('tabCrypto')}</span>
            <Link to="/markets" className="text-brand-ink hover:underline">{t('ovAll')}</Link>
          </div>
          <MiniRows items={liveCoins.slice(0, 8)} currency={currency} owned={owned} hrefOf={(c) => `/coin/${c.id}`} />

          <div className="px-3 py-1.5 border-y border-line text-[10px] uppercase tracking-[0.14em] text-faint flex justify-between">
            <span>{t('tabStocks')}</span>
            <Link to="/markets?tab=stocks" className="text-brand-ink hover:underline">{t('ovAll')}</Link>
          </div>
          <MiniRows items={stocks.slice(0, 6)} currency="usd" owned={owned} hrefOf={(c) => c.href ?? `/stock/${c.symbol?.toUpperCase()}`} />

          <div className="p-2 border-t border-line">
            <button
              onClick={() => navigate('/markets')}
              className="w-full py-2 border border-line text-[11px] font-semibold uppercase tracking-[0.08em] text-soft hover:text-ink hover:border-line-strong transition"
            >
              {t('ovOpenMarkets')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
