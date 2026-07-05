import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CardNav from './CardNav'
import Icon from './Icon'
import { useT } from '../i18n/useT'
import { useUI } from '../store/ui'
import { countActiveAlerts } from '../lib/alerts'

// Шапка на основе CardNav: плавающая капсула с раскрывающимся меню.
// children — строка под капсулой (на ленте это поиск).
export default function Nav({ children }) {
  const t = useT()
  const ui = useUI()
  const { openConverter, openAlerts, openPortfolio, openSettings } = ui
  const navigate = useNavigate()
  const [alertCount, setAlertCount] = useState(() => countActiveAlerts())
  const [installable, setInstallable] = useState(() => typeof window !== 'undefined' && !!window.__deferredInstall)

  useEffect(() => {
    const h = () => setInstallable(true)
    window.addEventListener('tidewatch:installable', h)
    return () => window.removeEventListener('tidewatch:installable', h)
  }, [])

  const installApp = useCallback(async () => {
    const p = window.__deferredInstall
    if (!p) return
    p.prompt()
    await p.userChoice
    window.__deferredInstall = null
    setInstallable(false)
  }, [])

  // Обновляем счётчик активных алертов (срабатывание, создание, закрытие модалки)
  useEffect(() => {
    const refresh = () => setAlertCount(countActiveAlerts())
    refresh()
    window.addEventListener('tidewatch:alerts-changed', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('tidewatch:alerts-changed', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [ui.overlay])

  const bell = (
    <button
      type="button"
      onClick={() => ui.openAlerts()}
      aria-label={t('myAlerts')}
      className="relative w-9 h-9 grid place-items-center rounded-lg text-soft hover:text-ink hover:bg-panel2 transition"
    >
      <Icon name="bell" size={18} />
      {alertCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-brand text-white text-[10px] font-semibold tnum">
          {alertCount}
        </span>
      )}
    </button>
  )

  const brand = (
    <Link to="/" className="wordmark text-ink" onClick={(e) => e.stopPropagation()} aria-label="TideWatch">
      Tide<span className="wm-accent">Watch</span>
    </Link>
  )

  // Мемоизируем items — иначе на каждый ререндер (тик счётчика алертов) новый
  // массив пересобирал бы GSAP-таймлайн, из-за чего гамбургер «тупил».
  const items = useMemo(() => [
    {
      label: t('navMarket'),
      bg: 'color-mix(in oklab, var(--brand) 16%, transparent)',
      fg: 'var(--ink)',
      links: [
        { label: t('topGainers'), onClick: () => navigate('/?view=gainers') },
        { label: t('topLosers'), onClick: () => navigate('/?view=losers') },
        { label: t('heatmapTitle'), onClick: () => navigate('/heatmap') },
        { label: t('toolCompare'), onClick: () => navigate('/compare') },
        { label: t('toolConverter'), onClick: () => openConverter() },
      ],
    },
    {
      label: t('setTitle'),
      bg: 'color-mix(in oklab, var(--ink) 7%, transparent)',
      fg: 'var(--ink)',
      links: [
        { label: t('portfolioTitle'), onClick: () => openPortfolio() },
        { label: t('myAlerts'), onClick: () => openAlerts() },
        { label: t('openSettingsLink'), onClick: () => openSettings() },
      ],
    },
    {
      label: t('navAbout'),
      bg: 'color-mix(in oklab, var(--ink) 7%, transparent)',
      fg: 'var(--ink)',
      links: [
        ...(installable ? [{ label: t('installApp'), onClick: installApp }] : []),
        { label: t('aboutData'), onClick: () => window.open('https://www.coingecko.com', '_blank') },
        { label: t('aboutDisc'), onClick: () => {} },
        { label: t('aboutApp'), onClick: () => {} },
      ],
    },
  ], [t, navigate, openConverter, openAlerts, openPortfolio, openSettings, installable, installApp])

  return (
    <header className="sticky top-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-line">
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-3">
        <CardNav
          brand={brand}
          items={items}
          ctaLabel={t('settings')}
          ctaIcon="settings"
          onCta={() => ui.openSettings()}
          extraAction={bell}
        />
        {children && <div className="mt-3">{children}</div>}
      </div>
    </header>
  )
}
