import { memo } from 'react'
import { Link } from 'react-router-dom'
import Sparkline from './Sparkline'
import AnimatedNumber from './AnimatedNumber'
import Icon, { TrendArrow } from './Icon'
import { useSettings } from '../store/settings'
import { useUI } from '../store/ui'
import { useT } from '../i18n/useT'
import { formatPrice, formatBig, formatNum, formatPct, trendOf, convertPrice } from '../lib/format'
import { shortVibe } from '../lib/summary'

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }
const ALL_CUR = ['usd', 'eur', 'rub']

function Pct({ label, value }) {
  const tr = trendOf(value)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-faint text-[11px]">{label}</span>
      <span className={`inline-flex items-center gap-0.5 text-[13px] font-medium tnum ${trendColor[tr]}`}>
        <TrendArrow dir={tr} size={9} />
        {formatPct(value)}
      </span>
    </span>
  )
}

// Бейдж «обгоняет / слабее рынка» — сравнение динамики монеты со средним по топу
function MarketBadge({ d24, median, t }) {
  if (d24 == null || median == null) return null
  const delta = d24 - median
  let key, tr
  if (delta > 0.3) { key = 'cmpOut'; tr = 'rise' }
  else if (delta < -0.3) { key = 'cmpUnder'; tr = 'fall' }
  else { key = 'cmpEven'; tr = 'flat' }
  const sign = delta > 0 ? '+' : ''
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-panel2 ${trendColor[tr]}`}>
      <TrendArrow dir={tr} size={8} />
      {t(key)}
      <span className="text-faint tnum">{sign}{delta.toFixed(1)}pp</span>
    </span>
  )
}

function CoinCard({ coin, isFav, onToggleFav, index = 0, rates, marketMedian }) {
  const { currency, lang, sparklines } = useSettings()
  const ui = useUI()
  const t = useT()

  const d1 = coin.price_change_percentage_1h_in_currency
  const d24 = coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h
  const d7 = coin.price_change_percentage_7d_in_currency
  const spark = coin.sparkline_in_7d?.price
  const up = spark && spark.length > 1 ? spark[spark.length - 1] >= spark[0] : (d24 ?? 0) >= 0

  const shareCoin = async (e) => {
    e.preventDefault()
    const url = `${window.location.origin}/coin/${coin.id}`
    if (navigator.share) { try { await navigator.share({ title: coin.name, url }) } catch { /* отмена */ } }
    else { try { await navigator.clipboard.writeText(url) } catch { /* нет clipboard */ } }
  }

  // Цена в трёх валютах (через курсы). Без курсов — только выбранная валюта.
  const prices = rates
    ? ALL_CUR.map((cur) => ({ cur, value: convertPrice(coin.current_price, currency, cur, rates) }))
    : [{ cur: currency, value: coin.current_price }]

  return (
    <Link
      to={`/coin/${coin.id}`}
      className="card-link rise-in group block rounded-xl p-4 overflow-hidden"
      style={{ animationDelay: `${Math.min(index * 24, 360)}ms` }}
    >
      <div className="flex items-center gap-3">
        <img src={coin.image} alt={coin.name} className="w-9 h-9 rounded-full" loading="lazy" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{coin.name}</span>
            <span className="text-faint text-[11px] uppercase tnum">{coin.symbol}</span>
            <span className="text-faint text-[11px] tnum">#{coin.market_cap_rank}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <MarketBadge d24={d24} median={marketMedian} t={t} />
            <span className="text-soft text-[12px] first-letter:uppercase">{shortVibe(coin, lang)}</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {/* Мини-действия — появляются по наведению */}
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              onClick={(e) => { e.preventDefault(); ui.openAlerts(coin.id) }}
              aria-label={t('alertAdd')}
              className="grid place-items-center w-8 h-8 rounded-lg text-faint hover:text-brand-ink hover:bg-panel2 transition"
            >
              <Icon name="bell" size={16} />
            </button>
            <button
              onClick={shareCoin}
              aria-label={t('share')}
              className="grid place-items-center w-8 h-8 rounded-lg text-faint hover:text-brand-ink hover:bg-panel2 transition"
            >
              <Icon name="share" size={15} />
            </button>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); onToggleFav(coin.id) }}
            aria-label={t('favorites')}
            className={`grid place-items-center w-8 h-8 rounded-lg transition hover:bg-panel2 ${
              isFav ? 'text-brand-ink' : 'text-faint hover:text-soft'
            }`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Цены в трёх валютах — равнозначно */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {prices.map((p, i) => (
          <div key={p.cur}>
            <div className="text-[10px] uppercase tracking-wide text-faint">{p.cur}</div>
            {i === 0 ? (
              <AnimatedNumber
                value={p.value}
                format={(n) => formatPrice(n, p.cur)}
                className="text-[16px] font-semibold tnum tracking-tight leading-tight inline-block"
              />
            ) : (
              <div className="text-[16px] font-semibold tnum tracking-tight leading-tight">{formatPrice(p.value, p.cur)}</div>
            )}
          </div>
        ))}
      </div>

      {/* Динамика: 1ч / 24ч / 7д */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {d1 != null && <Pct label={t('lblHour')} value={d1} />}
        <Pct label={t('lblDay')} value={d24} />
        <Pct label={t('lblWeek')} value={d7} />
      </div>

      {/* Крупный график во всю ширину */}
      {sparklines && spark && (
        <div className="mt-3 -mx-1">
          <Sparkline data={spark} height={52} color={up ? 'var(--up)' : 'var(--down)'} />
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-line space-y-1 text-[11px] text-soft tnum">
        <div className="flex justify-between">
          <span>{t('lblVol')} {formatBig(coin.total_volume, currency)}</span>
          <span>{t('lblCap')} {formatBig(coin.market_cap, currency)}</span>
        </div>
        {coin.circulating_supply != null && (
          <div className="flex justify-between text-faint">
            <span>{t('stCirc')} {formatNum(coin.circulating_supply)} {coin.symbol?.toUpperCase()}</span>
            {coin.total_supply ? <span>/ {formatNum(coin.total_supply)}</span> : null}
          </div>
        )}
      </div>
    </Link>
  )
}

// memo: не перересовывать все карточки при поиске/смене избранного/обновлении
export default memo(CoinCard)
