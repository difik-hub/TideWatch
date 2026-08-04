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

  // Панель живёт в потоке отдельной колонкой, а не плавает поверх: при fixed её
  // позиция считалась от ширины контента и наезжала на ленту, стоило контейнеру
  // стать шире. Sticky держит её на месте при прокрутке.
  return (
    <aside className="hidden xl:flex flex-col shrink-0 w-[228px] sticky top-3 self-start max-h-[calc(100dvh-2rem)] border border-line bg-panel">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-line">
        <span className="text-[12px] font-bold text-ink truncate">
          {other === 'stocks' ? t('tabStocks') : t('tabCrypto')}
        </span>
        <span className="text-[10px] text-faint truncate">{t('crossHint')}</span>
      </div>

      {/* Переключатель режима */}
      <div className="flex border-b border-line">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            title={modeLabel[m]}
            className={`flex-1 py-1 text-[12px] font-semibold transition border-r border-line last:border-r-0 ${mode === m ? 'bg-brand text-brand-on' : 'text-faint hover:text-soft'}`}
          >
            {m === 'gainers' ? '↑' : m === 'losers' ? '↓' : '#'}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto [scrollbar-width:thin]">
        {rows.map((c) => {
          const d = c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h
          const tr = trendOf(d)
          return (
            <Link
              key={c.id}
              to={c.href ?? `/coin/${c.id}`}
              className="flex items-center gap-2 px-2.5 py-1.5 border-b border-line last:border-b-0 hover:bg-panel2 transition"
            >
              <TickerLogo src={c.image} symbol={c.symbol} size={20} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold uppercase truncate leading-tight">{c.symbol}</span>
                <span className="block text-[10px] text-faint tnum leading-tight">{formatPrice(c.current_price, 'usd')}</span>
              </span>
              <span className={`text-[11px] font-bold tnum shrink-0 ${trendColor[tr]}`}>{formatPct(d)}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
