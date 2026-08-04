import { useMemo } from 'react'
import Icon from './Icon'
import { forecast } from '../lib/forecast'
import { useT } from '../i18n/useT'

const tone = {
  up: { text: 'text-up', border: 'border-up/40', bg: 'bg-up/10' },
  down: { text: 'text-down', border: 'border-down/40', bg: 'bg-down/10' },
  flat: { text: 'text-soft', border: 'border-line', bg: 'bg-panel2' },
}

// Технический сигнал по истории цен. Показываем не только вердикт, но и каждый
// пункт, из которого он сложился: вывод должен быть проверяемым, иначе это
// гадание. Формулировки намеренно осторожные — «скорее», а не «будет».
export default function Forecast({ prices, range52 = null }) {
  const t = useT()
  const f = useMemo(() => forecast(prices, range52), [prices, range52])
  if (!f) return null

  const c = tone[f.verdict]
  const verdictLabel = f.verdict === 'up' ? t('fcUp') : f.verdict === 'down' ? t('fcDown') : t('fcFlat')

  return (
    <section className="mb-6">
      <h2 className="text-[13px] font-semibold text-soft uppercase tracking-wide mb-2.5 flex items-center gap-2">
        <Icon name="movement" size={15} className="text-brand-ink" />
        {t('fcTitle')}
      </h2>

      <div className="border border-line bg-panel">
        <div className={`flex items-center gap-2 px-3 py-2 border-b border-line ${c.bg}`}>
          <span className={`text-[15px] font-bold ${c.text}`}>{verdictLabel}</span>
          <span className="text-[11px] text-faint tnum ml-auto">{f.score > 0 ? '+' : ''}{f.score}</span>
        </div>

        <ul className="px-3 py-2 space-y-1">
          {f.signals.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px]">
              <span
                className={`mt-1.5 w-1.5 h-1.5 shrink-0 ${
                  s.good === true ? 'bg-up' : s.good === false ? 'bg-down' : 'bg-faint'
                }`}
              />
              <span className="text-soft">{t(s.key, { v: s.v })}</span>
            </li>
          ))}
        </ul>

        <div className="px-3 py-2 border-t border-line text-[11px] text-faint leading-relaxed">
          {t('fcDisclaimer')}
        </div>
      </div>
    </section>
  )
}
