import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import Sparkline from '../components/Sparkline'
import Icon, { TrendArrow } from '../components/Icon'
import { fetchMarkets } from '../lib/api'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { formatPrice, formatBig, formatPct, trendOf } from '../lib/format'

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }

function Pct({ v }) {
  const tr = trendOf(v)
  return (
    <span className={`inline-flex items-center gap-0.5 tnum ${trendColor[tr]}`}>
      <TrendArrow dir={tr} size={9} />{formatPct(v)}
    </span>
  )
}

export default function Compare() {
  const { currency, coinCount } = useSettings()
  const t = useT()
  const [coins, setCoins] = useState([])
  const [picks, setPicks] = useState(['bitcoin', 'ethereum'])

  useEffect(() => {
    fetchMarkets(Math.max(coinCount, 100), 1, currency).then(setCoins).catch(() => {})
  }, [currency, coinCount])

  const byId = useMemo(() => Object.fromEntries(coins.map((c) => [c.id, c])), [coins])
  const selected = picks.map((id) => byId[id]).filter(Boolean)

  const setPick = (i, id) => setPicks((p) => p.map((v, idx) => (idx === i ? id : v)))
  const addCol = () => picks.length < 3 && setPicks((p) => [...p, coins.find((c) => !p.includes(c.id))?.id || 'tether'])
  const removeCol = (i) => picks.length > 1 && setPicks((p) => p.filter((_, idx) => idx !== i))

  const rows = [
    { label: t('lblCap'), get: (c) => formatBig(c.market_cap, currency) },
    { label: t('stVolume'), get: (c) => formatBig(c.total_volume, currency) },
    { label: t('lblDay'), get: (c) => <Pct v={c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h} /> },
    { label: t('lblWeek'), get: (c) => <Pct v={c.price_change_percentage_7d_in_currency} /> },
    { label: '30d', get: (c) => <Pct v={c.price_change_percentage_30d_in_currency} /> },
    { label: t('stAth'), get: (c) => formatPrice(c.ath, currency) },
    { label: t('rank'), get: (c) => `#${c.market_cap_rank}` },
  ]

  return (
    <div className="min-h-[100dvh] page">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-soft hover:text-ink text-sm mb-4 transition">
          <Icon name="back" size={16} /> {t('back')}
        </Link>
        <h1 className="text-xl font-semibold tracking-tight mb-5 flex items-center gap-2">
          <Icon name="compare" size={20} className="text-brand-ink" /> {t('cmpTitle')}
        </h1>

        {coins.length === 0 ? (
          <div className="text-soft text-center py-12">…</div>
        ) : (
          <div className="card rounded-2xl overflow-hidden">
            {/* Заголовки колонок: выбор монет */}
            <div className="grid border-b border-line" style={{ gridTemplateColumns: `120px repeat(${selected.length}, 1fr)` }}>
              <div className="p-3" />
              {selected.map((c, i) => (
                <div key={c.id} className="p-3 border-l border-line">
                  <div className="flex items-start justify-between gap-1">
                    <img src={c.image} alt="" className="w-8 h-8 rounded-full" />
                    {picks.length > 1 && (
                      <button onClick={() => removeCol(i)} className="text-faint hover:text-down" aria-label="x">
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>
                  <select
                    value={c.id}
                    onChange={(e) => setPick(i, e.target.value)}
                    className="mt-2 w-full bg-panel2 border border-line rounded-lg px-2 py-1.5 text-xs outline-none focus:border-brand/60"
                  >
                    {coins.slice(0, 100).map((o) => (
                      <option key={o.id} value={o.id}>{o.symbol.toUpperCase()}</option>
                    ))}
                  </select>
                  <div className="mt-2 text-sm font-semibold tnum">{formatPrice(c.current_price, currency)}</div>
                  <div className="mt-2"><Sparkline data={c.sparkline_in_7d?.price} height={36} /></div>
                </div>
              ))}
            </div>

            {/* Метрики */}
            {rows.map((row) => (
              <div key={row.label} className="grid border-b border-line last:border-0" style={{ gridTemplateColumns: `120px repeat(${selected.length}, 1fr)` }}>
                <div className="p-3 text-xs text-soft">{row.label}</div>
                {selected.map((c) => (
                  <div key={c.id} className="p-3 border-l border-line text-sm tnum">{row.get(c)}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {picks.length < 3 && coins.length > 0 && (
          <button
            onClick={addCol}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-line bg-panel text-soft hover:text-ink text-sm transition"
          >
            <Icon name="arrowUpRight" size={15} /> {t('cmpAddCoin')}
          </button>
        )}
      </main>
    </div>
  )
}
