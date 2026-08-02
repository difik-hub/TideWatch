import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { formatBig, formatPct, trendOf } from '../lib/format'
import { buildMarketSummary } from '../lib/marketSummary'
import { TrendArrow } from './Icon'
import InfoTip from './InfoTip'
import FearGreed from './FearGreed'

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }

// Ячейка полосы: подпись сверху мелким, значение снизу. Всё в одну строку высоты,
// чтобы шапка рынка занимала полосу, а не половину первого экрана.
function Metric({ label, value, trend, arrow, tip }) {
  return (
    <div className="px-3 py-1.5 border-r border-line last:border-r-0 min-w-0">
      <div className="text-[9px] uppercase tracking-[0.12em] text-faint flex items-center gap-1 truncate">
        {label}{tip && <InfoTip text={tip} />}
      </div>
      <div className={`text-[13px] font-semibold tnum flex items-center gap-1 leading-tight ${trend ? trendColor[trend] : 'text-ink'}`}>
        {arrow && trend && <TrendArrow dir={trend} size={9} />}
        {value}
      </div>
    </div>
  )
}

export default function Hero({ global, coins }) {
  const { currency, lang } = useSettings()
  const t = useT()

  const marketSummary = buildMarketSummary(global, coins, lang)

  const mcap = global?.total_market_cap?.usd != null ? global.total_market_cap[currency] : null
  const mcapChange = global?.market_cap_change_percentage_24h_usd
  const btcDom = global?.market_cap_percentage?.btc
  const activeCoins = global?.active_cryptocurrencies

  let up = 0, down = 0
  for (const c of coins) {
    const d = c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h
    if (d > 0) up++
    else if (d < 0) down++
  }
  const total = up + down

  return (
    <section>
      {/* Заголовок нужен поисковикам, но место на экране занимать не должен:
          первый экран отдан цифрам. */}
      <h1 className="sr-only">{t('heroTitle')} {t('heroAccent')}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 items-stretch border border-line bg-panel">
        <Metric
          label={t('mMarketCap')}
          tip={t('tipMcap')}
          value={mcap ? formatBig(mcap, currency) : '—'}
          trend={trendOf(mcapChange)}
          arrow
        />
        <Metric label={t('mBtcDom')} tip={t('tipDom')} value={btcDom != null ? btcDom.toFixed(1) + '%' : '—'} />
        <Metric
          label={t('mBreadth')}
          tip={t('tipBreadth')}
          value={total ? `${up} / ${down}` : '—'}
          trend={up >= down ? 'rise' : 'fall'}
        />
        <Metric label={t('mTotal')} value={activeCoins ? activeCoins.toLocaleString('en-US') : '—'} />
        <FearGreed compact />
      </div>

      {/* Сводка человеческим языком: наш крючок, поэтому остаётся на первом экране,
          но одной строкой, а не панелью в пол-экрана. */}
      {marketSummary && (
        <p className="mt-1.5 text-[12px] leading-snug text-soft text-pretty">
          <span className="text-brand-ink font-semibold uppercase tracking-wider text-[10px] mr-2">{t('marketNow')}</span>
          {marketSummary}
        </p>
      )}
    </section>
  )
}
