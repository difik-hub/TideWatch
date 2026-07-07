import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TickerLogo from './TickerLogo'
import { fetchMarkets } from '../lib/api'
import { fetchStocks } from '../lib/stocksApi'
import { formatPrice, formatPct, trendOf } from '../lib/format'
import { useT } from '../i18n/useT'

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }
const MODES = ['gainers', 'losers', 'cap']

// Кросс-рыночная боковина: на вкладке крипты показывает топ АКЦИЙ, на акциях —
// топ КРИПТЫ. Заполняет пустой левый гуттер на широких экранах (min-[1500px]).
// Усиливает видение «оба рынка разом». На узких экранах скрыта (лейаут не ломает).
export default function CrossMarketRail({ tab }) {
  const t = useT()
  const other = tab === 'crypto' ? 'stocks' : 'crypto'
  const [list, setList] = useState([])
  const [mode, setMode] = useState('gainers')

  useEffect(() => {
    let alive = true
    const load = other === 'stocks'
      ? fetchStocks()
      : fetchMarkets(20, 1, 'usd')
    load.then((d) => alive && setList(Array.isArray(d) ? d : [])).catch(() => {})
    return () => { alive = false }
  }, [other])

  const rows = useMemo(() => {
    const d = (c) => c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? 0
    const sorted = [...list].sort((a, b) => {
      if (mode === 'gainers') return d(b) - d(a)
      if (mode === 'losers') return d(a) - d(b)
      return (a.market_cap_rank || 9999) - (b.market_cap_rank || 9999)
    })
    return sorted.slice(0, 9)
  }, [list, mode])

  if (rows.length === 0) return null

  const modeLabel = { gainers: t('topGainers'), losers: t('topLosers'), cap: t('byCap') }

  return (
    <aside className="hidden min-[1560px]:flex flex-col fixed top-1/2 -translate-y-1/2 left-[calc((100vw-64rem)/2-272px)] w-[252px] max-h-[calc(100dvh-9rem)] z-30
                      rounded-2xl border border-line bg-panel/85 backdrop-blur p-3 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between px-0.5 mb-0.5">
        <span className="text-[15px] font-bold text-ink">
          {other === 'stocks' ? t('tabStocks') : t('tabCrypto')}
        </span>
        <span className="text-[11px] text-faint">{modeLabel[mode]}</span>
      </div>
      <div className="text-[11px] text-faint px-0.5 mb-2.5">{t('crossHint')}</div>

      {/* Переключатель режима */}
      <div className="flex gap-1.5 mb-2.5">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition ${mode === m ? 'bg-brand-soft text-brand-ink' : 'bg-panel2 text-faint hover:text-soft'}`}
          >
            {m === 'gainers' ? '↑' : m === 'losers' ? '↓' : '#'}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto -mr-1.5 pr-1.5 [scrollbar-width:thin]">
        {rows.map((c) => {
          const d = c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h
          const tr = trendOf(d)
          return (
            <Link
              key={c.id}
              to={c.href ?? `/coin/${c.id}`}
              className="flex items-center gap-2.5 px-1.5 py-2 rounded-xl hover:bg-panel2 transition"
            >
              <TickerLogo src={c.image} symbol={c.symbol} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold uppercase truncate leading-tight">{c.symbol}</span>
                <span className="block text-[11px] text-faint tnum leading-tight mt-0.5">{formatPrice(c.current_price, 'usd')}</span>
              </span>
              <span className={`text-[12px] font-bold tnum shrink-0 ${trendColor[tr]}`}>{formatPct(d)}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
