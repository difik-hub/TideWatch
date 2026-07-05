import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { formatPrice, formatPct, trendOf } from '../lib/format'
import { getRecentlyViewed } from '../lib/activity'

// Стрип недавно просмотренных монет (из лога активности).
export default function RecentlyViewed({ coins }) {
  const { currency } = useSettings()
  const t = useT()
  const [ids, setIds] = useState(() => getRecentlyViewed())

  useEffect(() => {
    const h = () => setIds(getRecentlyViewed())
    window.addEventListener('tidewatch:activity', h)
    return () => window.removeEventListener('tidewatch:activity', h)
  }, [])

  const byId = useMemo(() => Object.fromEntries(coins.map((c) => [c.id, c])), [coins])
  const items = ids.map((id) => byId[id]).filter(Boolean).slice(0, 10)

  if (items.length < 2) return null

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold text-soft uppercase tracking-wide mb-2.5">{t('recentlyViewed')}</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((c) => {
          const d = c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h
          const tr = trendOf(d)
          return (
            <Link key={c.id} to={`/coin/${c.id}`} className="card-link shrink-0 flex items-center gap-2 rounded-xl px-3 py-2">
              <img src={c.image} alt="" className="w-6 h-6 rounded-full" loading="lazy" />
              <div className="leading-tight">
                <div className="text-[12px] font-medium uppercase tnum">{c.symbol}</div>
                <div className="text-[11px] text-soft tnum">{formatPrice(c.current_price, currency)}</div>
              </div>
              <span className={`text-[11px] font-medium tnum ${tr === 'rise' ? 'text-up' : tr === 'fall' ? 'text-down' : 'text-soft'}`}>
                {formatPct(d)}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
