import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

export default function Modal({ open, onClose, title, icon, children }) {
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/55 fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-panel border border-line rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[88dvh] overflow-y-auto slide-over sm:animate-none">
        <header className="sticky top-0 bg-panel/95 backdrop-blur border-b border-line px-5 py-3.5 flex items-center justify-between">
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
      </div>
    </div>,
    document.body,
  )
}
