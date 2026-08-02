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
        {/* Главная — капитал пользователя, а не лента: лента живёт на /markets.
            Старые ссылки на «/» со вкладкой акций перенаправляем туда же. */}
        <Route path="/" element={<Overview />} />
        <Route path="/markets" element={<Feed />} />
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
