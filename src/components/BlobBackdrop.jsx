// Декоративный фон с текучими формами в сине-стальной гамме (вдохновлён биржевыми
// баннерами). Чисто визуальный слой, не мешает кликам. Приглушается на светлой теме.

const blobs = [
  { c1: '#4789e6', c2: '#2f6fed', size: 360, top: '-30%', left: '6%', delay: '0s' },
  { c1: '#38bdf8', c2: '#22d3ee', size: 300, top: '-10%', left: '42%', delay: '-4s' },
  { c1: '#6366f1', c2: '#4f46e5', size: 320, top: '-40%', left: '70%', delay: '-9s' },
  { c1: '#0ea5e9', c2: '#3b82f6', size: 260, top: '20%', left: '88%', delay: '-13s' },
]

export default function BlobBackdrop() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent)]"
      style={{ opacity: 'var(--blob-opacity, 0.28)' }}
      aria-hidden="true"
    >
      {blobs.map((b, i) => (
        <div
          key={i}
          className="blob absolute rounded-full blur-3xl"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            animationDelay: b.delay,
            background: `radial-gradient(circle at 35% 35%, ${b.c1}, ${b.c2} 60%, transparent 72%)`,
          }}
        />
      ))}
    </div>
  )
}
