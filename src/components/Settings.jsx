import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSettings, LANGS, CURRENCIES, REFRESH_OPTIONS, COIN_COUNTS } from '../store/settings'
import { useAuth } from '../store/auth'
import { useT } from '../i18n/useT'
import { LANG_LABELS } from '../i18n/translations'
import Icon from './Icon'

function Row({ label, children }) {
  return (
    <div className="py-4 border-b border-line last:border-0">
      <div className="text-sm font-medium text-ink mb-2.5">{label}</div>
      {children}
    </div>
  )
}

// Сегментированный переключатель
function Segmented({ options, value, onChange }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className={`py-2 px-1 rounded-lg text-[13px] font-medium transition border ${
              active
                ? 'bg-brand text-white border-transparent'
                : 'bg-panel2 text-soft border-line hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Блок аккаунта: вход/регистрация или инфо о синке
function AccountSection({ t }) {
  const { user, busy, signIn, signUp, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const run = async (fn) => {
    setErr('')
    const { error } = await fn(email.trim(), pass)
    if (error) setErr(error)
  }

  if (user) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 bg-panel2 border border-line rounded-xl px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user.email}</div>
            <div className="text-[11px] text-up flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-up pulse-dot" /> {t('accSynced')}
            </div>
          </div>
          <button onClick={signOut} className="shrink-0 text-sm text-soft hover:text-down transition">{t('accLogout')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-soft">{t('accHint')}</p>
      <input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('accEmail')}
        className="w-full bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60"
      />
      <input
        type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={t('accPass')}
        className="w-full bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60"
      />
      {err && <div className="text-[12px] text-down">{err}</div>}
      <div className="flex gap-2">
        <button
          onClick={() => run(signIn)} disabled={busy || !email || pass.length < 6}
          className="flex-1 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
        >
          {t('accLogin')}
        </button>
        <button
          onClick={() => run(signUp)} disabled={busy || !email || pass.length < 6}
          className="flex-1 py-2 rounded-xl bg-panel2 border border-line text-sm font-medium text-ink hover:border-brand/50 transition disabled:opacity-40"
        >
          {t('accSignup')}
        </button>
      </div>
    </div>
  )
}

export default function Settings({ open, onClose }) {
  const s = useSettings()
  const t = useT()

  // Esc закрывает, блокируем скролл фона
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const refreshLabel = (ms) =>
    ms === 30000 ? t('refresh30') : ms === 60000 ? t('refresh60') : t('refreshManual')

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 fade-in" onClick={onClose} />

      <aside className="slide-over relative w-full max-w-sm h-full bg-panel border-l border-line overflow-y-auto">
        <header className="sticky top-0 bg-panel/95 backdrop-blur border-b border-line px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Icon name="settings" size={18} className="text-brand-ink" />
            {t('setTitle')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('done')}
            className="w-8 h-8 grid place-items-center rounded-lg text-soft hover:text-ink hover:bg-panel2 transition"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="px-5">
          <Row label={t('accTitle')}>
            <AccountSection t={t} />
          </Row>

          <Row label={t('setLanguage')}>
            <div className="grid grid-cols-2 gap-1.5">
              {LANGS.map((l) => {
                const active = l === s.lang
                return (
                  <button
                    key={l}
                    onClick={() => s.update({ lang: l })}
                    className={`py-2 px-3 rounded-lg text-[13px] text-left transition border flex items-center justify-between ${
                      active ? 'bg-brand-soft text-brand-ink border-brand/40' : 'bg-panel2 text-soft border-line hover:text-ink'
                    }`}
                  >
                    {LANG_LABELS[l]}
                    {active && <Icon name="check" size={15} />}
                  </button>
                )
              })}
            </div>
          </Row>

          <Row label={t('setTheme')}>
            <Segmented
              value={s.theme}
              onChange={(v) => s.update({ theme: v })}
              options={[
                { value: 'dark', label: t('themeDark') },
                { value: 'light', label: t('themeLight') },
                { value: 'auto', label: t('themeAuto') },
              ]}
            />
          </Row>

          <Row label={t('setCurrency')}>
            <Segmented
              value={s.currency}
              onChange={(v) => s.update({ currency: v })}
              options={CURRENCIES.map((c) => ({ value: c, label: c.toUpperCase() }))}
            />
          </Row>

          <Row label={t('setRefresh')}>
            <Segmented
              value={s.refresh}
              onChange={(v) => s.update({ refresh: v })}
              options={REFRESH_OPTIONS.map((ms) => ({ value: ms, label: refreshLabel(ms) }))}
            />
          </Row>

          <Row label={t('setCoinCount')}>
            <Segmented
              value={s.coinCount}
              onChange={(v) => s.update({ coinCount: v })}
              options={COIN_COUNTS.map((n) => ({ value: n, label: String(n) }))}
            />
          </Row>

          <Row label={t('setSparklines')}>
            <button
              onClick={() => s.update({ sparklines: !s.sparklines })}
              className={`w-full py-2 px-3 rounded-lg text-[13px] font-medium transition border flex items-center justify-between ${
                s.sparklines ? 'bg-brand-soft text-brand-ink border-brand/40' : 'bg-panel2 text-soft border-line'
              }`}
            >
              <span>{s.sparklines ? t('on') : t('off')}</span>
              <span className={`w-9 h-5 rounded-full transition relative ${s.sparklines ? 'bg-brand' : 'bg-faint/40'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${s.sparklines ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
          </Row>
        </div>

        <div className="px-5 py-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-brand text-white font-medium text-sm hover:opacity-90 active:scale-[0.99] transition"
          >
            {t('done')}
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
