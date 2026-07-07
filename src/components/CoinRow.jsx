import { memo } from 'react'
import { Link } from 'react-router-dom'
import Sparkline from './Sparkline'
import LivePrice from './LivePrice'
import TickerLogo from './TickerLogo'
import { TrendArrow } from './Icon'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { formatPrice, formatBig, formatPct, trendOf, convertPrice } from '../lib/format'

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }

function Pct({ value }) {
  const tr = trendOf(value)
  return (
    <span className={`inline-flex items-center justify-end gap-0.5 tnum text-[13px] font-medium ${trendColor[tr]}`}>
      <TrendArrow dir={tr} size={8} />
      {formatPct(value)}
    </span>
  )
}

// Компактная строка монеты (табличный вид как у больших трекеров):
// вся ключевая инфа сканируется глазом, 10+ монет на экране.
function CoinRow({ coin, isFav, onToggleFav, rates, livePrice = null }) {
  const { currency } = useSettings()
  const t = useT()

  const d24 = coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h
  const d7 = coin.price_change_percentage_7d_in_currency
  const spark = coin.sparkline_in_7d?.price
  const up = spark && spark.length > 1 ? spark[spark.length - 1] >= spark[0] : (d24 ?? 0) >= 0

  // Акции всегда в USD → конвертируем при другой валюте. Крипта уже в нужной
  // валюте (из API), а live-цена из Binance — в USD.
  const price = coin.kind === 'stock'
    ? (currency === 'usd' || !rates ? coin.current_price : convertPrice(coin.current_price, 'usd', currency, rates))
    : livePrice != null && rates
      ? convertPrice(livePrice, 'usd', currency, rates)
      : livePrice != null && currency === 'usd'
        ? livePrice
        : coin.current_price

  return (
    <Link
      to={coin.href ?? `/coin/${coin.id}`}
      className="grid items-center gap-2 px-3 py-2.5 border-b border-line last:border-0 hover:bg-panel2/60 transition
                 grid-cols-[28px_minmax(0,1fr)_auto_72px_34px]
                 sm:grid-cols-[36px_minmax(0,1.4fr)_auto_76px_76px_90px_96px_34px]"
    >
      {/* Ранг */}
      <span className="text-faint text-[11px] tnum">{coin.market_cap_rank}</span>

      {/* Монета */}
      <span className="flex items-center gap-2 min-w-0">
        <TickerLogo src={coin.image} symbol={coin.symbol} size={24} />
        <span className="min-w-0">
          <span className="block text-[13px] font-medium truncate leading-tight">{coin.name}</span>
          <span className="block text-[10px] text-faint uppercase tnum leading-tight">{coin.symbol}</span>
        </span>
      </span>

      {/* Цена (live) */}
      <LivePrice
        value={price}
        format={(n) => formatPrice(n, currency)}
        className="text-[13px] font-semibold tnum text-right justify-self-end"
      />

      {/* 24ч */}
      <span className="text-right"><Pct value={d24} /></span>

      {/* 7д — только на десктопе */}
      <span className="text-right hidden sm:block"><Pct value={d7} /></span>

      {/* Капа — только на десктопе */}
      <span className="text-right hidden sm:block text-[12px] text-soft tnum">{formatBig(coin.market_cap, currency)}</span>

      {/* Спарклайн — только на десктопе */}
      <span className="hidden sm:block opacity-80">
        <Sparkline data={spark} width={90} height={28} fluid={false} color={up ? 'var(--up)' : 'var(--down)'} />
      </span>

      {/* Избранное */}
      <button
        onClick={(e) => { e.preventDefault(); onToggleFav(coin.id) }}
        aria-label={t('favorites')}
        className={`grid place-items-center w-7 h-7 rounded-lg transition hover:bg-panel ${isFav ? 'text-brand-ink' : 'text-faint hover:text-soft'}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
        </svg>
      </button>
    </Link>
  )
}

export default memo(CoinRow)
