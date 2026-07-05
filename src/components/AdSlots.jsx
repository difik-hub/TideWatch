import Icon from './Icon'
import { ADS, AD_RATIO } from '../config/ads'

// Боковые баннеры. Ширина адаптивная (var(--ad-w)). Высота — по самой картинке,
// поэтому ЛЮБОЙ баннер вписывается идеально (без пустых полей и обрезки).
// Если задан href — кликабельны (ховер-подъём). Видны только на широких экранах.
function Slot({ side }) {
  const ad = ADS[side] || {}
  // Прижато к гуттеру: 360px = половина контента (336) + зазор (24)
  const offset = 'calc(50% - 360px - var(--ad-w))'
  const anchor = side === 'left' ? { left: offset } : { right: offset }
  // Ширина фиксированная, высота от картинки; ограничиваем по высоте экрана
  const size = { width: 'var(--ad-w)', maxHeight: 'calc(100dvh - 8rem)' }
  const emptySize = { width: 'var(--ad-w)', aspectRatio: String(AD_RATIO) }

  const inner = ad.img ? (
    <img src={ad.img} alt={ad.alt || 'Реклама'} className="block w-full h-auto max-h-[calc(100dvh-8rem)] object-contain" loading="lazy" />
  ) : (
    <div className="w-full grid place-items-center text-faint/40" style={emptySize}>
      <Icon name="grid" size={28} />
    </div>
  )

  const baseCls = 'block rounded-2xl overflow-hidden border border-line'

  return (
    <aside className="hidden xl:block fixed top-40 z-10" style={anchor}>
      {ad.img && ad.href ? (
        <a
          href={ad.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className={`${baseCls} group relative transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]`}
          style={size}
        >
          {inner}
          <span className="absolute inset-0 ring-0 group-hover:ring-2 ring-brand/50 rounded-2xl transition" />
        </a>
      ) : (
        <div className={`${baseCls} ${ad.img ? '' : 'border-dashed bg-panel/30 backdrop-blur-sm'}`} style={size} aria-hidden={!ad.img}>
          {inner}
        </div>
      )}
      <div className="mt-1 text-center text-[10px] uppercase tracking-wide text-faint/50">Реклама</div>
    </aside>
  )
}

export default function AdSlots() {
  return (
    <>
      <Slot side="left" />
      <Slot side="right" />
    </>
  )
}
