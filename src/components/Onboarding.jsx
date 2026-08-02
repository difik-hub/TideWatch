import { useState } from 'react'
import { useT } from '../i18n/useT'

const KEY = 'tidewatch:onboarded'

// Одноразовая подсказка новичку над лентой: как пользоваться сайтом.
export default function Onboarding() {
  const t = useT()
  const [hidden, setHidden] = useState(() => localStorage.getItem(KEY) === '1')
  if (hidden) return null

  const dismiss = () => {
    localStorage.setItem(KEY, '1')
    setHidden(true)
  }

  // Одна строка вместо панели: подсказка нужна ровно один раз и не должна
  // отодвигать ленту вниз. Акцентом красим только кнопку, не всю плашку.
  return (
    <div className="mb-1.5 border border-line bg-panel px-3 py-1.5 flex items-center gap-2.5 text-[12px]">
      <span className="text-soft min-w-0 flex-1 truncate">
        <span className="text-ink font-semibold mr-1.5">{t('onbTitle')}</span>
        {t('onbText')}
      </span>
      <button
        onClick={dismiss}
        className="shrink-0 px-2.5 py-1 border border-line text-soft hover:text-ink hover:border-line-strong transition text-[11px] font-medium"
      >
        {t('onbGot')}
      </button>
    </div>
  )
}
