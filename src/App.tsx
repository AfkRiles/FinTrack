import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { TabBar } from './components/layout/TabBar'
import { IncomePage } from './pages/Income'
import { NetWorthPage } from './pages/NetWorth'
import { StatsPage } from './pages/Stats'
import { SettingsModal } from './pages/Settings'
import { seedDefaultCategories } from './lib/db'
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
      const handler = (e: MediaQueryListEvent) => { if (theme === 'system') apply(e.matches ? 'dark' : 'light') }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  // Boot
  useEffect(() => {
    seedDefaultCategories().then(() => setMounted(true))
    ensureFXRate().then(rate => setFXRate({ usdToZar: rate, fetchedAt: Date.now() }))
  }, [])

  if (!mounted) {
    return (
      <div className="mesh-bg h-dvh w-screen flex items-center justify-center">
        <div className="text-[var(--text-muted)] text-sm animate-pulse">Loading FinTrack…</div>
      </div>
    )
  }

  return (
    <div className="mesh-bg h-dvh w-screen flex flex-col overflow-hidden">
      {/* Header bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 relative z-20"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <div />
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={() => {
              const store = useAppStore.getState()
              const next = store.theme === 'dark' ? 'light' : 'dark'
              store.setTheme(next)
            }}
            className="w-9 h-9 glass-sm rounded-full flex items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            {theme === 'dark'
              ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 3v1m0 16v1m8.66-10H21M3 12H2m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </button>
          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 glass-sm rounded-full flex items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 relative z-10 overflow-hidden">
        <div key={activeTab} className="h-full">
          {activeTab === 'income' && <IncomePage />}
          {activeTab === 'networth' && <NetWorthPage />}
          {activeTab === 'stats' && <StatsPage />}
        </div>
      </div>

      {/* Tab bar */}
      <TabBar onOpenSettings={() => setSettingsOpen(true)} />

      {/* Settings */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
