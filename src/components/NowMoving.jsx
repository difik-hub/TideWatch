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

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold text-soft uppercase tracking-wide mb-2.5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-up pulse-dot" />
        {t('nowMoving')}
        <span className="text-faint normal-case font-normal">· {t('movingHint')}</span>
      </h2>
      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {movers.map((c) => {
          const d = c.price_change_percentage_1h_in_currency
          const tr = trendOf(d)
          return (
            <Link
              key={c.id}
              to={`/coin/${c.id}`}
              className="card-link shrink-0 w-36 rounded-xl p-3"
            >
              <div className="flex items-center gap-2">
                <img src={c.image} alt="" className="w-6 h-6 rounded-full" loading="lazy" />
                <span className="text-[12px] font-medium uppercase tnum truncate">{c.symbol}</span>
              </div>
              <div className="mt-2 text-[14px] font-semibold tnum">{formatPrice(c.current_price, currency)}</div>
              <div className={`mt-0.5 text-[12px] font-medium tnum inline-flex items-center gap-0.5 ${tr === 'rise' ? 'text-up' : tr === 'fall' ? 'text-down' : 'text-soft'}`}>
                <TrendArrow dir={tr} size={8} /> {formatPct(d)} · 1ч
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
