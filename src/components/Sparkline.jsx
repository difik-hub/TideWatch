// Лёгкий SVG-спарклайн без зависимостей — для карточек в ленте.
// width/height задают внутреннюю систему координат; svg тянется на 100% ширины контейнера.

export default function Sparkline({ data, width = 300, height = 48, color, fluid = true }) {
  if (!data || data.length < 2) {
    return <div style={{ width: fluid ? '100%' : width, height }} />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * height
    return [x, y]
  })

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`

  const up = data[data.length - 1] >= data[0]
  const stroke = color || (up ? 'var(--up)' : 'var(--down)')
  const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`

  return (
    <svg
      width={fluid ? '100%' : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
