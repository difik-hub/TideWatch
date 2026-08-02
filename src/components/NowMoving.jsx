import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendArrow } from './Icon'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { formatPrice, formatPct, trendOf } from '../lib/format'

// Горизонтальная лента «всплесков» — монеты с самым резким движением за 1 час.
export default function NowMoving({ coins }) {
  const { currency } = useSettings()
  const t = useT()

  const movers = useMemo(() => {
    return [...coins]
      .filter((c) => c.price_change_percentage_1h_in_currency != null)
      .sort((a, b) => Math.abs(b.price_change_percentage_1h_in_currency) - Math.abs(a.price_change_percentage_1h_in_currency))
      .slice(0, 12)
  }, [coins])

  if (movers.length < 4) return null

  // Строка-тикер вместо ряда карточек: та же информация занимает 28 пикселей
  // вместо блока в треть экрана, поэтому лента начинается сразу под ней.
  return (
    <div className="flex items-stretch border border-line bg-panel mb-1.5 overflow-hidden">
      <span className="hidden sm:flex items-center gap-1.5 px-2.5 text-[9px] uppercase tracking-[0.12em] text-faint border-r border-line shrink-0">
        <span className="w-1 h-1 rounded-full bg-up pulse-dot" />
        {t('nowMoving')}
      </span>
      <div className="flex gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {movers.map((c) => {
          const d = c.price_change_percentage_1h_in_currency
          const tr = trendOf(d)
          return (
            <Link
              key={c.id}
              to={`/coin/${c.id}`}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 border-r border-line hover:bg-panel2 transition"
            >
              <img src={c.image} alt="" className="w-4 h-4 rounded-full" loading="lazy" />
              <span className="text-[11px] font-semibold uppercase tnum">{c.symbol}</span>
              <span className="text-[11px] text-soft tnum">{formatPrice(c.current_price, currency)}</span>
              <span className={`text-[11px] font-medium tnum inline-flex items-center gap-0.5 ${tr === 'rise' ? 'text-up' : tr === 'fall' ? 'text-down' : 'text-soft'}`}>
                <TrendArrow dir={tr} size={7} />{formatPct(d)}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
