import { useState } from 'react'

// Логотип монеты/акции с фолбэком на монограмму, если картинка не загрузилась
// (FMP-лого иногда 404). size — сторона в px.
export default function TickerLogo({ src, symbol, size = 24, className = '' }) {
  const [failed, setFailed] = useState(false)
  const px = { width: size, height: size }

  if (!src || failed) {
    return (
      <span
        style={{ ...px, fontSize: Math.round(size * 0.36) }}
        className={`grid place-items-center rounded-full shrink-0 bg-brand-soft text-brand-ink font-bold uppercase ${className}`}
      >
        {String(symbol || '').slice(0, 2)}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      style={px}
      className={`rounded-full shrink-0 object-contain bg-white/5 ${className}`}
    />
  )
}
