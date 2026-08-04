import { Routes, Route, Navigate } from 'react-router-dom'
import Overview from './pages/Overview'
import Feed from './pages/Feed'
import CoinPage from './pages/CoinPage'
import StockPage from './pages/StockPage'
import News from './pages/News'
import Compare from './pages/Compare'
import Heatmap from './pages/Heatmap'
import Settings from './components/Settings'
import Converter from './components/Converter'
import Alerts from './components/Alerts'
import Portfolio from './components/Portfolio'
import Feedback from './components/Feedback'
import { UIProvider, useUI } from './store/ui'

function GlobalOverlays() {
  const ui = useUI()
  return (
    <>
      <Settings open={ui.isOpen('settings')} onClose={ui.close} />
      <Converter />
      <Alerts />
      <Portfolio />
      <Feedback />
    </>
  )
}

export default function App() {
  return (
    <UIProvider>
      <Routes>
        {/* Главная — снова лента: капитал в роли первого экрана держался на
            позициях, которых у нового человека нет, и страница выглядела пустой.
            Рынок наполнен всегда, а капитал теперь идёт полосой над лентой и
            разворачивается в «Обзор» тем, кому есть что показывать. */}
        <Route path="/" element={<Feed />} />
        <Route path="/markets" element={<Navigate to="/" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/coin/:id" element={<CoinPage />} />
        <Route path="/stock/:sym" element={<StockPage />} />
        <Route path="/news" element={<News />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/heatmap" element={<Heatmap />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalOverlays />
    </UIProvider>
  )
}
