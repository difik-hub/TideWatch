import { memo, useEffect, useRef, useState } from 'react'

// Лёгкая live-цена: при изменении значение мигает зелёным/красным через CSS.
// Без requestAnimationFrame-прокрутки — сотня таких на странице не тормозит
// даже слабые браузеры (в отличие от count-up анимаций).
function LivePrice({ value, format, className = '' }) {
  const prev = useRef(value)
  const [dir, setDir] = useState(null)
  const timer = useRef(0)

  useEffect(() => {
    if (value == null || prev.current == null || value === prev.current) {
      prev.current = value
      return
    }
    setDir(value > prev.current ? 'up' : 'down')
    prev.current = value
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDir(null), 700)
    return () => clearTimeout(timer.current)
  }, [value])

  const cls = dir === 'up' ? 'text-up' : dir === 'down' ? 'text-down' : ''
  return (
    <span className={`${className} ${cls}`} style={{ transition: 'color 0.45s ease' }}>
      {format(value)}
    </span>
  )
}

export default memo(LivePrice)
