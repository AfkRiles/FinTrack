import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Tab, Currency } from '../../types'
import { AddIncomeSheet } from '../income/AddIncomeSheet'
import { WalletBook } from '../sidebar/WalletBook'

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'income',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2}>
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
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2}>
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
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2}>
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
  const { activeTab, setActiveTab, theme, setTheme, currency, setCurrency, fxRate } = useAppStore()
  const [addOpen, setAddOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [usdVal, setUsdVal] = useState('')
  const [zarVal, setZarVal] = useState('')

  const rate = fxRate?.usdToZar || 18.5

  const handleUsdChange = (v: string) => {
    setUsdVal(v)
    const n = parseFloat(v)
    setZarVal(isNaN(n) ? '' : (n * rate).toFixed(2))
  }
  const handleZarChange = (v: string) => {
    setZarVal(v)
    const n = parseFloat(v)
    setUsdVal(isNaN(n) ? '' : (n / rate).toFixed(2))
  }

  const handleRefreshRate = async () => {
    setRefreshing(true)
    try {
      const { fetchFXRate } = await import('../../lib/fx')
      const { useAppStore: store } = await import('../../store/useAppStore')
      const newRate = await fetchFXRate()
      store.getState().setFXRate({ usdToZar: newRate, fetchedAt: Date.now() })
    } finally {
      setRefreshing(false)
    }
  }

  const inputCls = "w-full px-2.5 py-1.5 text-xs font-semibold tabular-nums rounded-lg outline-none"
  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }

  return (
    <>
      <aside className="sidebar w-56 flex-shrink-0 flex flex-col h-full relative z-20">

        {/* Logo — fixed */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 flex items-center gap-3">
          <div className="w-8 h-8 btn-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-sm text-[var(--text-primary)] leading-tight tracking-tight">FinTrack</div>
            <div className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">Personal Finance</div>
          </div>
        </div>

        {/* Nav — fixed */}
        <nav className="flex-shrink-0 px-3 space-y-0.5">
          {NAV.map(item => {
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                    : 'font-medium text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Scrollable middle */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="mx-4 my-3 border-t border-[var(--border-subtle)]" />

          {/* Currency toggle */}
          <div className="px-4 space-y-2">
            <div className="currency-toggle">
              {(['USD', 'ZAR'] as Currency[]).map(c => (
                <button key={c} onClick={() => setCurrency(c)} className={`currency-option ${currency === c ? 'active' : ''}`}>{c}</button>
              ))}
            </div>

            {/* Rate row + refresh */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-[var(--text-muted)] font-semibold tabular-nums">
                1 USD = {rate.toFixed(2)} ZAR
              </span>
              <button
                onClick={handleRefreshRate}
                disabled={refreshing}
                className="w-5 h-5 flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors cursor-pointer rounded"
                title="Refresh rate"
              >
                <svg viewBox="0 0 24 24" className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Live converter */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--input-bg)' }}>
              <div className="flex items-center px-2.5 py-2 gap-2">
                <span className="text-[10px] font-bold text-[var(--text-muted)] w-8 flex-shrink-0">USD</span>
                <input
                  type="number"
                  value={usdVal}
                  onChange={e => handleUsdChange(e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                  style={inputStyle}
                  inputMode="decimal"
                />
              </div>
              <div className="border-t" style={{ borderColor: 'var(--border)' }} />
              <div className="flex items-center px-2.5 py-2 gap-2">
                <span className="text-[10px] font-bold text-[var(--text-muted)] w-8 flex-shrink-0">ZAR</span>
                <input
                  type="number"
                  value={zarVal}
                  onChange={e => handleZarChange(e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                  style={inputStyle}
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          <div className="mx-4 my-3 border-t border-[var(--border-subtle)]" />

          {/* Add Entry */}
          <div className="px-3 mb-3">
            <button
              onClick={() => setAddOpen(true)}
              className="btn-primary w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add Entry
            </button>
          </div>

          <div className="mx-4 mb-2 border-t border-[var(--border-subtle)]" />

          {/* Wallet address book */}
          <div className="px-4 mb-1">
            <div className="label">Wallets</div>
          </div>
          <WalletBook />

          <div className="h-3" />
        </div>

        {/* Bottom controls — fixed */}
        <div className="flex-shrink-0 border-t border-[var(--border-subtle)] px-3 py-3 space-y-0.5">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
          >
            {theme === 'dark'
              ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Settings
          </button>
        </div>
      </aside>

      <AddIncomeSheet isOpen={addOpen} onClose={() => setAddOpen(false)} onSaved={() => {}} />
    </>
  )
}
