import { useEffect, useRef, useState } from 'react'

// Плавно «прокручивает» число от старого к новому и подсвечивает направление.
// На первом рендере не анимирует (показывает значение сразу).
export default function AnimatedNumber({ value, format = (n) => n, duration = 600, className = '', flash = true }) {
  const [display, setDisplay] = useState(value)
  const [dir, setDir] = useState(null) // 'up' | 'down' | null
  const prevRef = useRef(value)
  const rafRef = useRef(0)
  const flashTimer = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to || from == null || to == null || isNaN(from) || isNaN(to)) {
      setDisplay(to)
      prevRef.current = to
      return
    }

    if (flash) {
      setDir(to > from ? 'up' : 'down')
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setDir(null), 800)
    }

    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setDisplay(from + (to - from) * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else prevRef.current = to
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration, flash])

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); clearTimeout(flashTimer.current) }, [])

  const flashColor = dir === 'up' ? 'text-up' : dir === 'down' ? 'text-down' : ''
  return (
    <span className={`${className} ${flashColor}`} style={{ transition: 'color 0.5s ease' }}>
      {format(display)}
    </span>
  )
}
