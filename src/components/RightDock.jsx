import Icon from './Icon'
import { useUI } from '../store/ui'
import { useT } from '../i18n/useT'

// Тонкий вертикальный док у правого края — быстрый доступ к панелям-компаньонам.
// Видим на md+ (на мобиле эти разделы доступны из меню). Не пересекается с
// боковыми баннерами: те живут в гуттере, док прижат к самому краю.
export default function RightDock() {
  const ui = useUI()
  const t = useT()

  const items = [
    { icon: 'coins', label: t('portfolioTitle'), onClick: ui.openPortfolio },
    { icon: 'swap', label: t('convTitle'), onClick: ui.openConverter },
  ]

  return (
    <div className="hidden md:flex fixed right-3 top-1/2 -translate-y-1/2 z-40 flex-col gap-2 p-1.5 rounded-2xl bg-panel/80 backdrop-blur border border-line shadow-[var(--shadow)]">
      {items.map((it) => (
        <button
          key={it.icon}
          onClick={it.onClick}
          aria-label={it.label}
          className="group relative w-10 h-10 grid place-items-center rounded-xl text-soft hover:text-brand-ink hover:bg-panel2 transition"
        >
          <Icon name={it.icon} size={19} />
          <span className="pointer-events-none absolute right-full mr-2 px-2 py-1 rounded-lg bg-panel border border-line text-[12px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition text-ink shadow-md">
            {it.label}
          </span>
        </button>
      ))}
    </div>
  )
}
