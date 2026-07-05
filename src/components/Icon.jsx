// Кастомный набор иконок. Единый stroke-вес 1.75, наследуют currentColor.
// Никаких эмодзи в интерфейсе — только это.

const paths = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  settings: <><path d="M4 7h10" /><path d="M18 7h2" /><circle cx="16" cy="7" r="2" /><path d="M4 17h2" /><path d="M10 17h10" /><circle cx="8" cy="17" r="2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.6 2.5 15.4 0 18" /><path d="M12 3c-2.5 2.6-2.5 15.4 0 18" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  back: <path d="m14 6-6 6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  movement: <path d="M3 14l4-5 3 3 4-7 4 9 3-4" />,
  bars: <><path d="M5 20V10" /><path d="M12 20V4" /><path d="M19 20v-6" /></>,
  about: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14-5l-2 2" /><path d="M4 13a8 8 0 0 0 14 5l2-2" /><path d="M4 4v4h4" /><path d="M20 20v-4h-4" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4 10-11" />,
  wave: <><path d="M3 13c2.5 0 2.5-4 5.5-4s3 4 5.5 4 2.5-4 5.5-4" /><path d="M3 18c2.5 0 2.5-3 5.5-3s3 3 5.5 3 2.5-3 5.5-3" opacity="0.55" /></>,
  coins: <><circle cx="9" cy="9" r="5.5" /><path d="M14.5 5.3A5.5 5.5 0 1 1 15 18.5" /></>,
  arrowUpRight: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  swap: <><path d="M7 4 4 7l3 3" /><path d="M4 7h13" /><path d="m17 20 3-3-3-3" /><path d="M20 17H7" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10.5 19a2 2 0 0 0 3 0" /></>,
  compare: <><path d="M12 3v18" /><path d="M5 8 8 5l3 3" /><path d="M8 5v9" /><path d="m19 16-3 3-3-3" /><path d="M16 19v-9" /></>,
  share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" /></>,
  check2: <path d="M5 12l4 4 10-11" />,
}

export default function Icon({ name, size = 18, className = '', strokeWidth = 1.75, ...rest }) {
  const d = paths[name]
  if (!d) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {d}
    </svg>
  )
}

// Стрелки тренда — заливкой, отдельно (чётче читаются в плотных данных)
export function TrendArrow({ dir, size = 12, className = '' }) {
  if (dir === 'flat') {
    return (
      <svg width={size} height={size} viewBox="0 0 12 12" className={className} aria-hidden="true">
        <rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor" />
      </svg>
    )
  }
  const up = dir === 'rise'
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" className={className} aria-hidden="true">
      <path d={up ? 'M6 2l4 6H2z' : 'M6 10 2 4h8z'} fill="currentColor" />
    </svg>
  )
}
