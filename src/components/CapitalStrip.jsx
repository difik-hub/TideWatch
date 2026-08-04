import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMarkets, fetchRates } from '../lib/api'
import { fetchStocks } from '../lib/stocksApi'
import { getPortfolio } from '../lib/portfolio'
import { computeRows, totals as computeTotals } from '../lib/portfolioCalc'
import { formatPrice, formatPct, trendOf } from '../lib/format'
import { useSettings } from '../store/settings'
import { useUI } from '../store/ui'
import { useT } from '../i18n/useT'

const trendColor = { rise: 'text-up', fall: 'text-down', flat: 'text-soft' }

// Полоса капитала над лентой. Пустой портфель — одна строка с приглашением, и
// рынок остаётся первым экраном; капитал в роли главного героя оставлял новичка
// перед пустой страницей. Есть позиции — полоса показывает итог по двум рынкам.
// Рынки грузим только когда есть что считать: пустому портфелю данные не нужны.
export default function CapitalStrip() {
  const { currency } = useSettings()
  const ui = useUI()
  const t = useT()
  const [list, setList] = useState(() => getPortfolio())
  const [coins, setCoins] = useState([])
  const [stocks, setStocks] = useState([])
  const [rates, setRates] = useState(null)

  useEffect(() => {
    const sync = () => setList(getPortfolio())
    window.addEventListener('tidewatch:state-changed', sync)
    return () => window.removeEventListener('tidewatch:state-changed', sync)
  }, [])

  useEffect(() => {
    if (!list.length) return
    let alive = true
    fetchMarkets(100, 1, currency).then((d) => alive && setCoins(d)).catch(() => {})
    fetchStocks().then((d) => alive && setStocks(d)).catch(() => {})
    fetchRates().then((d) => alive && setRates(d)).catch(() => {})
    return () => { alive = false }
  }, [list.length, currency])

  const byId = useMemo(
    () => Object.fromEntries([...coins, ...stocks].map((c) => [c.id, c])),
    [coins, stocks],
  )
  const rows = useMemo(() => computeRows(list, byId, rates, currency), [list, byId, rates, currency])
  const sum = useMemo(() => computeTotals(rows), [rows])

  if (!list.length) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 border border-line bg-panel mb-3">
        <span className="text-[12px] text-soft">{t('ovEmpty')}</span>
        <button
          onClick={() => ui.openPortfolio()}
          className="text-[12px] font-semibold text-brand-ink hover:underline inline-flex items-center gap-1"
        >
          {t('ovAddFirst')}
        </button>
      </div>
    )
  }

  const tr = trendOf(sum.change24)
  const plTr = trendOf(sum.pl)

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-3 py-2 border border-line bg-panel mb-3">
      <span className="text-[10px] uppercase tracking-[0.14em] text-faint">{t('ovCapital')}</span>

      <span className="text-[17px] font-bold tnum leading-none">
        {formatPrice(sum.value, currency)}
      </span>

      <span className={`text-[12px] font-semibold tnum ${trendColor[tr]}`}>
        {formatPct(sum.change24)} <span className="text-faint font-normal">{t('ovPerDay')}</span>
      </span>

      <span className={`text-[12px] font-semibold tnum ${trendColor[plTr]}`}>
        {sum.pl >= 0 ? '+' : ''}{formatPrice(sum.pl, currency)}
        <span className="text-faint font-normal"> {t('ovAllTime')}</span>
      </span>

      {/* Доли двух рынков: ради этой картинки всё и затевалось */}
      <span className="flex items-center gap-2 min-w-[120px] flex-1 max-w-[220px]">
        <span className="flex h-1.5 flex-1 overflow-hidden bg-panel2">
          <span className="h-full bg-brand" style={{ width: `${sum.cryptoShare}%` }} />
          <span className="h-full bg-soft/50" style={{ width: `${sum.stockShare}%` }} />
        </span>
        <span className="text-[10px] text-faint tnum whitespace-nowrap">
          {Math.round(sum.cryptoShare)}/{Math.round(sum.stockShare)}
        </span>
      </span>

      <Link to="/overview" className="text-[12px] font-semibold text-brand-ink hover:underline ml-auto">
        {t('ovManage')}
      </Link>
    </div>
  )
}