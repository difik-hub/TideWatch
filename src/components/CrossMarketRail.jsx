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
    return sorted.slice(0, 8)
  }, [list, mode])

  if (rows.length === 0) return null

  const modeLabel = { gainers: t('topGainers'), losers: t('topLosers'), cap: t('byCap') }

  return (
    <aside className="hidden min-[1500px]:flex flex-col fixed top-24 left-[calc((100vw-64rem)/2-224px)] w-[208px] max-h-[calc(100dvh-8rem)] z-30
                      rounded-2xl border border-line bg-panel/80 backdrop-blur p-2.5 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[12px] font-semibold text-ink">
          {other === 'stocks' ? t('tabStocks') : t('tabCrypto')}
        </span>
        <span className="text-[10px] text-faint">{modeLabel[mode]}</span>
      </div>

      {/* Переключатель режима */}
      <div className="flex gap-1 mb-2">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition ${mode === m ? 'bg-brand-soft text-brand-ink' : 'bg-panel2 text-faint hover:text-soft'}`}
          >
            {m === 'gainers' ? '↑' : m === 'losers' ? '↓' : '#'}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto -mr-1 pr-1 [scrollbar-width:thin]">
        {rows.map((c) => {
          const d = c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h
          const tr = trendOf(d)
          return (
            <Link
              key={c.id}
              to={c.href ?? `/coin/${c.id}`}
              className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-panel2 transition"
            >
              <TickerLogo src={c.image} symbol={c.symbol} size={20} />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium uppercase truncate leading-tight">{c.symbol}</span>
                <span className="block text-[10px] text-faint tnum leading-tight">{formatPrice(c.current_price, 'usd')}</span>
              </span>
              <span className={`text-[10px] font-semibold tnum shrink-0 ${trendColor[tr]}`}>{formatPct(d)}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
