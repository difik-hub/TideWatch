import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Treemap, ResponsiveContainer } from 'recharts'
import Nav from '../components/Nav'
import Icon from '../components/Icon'
import { fetchMarkets } from '../lib/api'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { formatPct } from '../lib/format'

// Линейная интерполяция двух hex-цветов
function mix(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)]
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)]
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

// Цвет плитки: нейтральная зона у нуля, дальше зелёный/красный по силе
function tileColor(change) {
  if (change == null) return '#2b3340'
  const a = Math.abs(change)
  if (a < 0.2) return '#2f3945'
  const m = Math.min((a - 0.2) / 6, 1)
  return change > 0 ? mix('#1e4a3b', '#16c784', m) : mix('#4a2330', '#f6465d', m)
}

function makeContent(navigate, hoveredId, setHoveredId) {
  return function TreeNode(props) {
    const { x, y, width, height, symbol, change, id } = props
    if (width <= 0 || height <= 0) return null
    const pad = 3
    const w = Math.max(width - pad, 0)
    const h = Math.max(height - pad, 0)
    const hovered = id && id === hoveredId
    const showSym = w > 38 && h > 22
    const showPct = w > 54 && h > 40
    const fs = Math.max(11, Math.min(18, Math.round(w / 6)))

    return (
      <g
        style={{ cursor: 'pointer' }}
        onClick={() => id && navigate(`/coin/${id}`)}
        onMouseEnter={() => id && setHoveredId(id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <rect
          x={x + pad / 2} y={y + pad / 2} width={w} height={h} rx={7}
          fill={tileColor(change)}
          stroke={hovered ? 'rgba(255,255,255,0.9)' : 'transparent'}
          strokeWidth={hovered ? 2 : 0}
        />
        {hovered && <rect x={x + pad / 2} y={y + pad / 2} width={w} height={h} rx={7} fill="rgba(255,255,255,0.08)" />}
        {showSym && (
          <text
            x={x + 10} y={y + 12 + fs} fontSize={fs} fontWeight={700}
            fill="#fff" stroke="rgba(0,0,0,0.5)" strokeWidth={3.5} paintOrder="stroke"
            style={{ pointerEvents: 'none', fontFamily: 'var(--font-display)' }}
          >
            {symbol}
          </text>
        )}
        {showPct && (
          <text
            x={x + 10} y={y + 12 + fs + 18} fontSize={13} fontWeight={600}
            fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.45)" strokeWidth={2.5} paintOrder="stroke"
            style={{ pointerEvents: 'none' }}
          >
            {formatPct(change)}
          </text>
        )}
      </g>
    )
  }
}

export default function Heatmap() {
  const { currency, coinCount } = useSettings()
  const t = useT()
  const navigate = useNavigate()
  const [coins, setCoins] = useState([])
  const [hoveredId, setHoveredId] = useState(null)

  useEffect(() => {
    fetchMarkets(Math.max(coinCount, 50), 1, currency).then(setCoins).catch(() => {})
  }, [currency, coinCount])

  // sqrt-демпфирование размера, чтобы BTC не занимал пол-карты → плитки сбалансированы
  const data = useMemo(
    () =>
      coins.slice(0, 40).map((c) => ({
        symbol: c.symbol?.toUpperCase(),
        id: c.id,
        size: Math.sqrt(Math.max(c.market_cap || 1, 1)),
        change: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h,
      })),
    [coins],
  )

  return (
    <div className="min-h-[100dvh] page">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-soft hover:text-ink text-sm mb-4 transition">
          <Icon name="back" size={16} /> {t('back')}
        </Link>

        <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight mb-1 flex items-center gap-2">
              <Icon name="grid" size={20} className="text-brand-ink" /> {t('heatmapTitle')}
            </h1>
            <p className="text-soft text-sm">{t('heatmapHint')}</p>
          </div>
          {/* Легенда цветовой шкалы */}
          <div className="flex items-center gap-2 text-[11px] text-soft">
            <span className="text-down">−</span>
            <span className="h-2.5 w-40 rounded-full" style={{ background: 'linear-gradient(90deg, #f6465d, #4a2330, #2f3945, #1e4a3b, #16c784)' }} />
            <span className="text-up">+</span>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="text-soft text-center py-16">…</div>
        ) : (
          <div className="rounded-2xl overflow-hidden bg-panel/40 p-1" style={{ height: 'min(72vh, 640px)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={data}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="transparent"
                content={makeContent(navigate, hoveredId, setHoveredId)}
                isAnimationActive={false}
              />
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  )
}
