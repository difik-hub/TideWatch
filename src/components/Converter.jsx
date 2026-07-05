import { useEffect, useMemo, useState } from 'react'
import Drawer from './Drawer'
import { useUI } from '../store/ui'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { fetchMarkets, fetchRates } from '../lib/api'
import { formatPrice, convertPrice } from '../lib/format'

const OUT = ['usd', 'eur', 'rub']

export default function Converter() {
  const ui = useUI()
  const open = ui.isOpen('converter')
  const { currency, coinCount } = useSettings()
  const t = useT()

  const [coins, setCoins] = useState([])
  const [rates, setRates] = useState(null)
  const [coinId, setCoinId] = useState('bitcoin')
  const [amount, setAmount] = useState('1')

  useEffect(() => {
    if (!open) return
    fetchMarkets(Math.max(coinCount, 100), 1, currency).then(setCoins).catch(() => {})
    fetchRates().then(setRates).catch(() => {})
  }, [open, currency, coinCount])

  const coin = useMemo(() => coins.find((c) => c.id === coinId) || coins[0], [coins, coinId])

  const results = useMemo(() => {
    const amt = parseFloat(String(amount).replace(',', '.'))
    if (!coin || isNaN(amt)) return null
    const baseValue = amt * coin.current_price // в выбранной валюте
    return OUT.map((cur) => ({
      cur,
      value: rates ? convertPrice(baseValue, currency, cur, rates) : cur === currency ? baseValue : null,
    }))
  }, [coin, amount, rates, currency])

  return (
    <Drawer open={open} onClose={ui.close} title={t('convTitle')} icon="swap">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-soft block mb-1">{t('convAmount')}</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60 tnum"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-soft block mb-1">{t('convPickCoin')}</label>
            <select
              value={coin?.id || ''}
              onChange={(e) => setCoinId(e.target.value)}
              className="w-full bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60"
            >
              {coins.slice(0, 100).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.symbol.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="text-xs text-soft mb-2">{t('convResult')}</div>
          <div className="grid gap-2">
            {results?.map((r) => (
              <div key={r.cur} className="flex items-center justify-between bg-panel2 border border-line rounded-xl px-3.5 py-2.5">
                <span className="text-xs uppercase text-faint">{r.cur}</span>
                <span className="font-semibold tnum">{formatPrice(r.value, r.cur)}</span>
              </div>
            ))}
            {!coins.length && <div className="text-soft text-sm text-center py-3">…</div>}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
