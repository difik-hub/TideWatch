import { useEffect, useMemo, useState } from 'react'
import Drawer from './Drawer'
import Icon, { TrendArrow } from './Icon'
import { useUI } from '../store/ui'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { fetchMarkets, fetchRates } from '../lib/api'
import { fetchStocks } from '../lib/stocksApi'
import { formatPrice, formatBig, formatPct, trendOf, convertPrice } from '../lib/format'
import { getPortfolio, addHolding, removeHolding } from '../lib/portfolio'
import { getActivity, logActivity, relativeTime } from '../lib/activity'

export default function Portfolio() {
  const ui = useUI()
  const open = ui.isOpen('portfolio')
  const { currency, coinCount, lang } = useSettings()
  const t = useT()
  const [activity, setActivity] = useState([])

  const [coins, setCoins] = useState([])
  const [stocks, setStocks] = useState([])
  const [rates, setRates] = useState(null)
  const [list, setList] = useState(() => getPortfolio())
  const [coinId, setCoinId] = useState('bitcoin')
  const [amount, setAmount] = useState('')
  const [buyPrice, setBuyPrice] = useState('')

  useEffect(() => {
    if (!open) return
    setList(getPortfolio())
    setActivity(getActivity())
    fetchMarkets(Math.max(coinCount, 100), 1, currency).then(setCoins).catch(() => {})
    fetchStocks().then(setStocks).catch(() => {})
    fetchRates().then(setRates).catch(() => {})
  }, [open, currency, coinCount])

  // Общая карта цен: крипта (в валюте юзера) + акции (в USD, помечены kind)
  const byId = useMemo(() => Object.fromEntries([...coins, ...stocks].map((c) => [c.id, c])), [coins, stocks])
  const coin = byId[coinId] || coins[0]

  // priceUsd монеты (current_price в выбранной валюте → usd)
  const toUsd = (priceInCur) => (rates ? convertPrice(priceInCur, currency, 'usd', rates) : priceInCur)
  const toCur = (priceUsd) => (rates ? convertPrice(priceUsd, 'usd', currency, rates) : priceUsd)

  const rows = useMemo(() => {
    return list.map((h) => {
      const c = byId[h.coinId]
      // Акции уже в USD, крипта — в валюте юзера (конвертируем в USD)
      const priceUsd = c ? (c.kind === 'stock' ? c.current_price : toUsd(c.current_price)) : null
      const valueUsd = priceUsd != null ? priceUsd * h.amount : null
      const costUsd = h.buyPriceUsd != null ? h.buyPriceUsd * h.amount : null
      const plUsd = valueUsd != null && costUsd != null ? valueUsd - costUsd : null
      const plPct = costUsd ? (plUsd / costUsd) * 100 : null
      const d24 = c ? (c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h) : null
      return { h, c, d24, valueCur: valueUsd != null ? toCur(valueUsd) : null, plCur: plUsd != null ? toCur(plUsd) : null, plPct }
    })
  }, [list, byId, rates, currency])

  const totalValue = rows.reduce((s, r) => s + (r.valueCur || 0), 0)
  const totalPl = rows.reduce((s, r) => s + (r.plCur || 0), 0)
  const totalTrend = trendOf(totalPl)

  // Изменение портфеля за 24ч (взвешенное по стоимости)
  const total24h = useMemo(() => {
    if (!totalValue) return null
    const weighted = rows.reduce((s, r) => s + (r.valueCur && r.d24 != null ? r.valueCur * r.d24 : 0), 0)
    return weighted / totalValue
  }, [rows, totalValue])

  const add = () => {
    const amt = parseFloat(String(amount).replace(',', '.'))
    if (!coin || isNaN(amt) || amt <= 0) return
    const bp = parseFloat(String(buyPrice).replace(',', '.'))
    setList(addHolding({
      coinId: coin.id,
      symbol: coin.symbol,
      image: coin.image,
      kind: coin.kind === 'stock' ? 'stock' : 'crypto',
      amount: amt,
      buyPriceUsd: !isNaN(bp) && bp > 0 ? toUsd(bp) : null,
    }))
    logActivity('portfolio', `+ ${coin.symbol?.toUpperCase()} ×${amt}`)
    setActivity(getActivity())
    setAmount('')
    setBuyPrice('')
  }

  return (
    <Drawer open={open} onClose={ui.close} title={t('portfolioTitle')} icon="coins">
      <div className="space-y-5">
        {/* Итог */}
        <div className="rounded-xl bg-panel2 border border-line p-4">
          <div className="text-xs text-soft">{t('portfolioTotal')}</div>
          <div className="text-2xl font-bold tnum mt-0.5">{formatBig(totalValue, currency)}</div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {total24h != null && (
              <span className={`text-sm font-medium tnum inline-flex items-center gap-1 ${trendColorCls(trendOf(total24h))}`}>
                <TrendArrow dir={trendOf(total24h)} size={9} /> {formatPct(total24h)} · {t('lblDay')}
              </span>
            )}
            {rows.some((r) => r.plCur != null) && (
              <span className={`text-sm font-medium tnum inline-flex items-center gap-1 ${trendColorCls(totalTrend)}`}>
                {formatPrice(totalPl, currency)} P/L
              </span>
            )}
          </div>
        </div>

        {/* Форма */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <select value={coin?.id || ''} onChange={(e) => setCoinId(e.target.value)}
              className="flex-1 min-w-0 bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60">
              {coins.slice(0, 100).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
              placeholder={t('portfolioAmount')}
              className="flex-1 bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60 tnum" />
            <input value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} inputMode="decimal"
              placeholder={`${t('portfolioBuyPrice')} (${currency.toUpperCase()})`}
              className="flex-1 min-w-0 bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60 tnum" />
            <button onClick={add} className="px-4 rounded-xl bg-brand text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition">+</button>
          </div>
        </div>

        {/* Список с долей в портфеле */}
        <div className="space-y-2">
          {rows.length === 0 && <div className="text-center text-soft text-sm py-6">{t('portfolioEmpty')}</div>}
          {rows.map(({ h, valueCur, plCur, plPct }) => {
            const alloc = totalValue && valueCur != null ? (valueCur / totalValue) * 100 : null
            return (
              <div key={h.id} className="bg-panel2 border border-line rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-3">
                  {h.image
                    ? <img src={h.image} alt="" className="w-7 h-7 rounded-full" />
                    : <span className="grid place-items-center w-7 h-7 rounded-full shrink-0 bg-brand-soft text-brand-ink text-[9px] font-bold uppercase">{h.symbol?.slice(0, 2)}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{h.symbol?.toUpperCase()} <span className="text-faint text-xs tnum">× {h.amount}</span></div>
                    {plPct != null && (
                      <div className={`text-xs tnum ${trendColorCls(trendOf(plPct))}`}>{formatPct(plPct)}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tnum">{valueCur != null ? formatBig(valueCur, currency) : '—'}</div>
                    {plCur != null && <div className={`text-[11px] tnum ${trendColorCls(trendOf(plCur))}`}>{formatPrice(plCur, currency)}</div>}
                  </div>
                  <button onClick={() => setList(removeHolding(h.id))} aria-label={t('alertDelete')}
                    className="w-7 h-7 grid place-items-center rounded-lg text-faint hover:text-down hover:bg-panel transition">
                    <Icon name="close" size={15} />
                  </button>
                </div>
                {alloc != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-panel overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(alloc, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-faint tnum w-9 text-right">{alloc.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Последняя активность */}
        {activity.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-soft uppercase tracking-wide mb-2">{t('recentActivity')}</div>
            <div className="space-y-1.5">
              {activity.slice(0, 6).map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px]">
                  <Icon name={a.type === 'view' ? 'about' : a.type === 'alert' ? 'bell' : 'coins'} size={14} className="text-faint shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-slate-300">{a.label}</span>
                  <span className="text-faint text-[11px] shrink-0">{relativeTime(a.ts, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}

function trendColorCls(tr) {
  return tr === 'rise' ? 'text-up' : tr === 'fall' ? 'text-down' : 'text-soft'
}
