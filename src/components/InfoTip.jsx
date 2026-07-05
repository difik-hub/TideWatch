import { useEffect, useRef, useState } from 'react'

// Маленькая (i)-подсказка для новичков: тап/клик — всплывает объяснение
// термина простым языком. Закрывается по клику снаружи или Esc.
export default function InfoTip({ text }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label="?"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
        className={`grid place-items-center w-4 h-4 rounded-full border text-[9px] font-bold leading-none transition ${
          open ? 'border-brand text-brand-ink bg-brand-soft' : 'border-line text-faint hover:text-soft hover:border-line-strong'
        }`}
      >
        i
      </button>
      {open && (
        <span className="absolute left-1/2 -translate-x-1/2 top-6 z-50 w-56 rounded-xl bg-panel border border-line-strong shadow-xl p-3 text-[12px] leading-relaxed text-ink normal-case tracking-normal font-normal text-left">
          {text}
        </span>
      )}
    </span>
  )
}
