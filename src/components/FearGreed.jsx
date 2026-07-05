import { useEffect, useState } from 'react'
import { fetchFearGreed } from '../lib/api'
import { useT } from '../i18n/useT'
import InfoTip from './InfoTip'

// Полукруглый gauge индекса страха и жадности (0–100).
export default function FearGreed() {
  const t = useT()
  const [fng, setFng] = useState(null)

  useEffect(() => {
    let alive = true
    fetchFearGreed().then((d) => { if (alive) setFng(d) }).catch(() => {})
    return () => { alive = false }
  }, [])

  if (!fng || fng.value == null) return null

  const v = Math.max(0, Math.min(100, fng.value))
  const bandKey = v < 25 ? 'fngExtremeFear' : v < 45 ? 'fngFear' : v < 55 ? 'fngNeutral' : v < 75 ? 'fngGreed' : 'fngExtremeGreed'
  const color = v < 25 ? '#f6465d' : v < 45 ? '#f0913a' : v < 55 ? '#e6c84f' : v < 75 ? '#7cc86a' : '#16c784'

  // Геометрия полукруга
  const cx = 100, cy = 100, r = 78
  const a = Math.PI * (1 - v / 100) // 180°→0°
  const nx = cx + r * Math.cos(a)
  const ny = cy - r * Math.sin(a)

  return (
    <div className="card rounded-2xl p-4 flex items-center gap-4">
      <svg width="128" height="76" viewBox="0 0 200 112" className="shrink-0">
        <defs>
          <linearGradient id="fngGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f6465d" />
            <stop offset="35%" stopColor="#f0913a" />
            <stop offset="50%" stopColor="#e6c84f" />
            <stop offset="70%" stopColor="#7cc86a" />
            <stop offset="100%" stopColor="#16c784" />
          </linearGradient>
        </defs>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="url(#fngGrad)" strokeWidth="12" strokeLinecap="round" />
        {/* Стрелка */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="var(--ink)" />
      </svg>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-faint flex items-center gap-1.5">{t('fngTitle')}<InfoTip text={t('tipFng')} /></div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tnum" style={{ color }}>{v}</span>
          <span className="text-sm font-medium" style={{ color }}>{t(bandKey)}</span>
        </div>
      </div>
    </div>
  )
}
