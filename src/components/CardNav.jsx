import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Icon from './Icon'
import BlobBackdrop from './BlobBackdrop'
import './CardNav.css'

// Адаптация CardNav (React Bits) под TideWatch: раскрывающаяся капсула-навбар
// с GSAP-анимацией. Ссылки работают через onClick (навигация/модалки), не href.
export default function CardNav({ brand, items = [], ctaLabel, ctaIcon, onCta, extraAction, ease = 'power3.out' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const navRef = useRef(null)
  const cardsRef = useRef([])
  const tlRef = useRef(null)
  const openRef = useRef(false) // фактическое состояние (синхронно, не отстаёт как state)

  // Высота капсулы считается по реальному контенту (и на десктопе, и на мобиле),
  // чтобы карточки с разным числом ссылок не вылазили за пределы.
  const calcHeight = () => {
    const navEl = navRef.current
    if (!navEl) return 240
    const content = navEl.querySelector('.card-nav-content')
    if (!content) return 240
    const prev = {
      v: content.style.visibility, p: content.style.pointerEvents,
      pos: content.style.position, h: content.style.height,
    }
    content.style.visibility = 'visible'
    content.style.pointerEvents = 'auto'
    content.style.position = 'static'
    content.style.height = 'auto'
    void content.offsetHeight // принудительный reflow
    const h = 60 + content.scrollHeight + 16 // topbar + контент + padding
    content.style.visibility = prev.v
    content.style.pointerEvents = prev.p
    content.style.position = prev.pos
    content.style.height = prev.h
    // Не выше экрана: если контент больше — внутри включается скролл (CSS)
    const maxH = window.innerHeight - 84
    return Math.min(Math.max(h, 200), maxH)
  }

  const buildTimeline = () => {
    const navEl = navRef.current
    if (!navEl) return null
    gsap.set(navEl, { height: 60, overflow: 'hidden' })
    gsap.set(cardsRef.current, { y: 40, opacity: 0 })
    const tl = gsap.timeline({ paused: true })
    tl.to(navEl, { height: calcHeight, duration: 0.4, ease })
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.07 }, '-=0.12')
    return tl
  }

  useLayoutEffect(() => {
    const tl = buildTimeline()
    tlRef.current = tl
    return () => { tl?.kill(); tlRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  useLayoutEffect(() => {
    const onResize = () => {
      if (!tlRef.current) return
      tlRef.current.kill()
      const tl = buildTimeline()
      if (tl) {
        if (isOpen) tl.progress(1)
        tlRef.current = tl
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches

  // Детерминированное переключение: опираемся на openRef (синхронный), а не на
  // state, который может отставать во время анимации → гамбургер не «залипает».
  // На мобилке GSAP-замеры высоты глючат (iOS Safari) — там просто toggle:
  // высоту ведёт CSS (height:auto !important), карточки раскрыты целиком.
  const toggle = () => {
    if (isMobile()) {
      const opening = !openRef.current
      openRef.current = opening
      setHamburgerOpen(opening)
      setIsOpen(opening)
      gsap.set(cardsRef.current, { y: 0, opacity: 1 })
      if (!opening) gsap.set(navRef.current, { height: 60 })
      return
    }
    const tl = tlRef.current
    if (!tl) return
    if (!openRef.current) {
      openRef.current = true
      setHamburgerOpen(true)
      setIsOpen(true)
      tl.play(0)
    } else {
      openRef.current = false
      setHamburgerOpen(false)
      tl.eventCallback('onReverseComplete', () => setIsOpen(false))
      tl.reverse()
    }
  }

  // Закрыть меню (после клика по ссылке)
  const close = () => {
    if (!openRef.current) return
    if (isMobile()) {
      openRef.current = false
      setHamburgerOpen(false)
      setIsOpen(false)
      gsap.set(navRef.current, { height: 60 })
      return
    }
    const tl = tlRef.current
    if (!tl) return
    openRef.current = false
    setHamburgerOpen(false)
    tl.eventCallback('onReverseComplete', () => setIsOpen(false))
    tl.reverse()
  }

  const setCardRef = (i) => (el) => { if (el) cardsRef.current[i] = el }

  return (
    <div className="card-nav-container">
      <nav ref={navRef} className={`card-nav ${isOpen ? 'open' : ''}`}>
        {isOpen && <div className="cardnav-blobs"><BlobBackdrop /></div>}
        <div className="card-nav-top">
          <div
            className={`hamburger-menu ${hamburgerOpen ? 'open' : ''} text-soft`}
            onClick={toggle}
            role="button"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle()}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div className="cardnav-brand">{brand}</div>

          <div className="flex items-center gap-2">
            {extraAction}
            <button
              type="button"
              className="card-nav-cta-button bg-brand text-white"
              onClick={onCta}
              aria-label={ctaLabel}
            >
              {ctaIcon && <Icon name={ctaIcon} size={15} />}
              <span className="cta-text">{ctaLabel}</span>
            </button>
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isOpen}>
          {items.slice(0, 3).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ backgroundColor: item.bg, color: item.fg }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <button
                    key={`${lnk.label}-${i}`}
                    type="button"
                    className="nav-card-link"
                    aria-label={lnk.ariaLabel || lnk.label}
                    onClick={() => { lnk.onClick?.(); close() }}
                  >
                    <Icon name="arrowUpRight" size={15} className="nav-card-link-icon" />
                    {lnk.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
