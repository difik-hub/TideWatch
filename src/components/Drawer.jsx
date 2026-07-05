import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

// Правая выезжающая панель (slide-over). Для «компаньонов» — портфель, конвертер.
export default function Drawer({ open, onClose, title, icon, children, width = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/45 fade-in" onClick={onClose} />
      {/* Плавающая панель справа — высота по контенту (не во всю страницу), со смещением вниз */}
      <aside className={`slide-over fixed right-3 sm:right-4 top-20 max-h-[calc(100dvh-6rem)] w-[calc(100%-1.5rem)] sm:w-full ${width} bg-panel border border-line rounded-2xl shadow-2xl overflow-y-auto`}>
        <header className="sticky top-0 bg-panel/95 backdrop-blur border-b border-line px-5 py-3.5 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-base font-semibold flex items-center gap-2">
            {icon && <Icon name={icon} size={18} className="text-brand-ink" />}
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 grid place-items-center rounded-lg text-soft hover:text-ink hover:bg-panel2 transition"
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </aside>
    </div>,
    document.body,
  )
}
