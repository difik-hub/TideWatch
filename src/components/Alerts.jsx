import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'
import TickerLogo from './TickerLogo'
import { useUI } from '../store/ui'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'
import { fetchMarkets, fetchRates } from '../lib/api'
import { fetchStocks } from '../lib/stocksApi'
import { formatPrice, convertPrice } from '../lib/format'
import { getAlerts, addAlert, removeAlert, requestNotifyPermission } from '../lib/alerts'
import { fetchStatus, connectTelegram, pushAlert } from '../lib/tgAlerts'
import { logActivity } from '../lib/activity'

export default function Alerts() {
  const ui = useUI()
  const open = ui.isOpen('alerts')
  const { currency, coinCount } = useSettings()
  const t = useT()

  const [coins, setCoins] = useState([])
  const [stocks, setStocks] = useState([])
  const [rates, setRates] = useState(null)
  const [list, setList] = useState(() => getAlerts())
  const [coinId, setCoinId] = useState('bitcoin')
  const [target, setTarget] = useState('')
  const [direction, setDirection] = useState('above')
  // Связка с ботом: пока её нет, алерт живёт только во вкладке
  const [tg, setTg] = useState({ chatLinked: false, available: true })
  const [waitingLink, setWaitingLink] = useState(false)

  useEffect(() => {
    if (!open) return
    setList(getAlerts())
    requestNotifyPermission()
    if (ui.payload?.coinId) setCoinId(ui.payload.coinId)
    fetchMarkets(Math.max(coinCount, 100), 1, currency).then(setCoins).catch(() => {})
    fetchStocks().then(setStocks).catch(() => {})
    fetchRates().then(setRates).catch(() => {})
    fetchStatus().then(setTg)
  }, [open, currency, coinCount])

  // После перехода в бота человек возвращается на вкладку: там и проверяем связку,
  // опрашивать сервер по таймеру ради этого незачем.
  useEffect(() => {
    if (!open || !waitingLink) return
    const recheck = () => fetchStatus().then((s) => {
      setTg(s)
      if (s.chatLinked) setWaitingLink(false)
    })
    window.addEventListener('focus', recheck)
    return () => window.removeEventListener('focus', recheck)
  }, [open, waitingLink])

  const onConnect = async () => {
    setWaitingLink(true)
    await connectTelegram()
  }

  // Крипта + акции вместе: алерты можно ставить на оба рынка
  const all = useMemo(() => [...coins, ...stocks], [coins, stocks])
  const coin = useMemo(() => all.find((c) => c.id === coinId) || all[0], [all, coinId])

  const create = () => {
    const val = parseFloat(String(target).replace(',', '.'))
    if (!coin || isNaN(val)) return
    const targetUsd = rates ? convertPrice(val, currency, 'usd', rates) : val
    const kind = coin.kind === 'stock' ? 'stock' : 'crypto'

    // Если Telegram подключён, правило уходит на сервер: там его проверит
    // планировщик, и сообщение придёт даже с закрытым сайтом.
    if (tg.chatLinked) {
      pushAlert({
        kind,
        assetId: kind === 'stock' ? (coin.symbol || '').toUpperCase() : coin.id,
        symbol: coin.symbol,
        name: coin.name,
        direction,
        targetUsd,
      }).catch(() => {})
    }

    setList(addAlert({
      coinId: coin.id,
      coinName: coin.name,
      symbol: coin.symbol,
      image: coin.image,
      kind: coin.kind === 'stock' ? 'stock' : 'crypto',
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
        {/* Доставка в Telegram. Без неё алерт умирает вместе с вкладкой, поэтому
            блок стоит первым, а не прячется в настройках. */}
        {tg.available && (
          <div className="border border-line bg-panel2 px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0 text-[13px]">
              {tg.chatLinked ? (
                <>
                  <span className="font-semibold text-up">{t('tgLinked')}</span>
                  <span className="text-soft"> {t('tgLinkedHint')}</span>
                </>
              ) : (
                <>
                  <span className="font-semibold">{t('tgConnectTitle')}</span>
                  <span className="text-soft"> {t('tgConnectHint')}</span>
                </>
              )}
            </div>
            {!tg.chatLinked && (
              <button
                onClick={onConnect}
                className="shrink-0 px-3 py-1.5 bg-brand text-white text-[12px] font-semibold hover:opacity-90 active:translate-y-px transition"
              >
                {waitingLink ? t('tgWaiting') : t('tgConnectBtn')}
              </button>
            )}
          </div>
        )}

        {/* Форма создания */}
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <select
              value={coin?.id || ''}
              onChange={(e) => setCoinId(e.target.value)}
              className="flex-1 min-w-0 bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60"
            >
              <optgroup label={t('tabCrypto')}>
                {coins.slice(0, 100).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>
                ))}
              </optgroup>
              {stocks.length > 0 && (
                <optgroup label={t('tabStocks')}>
                  {stocks.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</option>
                  ))}
                </optgroup>
              )}
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
              <TickerLogo src={a.image} symbol={a.symbol} size={28} />
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
