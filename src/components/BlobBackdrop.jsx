// Декоративный фон с текучими формами. Чисто визуальный слой, не мешает кликам.
//
// Цвета были синие и фиолетовые — остались от прежней палитры и торчали в меню
// чужим пятном после перехода на оранжевый. Теперь гамма своя: два тёплых пятна
// в тон акценту и два графитовых, чтобы свечение не выглядело пожаром.
const blobs = [
  { c1: '#ff5a1f', c2: '#c2410c', size: 360, top: '-30%', left: '6%', delay: '0s' },
  { c1: '#3f3f46', c2: '#27272a', size: 300, top: '-10%', left: '42%', delay: '-4s' },
  { c1: '#f59e0b', c2: '#b45309', size: 320, top: '-40%', left: '70%', delay: '-9s' },
  { c1: '#52525b', c2: '#3f3f46', size: 260, top: '20%', left: '88%', delay: '-13s' },
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
