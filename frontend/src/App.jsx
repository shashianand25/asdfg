import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Navbar from './components/Navbar'
import Chatbot from './components/Chatbot'
import OverviewPage from './pages/OverviewPage'
import ForecastPage from './pages/ForecastPage'
import AccuracyPage from './pages/AccuracyPage'
import MethodologyPage from './pages/MethodologyPage'

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('2026-01-15')

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface-bg">
        <Navbar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onMenuClick={() => setMobileOpen((open) => !open)}
        />

        <div className="main-layout">
          <Routes>
            <Route path="/" element={<OverviewPage onMenuClick={() => setMobileOpen(true)} />} />
            <Route
              path="/forecast"
              element={
                <ForecastPage
                  onMenuClick={() => setMobileOpen(true)}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                />
              }
            />
            <Route path="/accuracy" element={<AccuracyPage onMenuClick={() => setMobileOpen(true)} />} />
            <Route path="/methodology" element={<MethodologyPage onMenuClick={() => setMobileOpen(true)} />} />
          </Routes>
        </div>

        <Chatbot selectedDate={selectedDate} />
      </div>
    </BrowserRouter>
  )
}
