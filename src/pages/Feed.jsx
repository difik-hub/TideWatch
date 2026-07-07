import { useEffect, useMemo, useState, useCallback, useDeferredValue } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import CoinCard from '../components/CoinCard'
import CoinRow from '../components/CoinRow'
import Hero from '../components/Hero'
// AdSlots отключён: вертикальный лейаут (вернуть — раскомментировать здесь и в разметке)
// import AdSlots from '../components/AdSlots'
import BlobBackdrop from '../components/BlobBackdrop'
import NowMoving from '../components/NowMoving'
import Onboarding from '../components/Onboarding'
import CrossMarketRail from '../components/CrossMarketRail'
import Icon from '../components/Icon'
import { fetchMarkets, fetchGlobal, fetchRates, fetchSearch } from '../lib/api'
import { fetchStocks, searchStocks } from '../lib/stocksApi'
import TickerLogo from '../components/TickerLogo'
import { subscribeLive } from '../lib/binanceLive'
import { getFavorites, toggleFavorite } from '../lib/favorites'
import { checkAlerts, notify, playAlertSound } from '../lib/alerts'
import { convertPrice } from '../lib/format'
import { TON_ADDRESS, tonDonateUrl } from '../config/support'
import { useSettings } from '../store/settings'
import { useUI } from '../store/ui'
import { useT } from '../i18n/useT'

function SkeletonCard() {
  return (
    <div className="card rounded-xl p-4">
      <div className="flex gap-3 items-center">
        <div className="skeleton w-9 h-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-32 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
      <div className="skeleton h-5 w-24 rounded mt-4" />
    </div>
  )
}

export default function Feed() {
  const { currency, coinCount, refresh } = useSettings()
  const ui = useUI()
  const t = useT()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchResults, setSearchResults] = useState([])
  const [searchFocused, setSearchFocused] = useState(false)
  const view = searchParams.get('view') || 'cap' // cap | gainers | losers
  const tab = searchParams.get('tab') === 'stocks' ? 'stocks' : 'crypto' // крипта | акции
  const switchTab = (t) => setSearchParams(t === 'stocks' ? { tab: 'stocks' } : {})
  const [stCat, setStCat] = useState('all') // фильтр категории акций

  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [onlyFav, setOnlyFav] = useState(false)
  const [favs, setFavs] = useState(() => getFavorites())
  const [updatedAt, setUpdatedAt] = useState(null)
  const [global, setGlobal] = useState(null)
  const [rates, setRates] = useState(null)
  const [live, setLive] = useState(() => new Map()) // SYMBOL -> цена USD (Binance WS)
  // Вид ленты: compact (таблица, по умолчанию — сканируется глазом) | cards (подробно)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('tidewatch:viewMode') || 'compact')
  const switchView = (m) => { setViewMode(m); localStorage.setItem('tidewatch:viewMode', m) }

  // Реалтайм-цены: один общий вебсокет, батчи раз в 3 сек
  useEffect(() => {
    return subscribeLive((batch) => {
      setLive((prev) => {
        const next = new Map(prev)
        for (const [sym, price] of batch) next.set(sym, price)
        return next
      })
    })
  }, [])

  const load = useCallback(async () => {
    try {
      setError(null)
      // Курсы валют нужны и крипте, и акциям (конвертация USD→валюта юзера)
      fetchRates().then(setRates).catch(() => {})
      if (tab === 'stocks') {
        const data = await fetchStocks()
        setCoins(data)
        setUpdatedAt(new Date())
        if (!data.length) setError(t('stocksEmpty'))
      } else {
        const data = await fetchMarkets(coinCount, 1, currency)
        setCoins(data)
        setUpdatedAt(new Date())
        fetchGlobal().then(setGlobal).catch(() => {})
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [coinCount, currency, tab, t])

  // Перезагрузка при смене валюты/количества — без сброса в скелетоны,
  // старые карточки остаются на месте, пока подгружаются новые (плавно).
  useEffect(() => {
    load()
  }, [load])

  // Смена вкладки (крипта↔акции) — чистим ленту и показываем скелетоны
  useEffect(() => {
    setCoins([])
    setLoading(true)
  }, [tab])

  // Авто-обновление по выбранному интервалу (0 = вручную)
  useEffect(() => {
    if (!refresh) return
    const id = setInterval(load, refresh)
    return () => clearInterval(id)
  }, [refresh, load])

  const onToggleFav = useCallback((id) => setFavs(new Set(toggleFavorite(id))), [])

  // Проверка алертов при обновлении данных — по загруженному рынку (крипта ИЛИ акции).
  // Акции уже в USD, крипта — в валюте юзера (конвертируем).
  useEffect(() => {
    if (!coins.length) return
    const priceUsd = {}
    for (const c of coins) {
      priceUsd[c.id] = c.kind === 'stock'
        ? c.current_price
        : (rates ? convertPrice(c.current_price, currency, 'usd', rates) : null)
    }
    const fired = checkAlerts(priceUsd)
    if (fired.length) {
      playAlertSound()
      window.dispatchEvent(new Event('tidewatch:alerts-changed'))
      for (const a of fired) {
        notify(`${a.symbol?.toUpperCase()} ${a.direction === 'above' ? '↑' : '↓'}`, `${a.coinName}: ${a.targetDisplay} ${a.currency.toUpperCase()}`)
      }
    }
  }, [coins, rates, currency, tab])

  const dirLabel = view === 'gainers' ? t('topGainers') : view === 'losers' ? t('topLosers') : t('byCap')

  const deferredQuery = useDeferredValue(query)

  // Глобальный поиск: крипта → CoinGecko, акции → FMP (любой тикер США)
  useEffect(() => {
    const q = deferredQuery.trim()
    if (q.length < 2) { setSearchResults([]); return }
    let alive = true
    const search = tab === 'stocks' ? searchStocks(q) : fetchSearch(q)
    search.then((r) => { if (alive) setSearchResults(r) }).catch(() => {})
    return () => { alive = false }
  }, [deferredQuery, tab])

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    let list = coins
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    if (onlyFav) list = list.filter((c) => favs.has(c.id))
    if (tab === 'stocks' && stCat !== 'all') list = list.filter((c) => c.cat === stCat)
    const d = (c) => c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? 0
    return [...list].sort((a, b) => {
      const fa = favs.has(a.id) ? 1 : 0
      const fb = favs.has(b.id) ? 1 : 0
      if (fa !== fb) return fb - fa
      if (view === 'gainers') return d(b) - d(a)
      if (view === 'losers') return d(a) - d(b)
      return (a.market_cap_rank || 9999) - (b.market_cap_rank || 9999)
    })
  }, [coins, deferredQuery, onlyFav, favs, view, tab, stCat])

  // «Рынок» = медиана изменения за 24ч по всем загруженным монетам
  const marketMedian = useMemo(() => {
    const arr = coins
      .map((c) => c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h)
      .filter((n) => n != null && !isNaN(n))
      .sort((a, b) => a - b)
    if (!arr.length) return null
    const mid = Math.floor(arr.length / 2)
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
  }, [coins])

  const statusLine = updatedAt
    ? `${t('updatedAt', { time: updatedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) })} · ${
        refresh === 30000 ? t('autoEvery', { sec: 30 }) : refresh === 60000 ? t('autoMinute') : t('manualMode')
      }`
    : ''

  const showHero = tab === 'crypto' && !query && !onlyFav && coins.length > 0
  // Рынок акций закрыт, если ни по одной акции нет открытой сессии
  const stocksClosed = tab === 'stocks' && coins.length > 0 && coins.every((c) => !c.is_market_open)

  return (
    <div className="min-h-[100dvh] page">
      {/* Кросс-рыночная боковина (ПК): топ другого рынка в пустом гуттере */}
      {coins.length > 0 && <CrossMarketRail tab={tab} />}
      <Nav>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint z-10">
              <Icon name="search" size={16} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder={t('search')}
              className="w-full bg-panel border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand/60 transition placeholder:text-faint"
            />
            {/* Глобальные результаты поиска по всей базе */}
            {searchFocused && query.trim().length >= 2 && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-panel border border-line rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { navigate(r.href ?? `/coin/${r.id}`); setQuery(''); setSearchFocused(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-panel2 transition"
                  >
                    <TickerLogo src={r.thumb} symbol={r.symbol} size={24} />
                    <span className="flex-1 min-w-0 truncate text-sm font-medium">{r.name}</span>
                    <span className="text-faint text-[11px] uppercase tnum">{r.symbol}</span>
                    {r.rank && <span className="text-faint text-[11px] tnum">#{r.rank}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setOnlyFav((v) => !v)}
            className={`px-3.5 rounded-xl border text-sm font-medium transition ${
              onlyFav ? 'bg-brand-soft border-brand/40 text-brand-ink' : 'bg-panel border-line text-soft hover:text-ink'
            }`}
          >
            {t('favorites')}
          </button>
        </div>
      </Nav>

      {/* Боковые баннеры отключены: вертикальный CMC-лейаут во всю ширину.
          Вернуть — раскомментировать. Реклама переедет в горизонтальный слот. */}
      {/* <AdSlots /> */}

      {showHero && (
        <section className="relative overflow-hidden border-b border-line">
          {/* Фирменный фон-волна (Higgsfield), мягко замаскирован по краям */}
          <img
            src="/hero.jpg"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]"
          />
          <BlobBackdrop />
          <div className="relative max-w-5xl mx-auto px-4 pt-6 pb-2">
            <Hero global={global} coins={coins} />
          </div>
        </section>
      )}

      <main className="max-w-5xl mx-auto px-4 py-5">
        {/* Вкладки Крипта | Акции — два рынка на одном экране (ядро видения) */}
        <div className="flex items-center justify-center gap-1 mb-4">
          <div className="inline-flex rounded-xl border border-line bg-panel p-1">
            <button
              onClick={() => switchTab('crypto')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === 'crypto' ? 'bg-brand-soft text-brand-ink' : 'text-soft hover:text-ink'}`}
            >
              {t('tabCrypto')}
            </button>
            <button
              onClick={() => switchTab('stocks')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === 'stocks' ? 'bg-brand-soft text-brand-ink' : 'text-soft hover:text-ink'}`}
            >
              {t('tabStocks')}
            </button>
          </div>
        </div>

        {/* Статус рынка акций + пояснение про задержку данных */}
        {tab === 'stocks' && coins.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4 text-xs">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${stocksClosed ? 'bg-panel2 text-soft' : 'bg-up/10 text-up'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${stocksClosed ? 'bg-faint' : 'bg-up animate-pulse'}`} />
              {stocksClosed ? t('marketClosed') : t('marketOpen')}
            </span>
            <span className="text-faint">{t('stocksNote')}</span>
          </div>
        )}

        {/* Чипы-фильтры категорий акций */}
        {tab === 'stocks' && coins.length > 0 && !query && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[['all', t('catAll')], ['crypto', t('catCrypto')], ['tech', t('catTech')], ['finance', t('catFinance')]].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setStCat(k)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition ${stCat === k ? 'bg-brand-soft border-brand/40 text-brand-ink' : 'bg-panel border-line text-soft hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {view !== 'cap' && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setSearchParams({})}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-brand-soft border border-brand/30 text-brand-ink"
            >
              {dirLabel}
              <Icon name="close" size={13} />
            </button>
          </div>
        )}

        {updatedAt && !error && (
          <div className="flex items-center justify-center gap-3 text-xs text-soft mb-4">
            <span className="tnum">{statusLine}</span>
            {!refresh && (
              <button onClick={() => { setLoading(true); load() }} className="inline-flex items-center gap-1 text-brand-ink hover:underline">
                <Icon name="refresh" size={13} /> {t('refreshNow')}
              </button>
            )}
          </div>
        )}

        {error && coins.length === 0 && (
          <div className="card rounded-xl p-5 text-center text-sm">
            <div className="text-down font-medium mb-1">{t('errorTitle')}</div>
            <div className="text-soft">{error}</div>
            <button
              onClick={() => { setLoading(true); load() }}
              className="mt-3 px-4 py-1.5 rounded-lg bg-brand-soft border border-brand/40 text-brand-ink text-sm hover:bg-brand/15 transition"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {error && coins.length > 0 && (
          <div className="mb-4 text-center text-xs text-soft">{t('staleNotice')}</div>
        )}

        {/* FNG ужат в мини-метрику внутри панели Hero */}
        {showHero && coins.length > 0 && <Onboarding />}
        {showHero && coins.length > 0 && <NowMoving coins={coins} />}

        {/* Быстрый доступ к функциям — на виду, а не спрятаны в меню */}
        {coins.length > 0 && !query && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => ui.openPortfolio()} className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-panel border border-line text-[13px] font-medium text-ink hover:border-brand/50 hover:text-brand-ink transition">
              <Icon name="coins" size={15} className="text-brand-ink" /> {t('portfolioTitle')}
            </button>
            <button onClick={() => ui.openConverter()} className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-panel border border-line text-[13px] font-medium text-ink hover:border-brand/50 hover:text-brand-ink transition">
              <Icon name="swap" size={15} className="text-brand-ink" /> {t('convTitle')}
            </button>
            <button onClick={() => navigate('/heatmap')} className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-panel border border-line text-[13px] font-medium text-ink hover:border-brand/50 hover:text-brand-ink transition">
              <Icon name="grid" size={15} className="text-brand-ink" /> {t('heatmapTitle')}
            </button>
            <button onClick={() => navigate('/compare')} className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-panel border border-line text-[13px] font-medium text-ink hover:border-brand/50 hover:text-brand-ink transition">
              <Icon name="compare" size={15} className="text-brand-ink" /> {t('toolCompare')}
            </button>
            <button onClick={() => ui.openAlerts()} className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-panel border border-line text-[13px] font-medium text-ink hover:border-brand/50 hover:text-brand-ink transition">
              <Icon name="bell" size={15} className="text-brand-ink" /> {t('myAlerts')}
            </button>
          </div>
        )}

        {/* Заголовок ленты — даёт структуру вместо разрозненных элементов */}
        {coins.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold flex items-center gap-2">
              {onlyFav ? t('favorites') : view === 'gainers' ? t('topGainers') : view === 'losers' ? t('topLosers') : tab === 'stocks' ? t('tabStocks') : t('allCoins')}
              <span className="text-faint text-xs font-normal tnum">{visible.length}</span>
            </h2>
            {/* Переключатель вида: таблица (компакт) / карточки (подробно) */}
            <div className="flex rounded-lg border border-line overflow-hidden">
              <button
                onClick={() => switchView('compact')}
                aria-label="list"
                className={`px-2.5 py-1.5 ${viewMode === 'compact' ? 'bg-brand-soft text-brand-ink' : 'bg-panel text-faint hover:text-soft'}`}
              >
                <Icon name="bars" size={14} />
              </button>
              <button
                onClick={() => switchView('cards')}
                aria-label="cards"
                className={`px-2.5 py-1.5 ${viewMode === 'cards' ? 'bg-brand-soft text-brand-ink' : 'bg-panel text-faint hover:text-soft'}`}
              >
                <Icon name="grid" size={14} />
              </button>
            </div>
          </div>
        )}

        {loading && !coins.length && (
          <div className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="text-center text-soft py-16">
            {onlyFav ? t('emptyFav') : t('emptyFound')}
          </div>
        )}

        {viewMode === 'compact' ? (
          /* Табличный вид: вся инфа сканируется глазом, как у больших трекеров */
          <div className="card rounded-2xl overflow-hidden">
            <div className="hidden sm:grid items-center gap-2 px-3 py-2 border-b border-line text-[10px] uppercase tracking-wide text-faint
                            sm:grid-cols-[36px_minmax(0,1.4fr)_auto_76px_76px_90px_96px_34px]">
              <span>#</span>
              <span>{t('convPickCoin')}</span>
              <span className="text-right justify-self-end">$</span>
              <span className="text-right">{t('lblDay')}</span>
              <span className="text-right">{t('lblWeek')}</span>
              <span className="text-right">{t('lblCap')}</span>
              <span>7d</span>
              <span />
            </div>
            {visible.map((coin) => (
              <CoinRow
                key={coin.id}
                coin={coin}
                isFav={favs.has(coin.id)}
                onToggleFav={onToggleFav}
                rates={rates}
                livePrice={live.get(coin.symbol?.toUpperCase()) ?? null}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((coin, i) => (
              <CoinCard
                key={coin.id}
                coin={coin}
                index={i}
                isFav={favs.has(coin.id)}
                onToggleFav={onToggleFav}
                rates={rates}
                marketMedian={marketMedian}
                livePrice={live.get(coin.symbol?.toUpperCase()) ?? null}
              />
            ))}
          </div>
        )}

        <footer className="text-center py-10">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => ui.openFeedback()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-panel border border-line text-sm font-medium text-ink hover:border-brand/50 hover:text-brand-ink transition"
            >
              <Icon name="about" size={16} className="text-brand-ink" />
              {t('feedbackBtn')}
            </button>
            {TON_ADDRESS && (
              <a
                href={tonDonateUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-panel border border-line text-sm font-medium text-ink hover:border-brand/50 hover:text-brand-ink transition"
              >
                {t('supportAuthor')}
              </a>
            )}
          </div>
          <div className="text-xs text-faint leading-relaxed mt-6">
            <div>{t('footerData')}</div>
            <div className="mt-1">{t('disclaimer')}</div>
          </div>
        </footer>
      </main>
    </div>
  )
}
