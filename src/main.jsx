import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { SettingsProvider } from './store/settings'
import { AuthProvider } from './store/auth'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  </React.StrictMode>,
)

// Производительность: на время скролла помечаем <html>, чтобы CSS отключил
// дорогой backdrop-blur и паузил фоновые анимации (плавный скролл в браузере).
let __scrollTimer
window.addEventListener(
  'scroll',
  () => {
    const root = document.documentElement
    if (!root.classList.contains('is-scrolling')) root.classList.add('is-scrolling')
    clearTimeout(__scrollTimer)
    __scrollTimer = setTimeout(() => root.classList.remove('is-scrolling'), 150)
  },
  { passive: true },
)

// PWA: регистрируем service worker только в проде (в dev мешал бы HMR)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// Перехватываем приглашение установки, чтобы показать свою кнопку «Установить»
window.__deferredInstall = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__deferredInstall = e
  window.dispatchEvent(new Event('tidewatch:installable'))
})
