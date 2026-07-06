import { useState } from 'react'
import Icon from './Icon'
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

  return (
    <div className="rise-in mb-4 rounded-2xl border border-brand/25 bg-brand-soft/60 p-4 flex items-start gap-3">
      <span className="grid place-items-center w-8 h-8 rounded-xl bg-brand text-white shrink-0">
        <Icon name="wave" size={17} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{t('onbTitle')}</div>
        <p className="text-[13px] text-soft mt-0.5 leading-relaxed">{t('onbText')}</p>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-brand text-white text-[13px] font-medium hover:opacity-90 transition"
      >
        {t('onbGot')}
      </button>
    </div>
  )
}
