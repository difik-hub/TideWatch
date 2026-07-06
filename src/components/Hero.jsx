import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { formatBig, formatPct, trendOf } from '../lib/format'
import { buildMarketSummary } from '../lib/marketSummary'
import Icon, { TrendArrow } from './Icon'
import InfoTip from './InfoTip'
import FearGreed from './FearGreed'

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }

function Metric({ label, value, trend, sub, arrow, tip }) {
  return (
    <div className="px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wide text-faint flex items-center gap-1.5">{label}{tip && <InfoTip text={tip} />}</div>
      <div className={`text-lg font-semibold mt-1 tnum flex items-center gap-1 ${trend ? trendColor[trend] : 'text-ink'}`}>
        {arrow && trend && <TrendArrow dir={trend} size={11} />}
        {value}
      </div>
      {sub && <div className="text-[11px] text-soft mt-0.5">{sub}</div>}
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
  const upPct = total ? Math.round((up / total) * 100) : 0

  const moodKey =
    mcapChange == null ? null
    : mcapChange > 2 ? 'moodStrongUp'
    : mcapChange > 0 ? 'moodUp'
    : mcapChange > -2 ? 'moodDown'
    : 'moodStrongDown'
  const moodTrend = mcapChange == null ? 'flat' : mcapChange >= 0 ? 'rise' : 'fall'

  return (
    <section className="rise-in mb-7">
      <div className="pt-2 pb-6">
        <div className="inline-flex items-center gap-2 text-[11px] text-soft mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-up pulse-dot" />
          {t('tagline')}
        </div>
        <h1 className="text-[28px] sm:text-4xl font-semibold tracking-tight leading-[1.08] text-balance">
          {t('heroTitle')}{' '}
          <span className="text-brand-ink">{t('heroAccent')}</span>
        </h1>

        {/* Живая сводка рынка понятным языком — главный «крючок» */}
        {marketSummary && (
          <div className="mt-4 card rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <span className={`grid place-items-center w-6 h-6 rounded-lg bg-brand-soft ${trendColor[moodTrend]}`}>
                <TrendArrow dir={moodTrend} size={11} />
              </span>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-brand-ink">{t('marketNow')}</span>
            </div>
            <p className="text-[15px] sm:text-[16px] leading-relaxed text-ink text-pretty tnum">{marketSummary}</p>
          </div>
        )}

        {/* Полоса доверия */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-soft">
          <span className="inline-flex items-center gap-1.5"><Icon name="check2" size={13} className="text-up" /> {t('footerData')}</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="check2" size={13} className="text-up" /> {t('noSignup')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-up pulse-dot" /> {t('realtime')}</span>
        </div>
      </div>

      {/* Сводка рынка — единая панель с внутренними разделителями */}
      <div className="card rounded-2xl grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-line overflow-hidden">
        <Metric
          label={t('mMarketCap')}
          tip={t('tipMcap')}
          value={mcap ? formatBig(mcap, currency) : '—'}
          trend={trendOf(mcapChange)}
          arrow
          sub={mcapChange != null ? t('sChange24', { v: formatPct(mcapChange) }) : null}
        />
        <Metric
          label={t('mBtcDom')}
          tip={t('tipDom')}
          value={btcDom != null ? btcDom.toFixed(1) + '%' : '—'}
          sub={t('sBtcShare')}
        />
        <Metric
          label={t('mBreadth')}
          tip={t('tipBreadth')}
          value={total ? `${up} / ${down}` : '—'}
          trend={up >= down ? 'rise' : 'fall'}
          sub={total ? t('sInPlus', { v: upPct, n: coins.length }) : null}
        />
        <Metric
          label={t('mTotal')}
          value={activeCoins ? activeCoins.toLocaleString('en-US') : '—'}
          sub={t('sOnMarket')}
        />
        {/* Страх и жадность — компактно, в общем ряду (не отдельным блоком) */}
        <FearGreed compact />
      </div>
    </section>
  )
}
