import { useState } from 'react'
import Modal from './Modal'
import { useUI } from '../store/ui'
import { useT } from '../i18n/useT'
import { SITE } from '../config/site'

// Модалка «Предложить идею». Отправка «в фоне» через FormSubmit (бесплатный
// форм-сервис: POST → письмо на почту, юзеру никуда переходить не надо).
// Если сервис недоступен — фолбэк на почтовый клиент (mailto).
export default function Feedback() {
  const ui = useUI()
  const open = ui.isOpen('feedback')
  const t = useT()
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)

  const finish = () => {
    setDone(true)
    setTimeout(() => { setDone(false); setText(''); ui.close() }, 1400)
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${SITE.feedbackEmail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: 'TideWatch — идея', message: body }),
      })
      if (!res.ok) throw new Error('formsubmit failed')
      finish()
    } catch {
      // Фолбэк: открыть почтовый клиент
      window.location.href = `mailto:${SITE.feedbackEmail}?subject=${encodeURIComponent('TideWatch — идея')}&body=${encodeURIComponent(body)}`
      finish()
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={ui.close} title={t('feedbackTitle')} icon="about">
      {done ? (
        <div className="text-center py-8 text-up font-medium">{t('feedbackThanks')}</div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-soft">{t('feedbackDesc')}</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('feedbackPlaceholder')}
            rows={5}
            className="w-full bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand/60 resize-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-full py-2.5 rounded-xl bg-brand text-white font-medium text-sm hover:opacity-90 active:scale-[0.99] transition disabled:opacity-40"
          >
            {sending ? '…' : t('feedbackSend')}
          </button>
        </div>
      )}
    </Modal>
  )
}
