import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'
import { useUI } from '../store/ui'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { fetchMarkets, fetchRates } from '../lib/api'
import { formatPrice, convertPrice } from '../lib/format'
import { getAlerts, addAlert, removeAlert, requestNotifyPermission } from '../lib/alerts'
import { logActivity } from '../lib/activity'

export default function Alerts() {
  const ui = useUI()
  const open = ui.isOpen('alerts')
  const { currency, coinCount } = useSettings()
  const t = useT()

  const [coins, setCoins] = useState([])
  const [rates, setRates] = useState(null)
  const [list, setList] = useState(() => getAlerts())
  const [coinId, setCoinId] = useState('bitcoin')
  const [target, setTarget] = useState('')
  const [direction, setDirection] = useState('above')

  useEffect(() => {
    if (!open) return
    setList(getAlerts())
    requestNotifyPermission()
    if (ui.payload?.coinId) setCoinId(ui.payload.coinId)
    fetchMarkets(Math.max(coinCount, 100), 1, currency).then(setCoins).catch(() => {})
    fetchRates().then(setRates).catch(() => {})
  }, [open, currency, coinCount])

  const coin = useMemo(() => coins.find((c) => c.id === coinId) || coins[0], [coins, coinId])

  const create = () => {
    const val = parseFloat(String(target).replace(',', '.'))
    if (!coin || isNaN(val)) return
    const targetUsd = rates ? convertPrice(val, currency, 'usd', rates) : val
    setList(addAlert({
      coinId: coin.id,
      coinName: coin.name,
      symbol: coin.symbol,
      image: coin.image,
      direction,
      currency,
      targetDisplay: val,
      targetUsd,
    }))
    setTarget('')
    window.dispatchEvent(new Event('tidewatch:alerts-changed'))
    logActivity('alert', `${coin.symbol?.toUpperCase()} ${direction === 'above' ? '↑' : '↓'} ${val} ${currency.toUpperCase()}`)
  }

  const onRemove = (id) => {
    setList(removeAlert(id))
    window.dispatchEvent(new Event('tidewatch:alerts-changed'))
  }

  return (
    <Modal open={open} onClose={ui.close} title={t('alertsTitle')} icon="bell">
      <div className="space-y-5">
        {/* Форма создания */}
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <select
              value={coin?.id || ''}
              onChange={(e) => setCoinId(e.target.value)}
              className="flex-1 min-w-0 bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60"
            >
              {coins.slice(0, 100).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>
              ))}
            </select>
            <div className="flex rounded-xl border border-line overflow-hidden shrink-0">
              <button
                onClick={() => setDirection('above')}
                className={`px-3 text-sm ${direction === 'above' ? 'bg-up/20 text-up' : 'bg-panel2 text-soft'}`}
              >↑ {t('alertAbove')}</button>
              <button
                onClick={() => setDirection('below')}
                className={`px-3 text-sm ${direction === 'below' ? 'bg-down/20 text-down' : 'bg-panel2 text-soft'}`}
              >↓ {t('alertBelow')}</button>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={`${t('alertTarget')} (${currency.toUpperCase()})`}
              className="flex-1 bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60 tnum"
            />
            <button
              onClick={create}
              className="px-4 rounded-xl bg-brand text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition"
            >
              {t('alertCreate')}
            </button>
          </div>
        </div>

        {/* Список алертов */}
        <div className="space-y-2">
          {list.length === 0 && (
            <div className="text-center text-soft text-sm py-6">{t('alertEmpty')}</div>
          )}
          {list.map((a) => (
            <div key={a.id} className="flex items-center gap-3 bg-panel2 border border-line rounded-xl px-3 py-2.5">
              <img src={a.image} alt="" className="w-7 h-7 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{a.symbol?.toUpperCase()}</div>
                <div className="text-xs text-soft tnum">
                  {a.direction === 'above' ? '↑' : '↓'} {formatPrice(a.targetDisplay, a.currency)}
                </div>
              </div>
              {a.triggered && (
                <span className="text-[11px] text-up bg-up/15 px-2 py-0.5 rounded-md">{t('alertTriggered')}</span>
              )}
              <button
                onClick={() => onRemove(a.id)}
                aria-label={t('alertDelete')}
                className="w-7 h-7 grid place-items-center rounded-lg text-faint hover:text-down hover:bg-panel transition"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
