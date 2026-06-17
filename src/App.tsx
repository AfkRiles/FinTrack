import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { Sidebar } from './components/layout/Sidebar'
import { IncomePage } from './pages/Income'
import { NetWorthPage } from './pages/NetWorth'
import { StatsPage } from './pages/Stats'
import { SettingsModal } from './pages/Settings'
import { seedDefaultCategories } from './lib/db'
import { seedImportedData } from './lib/seedData'
import { ensureFXRate } from './lib/fx'

export default function App() {
  const { activeTab, theme, setFXRate } = useAppStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Theme management
  useEffect(() => {
    const root = document.documentElement
    const apply = (t: string) => {
      if (t === 'dark') root.classList.add('dark')
      else if (t === 'light') root.classList.remove('dark')
      else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) root.classList.add('dark')
        else root.classList.remove('dark')
      }
    }
    apply(theme)
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  // Boot: seed categories, import data, fetch FX
  useEffect(() => {
    Promise.all([
      seedDefaultCategories(),
      seedImportedData(),
    ]).then(() => setMounted(true))
    ensureFXRate().then(rate => setFXRate({ usdToZar: rate, fetchedAt: Date.now() }))
  }, [])

  if (!mounted) {
    return (
      <div className="mesh-bg h-dvh w-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 fab rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="text-[var(--text-muted)] text-sm animate-pulse">Loading FinTrack…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mesh-bg h-dvh w-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col relative z-10">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-[var(--border)]">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {activeTab === 'income' && 'Income Dashboard'}
              {activeTab === 'networth' && 'Net Worth'}
              {activeTab === 'stats' && 'Analytics'}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          <div key={activeTab} className="h-full page-enter">
            {activeTab === 'income' && <IncomePage />}
            {activeTab === 'networth' && <NetWorthPage />}
            {activeTab === 'stats' && <StatsPage />}
          </div>
        </div>
      </main>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
