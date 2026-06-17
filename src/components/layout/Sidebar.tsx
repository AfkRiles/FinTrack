import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Tab } from '../../types'
import { AddIncomeSheet } from '../income/AddIncomeSheet'

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'income',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'networth',
    label: 'Net Worth',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 12h.01" strokeLinecap="round" />
        <path d="M1 7l3-4h16l3 4" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M18 20V10" strokeLinecap="round" />
        <path d="M12 20V4" strokeLinecap="round" />
        <path d="M6 20v-6" strokeLinecap="round" />
      </svg>
    ),
  },
]

interface SidebarProps {
  onOpenSettings: () => void
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const { activeTab, setActiveTab, theme, setTheme } = useAppStore()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <aside className="w-60 flex-shrink-0 flex flex-col h-full glass border-r border-[var(--border)] relative z-20">
        {/* Logo */}
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-9 h-9 fab rounded-xl flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-base text-[var(--text-primary)] leading-tight">FinTrack</div>
            <div className="text-[10px] text-[var(--text-muted)] font-medium">Personal Finance</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(item => {
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-[#00C27C] text-white shadow-[0_4px_16px_rgba(0,194,124,0.3)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Add Entry button */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setAddOpen(true)}
            className="w-full fab rounded-2xl py-3 flex items-center justify-center gap-2 text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add Entry
          </button>
        </div>

        {/* Bottom controls */}
        <div className="px-3 pb-5 flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
          >
            {theme === 'dark'
              ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            }
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={onOpenSettings}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </button>
        </div>
      </aside>

      <AddIncomeSheet isOpen={addOpen} onClose={() => setAddOpen(false)} onSaved={() => {}} />
    </>
  )
}
