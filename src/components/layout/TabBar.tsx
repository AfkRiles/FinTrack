import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Tab } from '../../types'
import { FABMenu } from './FABMenu'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
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
    label: 'Stats',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M18 20V10" strokeLinecap="round" />
        <path d="M12 20V4" strokeLinecap="round" />
        <path d="M6 20v-6" strokeLinecap="round" />
      </svg>
    ),
  },
]

interface TabBarProps {
  onOpenSettings: () => void
}

export function TabBar({ onOpenSettings }: TabBarProps) {
  const { activeTab, setActiveTab } = useAppStore()
  const [fabOpen, setFabOpen] = useState(false)

  return (
    <>
      {/* FAB Menu overlay */}
      <FABMenu isOpen={fabOpen} onClose={() => setFabOpen(false)} activeTab={activeTab} />

      {/* Tab bar */}
      <div
        className="tab-bar flex-shrink-0 relative z-30"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center h-16 px-4 max-w-lg mx-auto relative">
          {/* Left tabs */}
          <div className="flex flex-1 justify-around">
            {TABS.slice(0, 1).map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          {/* Center FAB */}
          <div className="flex-shrink-0 flex items-center justify-center -mt-6 mx-4">
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className={`fab w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                fabOpen ? 'rotate-45 scale-95' : 'rotate-0 scale-100'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Right tabs */}
          <div className="flex flex-1 justify-around">
            {TABS.slice(1).map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: (typeof TABS)[0]
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-1 px-3 transition-all duration-200 focus:outline-none"
    >
      <div
        className={`transition-colors duration-200 ${
          active ? 'text-[#00C27C]' : 'text-[var(--text-muted)]'
        }`}
      >
        {tab.icon}
      </div>
      <span
        className={`text-[10px] font-semibold transition-colors duration-200 ${
          active ? 'text-[#00C27C]' : 'text-[var(--text-muted)]'
        }`}
      >
        {tab.label}
      </span>
    </button>
  )
}
