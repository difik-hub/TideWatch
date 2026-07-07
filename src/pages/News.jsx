import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'
import Icon from '../components/Icon'
import { CHANGELOG } from '../config/changelog'
import { fetchCryptoNews } from '../lib/newsApi'
import { useSettings } from '../store/settings'
import { useT } from '../i18n/useT'

const tagStyle = {
  feature: 'bg-brand-soft text-brand-ink',
  improve: 'bg-up/15 text-up',
  fix: 'bg-panel2 text-soft',
}

function SectionTitle({ icon, children }) {
  return (
    <h2 className="text-[13px] font-semibold text-soft uppercase tracking-wide mb-3 flex items-center gap-2">
      <Icon name={icon} size={15} className="text-brand-ink" />
      {children}
    </h2>
  )
}

export default function News() {
  const { lang } = useSettings()
  const t = useT()
  const [news, setNews] = useState(null)

  useEffect(() => {
    let alive = true
    fetchCryptoNews().then((n) => alive && setNews(n)).catch(() => alive && setNews([]))
    return () => { alive = false }
  }, [])

  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return d }
  }
  const tagLabel = { feature: t('tagFeature'), improve: t('tagImprove'), fix: t('tagFix') }

  return (
    <div className="min-h-[100dvh] page">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-5">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-soft hover:text-ink mb-5">
          <Icon name="back" size={16} /> {t('back')}
        </Link>

        <h1 className="text-2xl font-bold mb-6">{t('newsTitle')}</h1>

        {/* Наши обновления */}
        <section className="mb-9">
          <SectionTitle icon="wave">{t('newsUpdates')}</SectionTitle>
          <div className="space-y-3">
            {CHANGELOG.map((e, i) => (
              <div key={i} className="card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${tagStyle[e.tag] || tagStyle.improve}`}>
                    {tagLabel[e.tag] || e.tag}
                  </span>
                  <span className="text-[11px] text-faint tnum">{fmtDate(e.date)}</span>
                </div>
                <div className="text-[15px] font-semibold">{e.title[lang] ?? e.title.en}</div>
                <p className="text-[13px] text-soft leading-relaxed mt-1">{e.text[lang] ?? e.text.en}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Крипторынок (CryptoPanic) */}
        <section className="mb-10">
          <SectionTitle icon="about">{t('newsMarket')}</SectionTitle>
          {news === null && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          )}
          {news !== null && news.length === 0 && (
            <div className="card rounded-2xl p-5 text-center text-soft text-sm">{t('newsMarketSoon')}</div>
          )}
          {news !== null && news.length > 0 && (
            <div className="space-y-2">
              {news.map((n, i) => (
                <a
                  key={i}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-link block rounded-xl p-3.5"
                >
                  <div className="text-[14px] font-medium leading-snug">{n.title}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {n.source && <span className="text-[11px] text-faint">{n.source}</span>}
                    {n.published && <span className="text-[11px] text-faint tnum">· {fmtDate(n.published)}</span>}
                    {n.currencies?.map((c) => (
                      <span key={c} className="text-[10px] font-semibold uppercase text-brand-ink bg-brand-soft px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
