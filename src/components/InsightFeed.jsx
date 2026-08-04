import { Link } from 'react-router-dom'
import Sparkline from './Sparkline'
import TickerLogo from './TickerLogo'

const tone = {
  up: 'border-l-up',
  down: 'border-l-down',
  neutral: 'border-l-brand',
}

// Лента наблюдений: каждая карточка говорит фразой, а не строкой таблицы.
// Цифра, из которой сделан вывод, всегда рядом — иначе это гадание, а не факт.
export default function InsightFeed({ items, assets }) {
  if (!items.length) return null

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((it) => {
        const asset = it.href ? assets.get(it.href) : null
        const spark = asset?.sparkline_in_7d?.price
        const Card = it.href ? Link : 'div'

        return (
          <Card
            key={it.id}
            {...(it.href ? { to: it.href } : {})}
            className={`border border-line border-l-2 ${tone[it.tone] || tone.neutral} bg-panel px-3 py-2.5 flex gap-3 items-start ${
              it.href ? 'hover:bg-panel2 transition' : ''
            }`}
          >
            {asset && <TickerLogo src={asset.image} symbol={asset.symbol} size={26} />}

            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold leading-snug text-ink">{it.title}</span>
              <span className="block text-[12px] text-soft leading-snug mt-0.5">{it.body}</span>
            </span>

            {spark && spark.length > 1 && (
              <span className="shrink-0 opacity-70 mt-0.5">
                <Sparkline
                  data={spark}
                  width={54}
                  height={20}
                  fluid={false}
                  color={it.tone === 'down' ? 'var(--down)' : it.tone === 'up' ? 'var(--up)' : 'var(--soft)'}
                />
              </span>
            )}
          </Card>
        )
      })}
    </div>
  )
}
