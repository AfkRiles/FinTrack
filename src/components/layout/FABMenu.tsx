import { useState } from 'react'
import type { Tab } from '../../types'
import { AddIncomeSheet } from '../income/AddIncomeSheet'

interface FABMenuProps {
  isOpen: boolean
  onClose: () => void
  activeTab: Tab
}

const ACTIONS = [
  {
    id: 'income',
    label: 'Income Entry',
    icon: '💰',
    color: '#00C27C',
  },
  {
    id: 'crypto',
    label: 'Crypto Holding',
    icon: '₿',
    color: '#F7931A',
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: '📈',
    color: '#2196F3',
  },
  {
    id: 'cash',
    label: 'Bank / Cash',
    icon: '🏦',
    color: '#9364FF',
  },
]

export function FABMenu({ isOpen, onClose, activeTab }: FABMenuProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const handleAction = (id: string) => {
    setActiveAction(id)
    onClose()
  }

  if (!isOpen) {
    return (
      <>
        <AddIncomeSheet isOpen={activeAction === 'income'} onClose={() => setActiveAction(null)} />
      </>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 sheet-overlay animate-[fadeIn_0.15s_ease-out]"
        onClick={onClose}
      />
      <div className="fixed bottom-24 left-0 right-0 z-40 flex flex-col items-center gap-3 px-6 animate-[slideUp_0.2s_ease-out]">
        <div className="w-full max-w-xs space-y-2">
          {ACTIONS.map((action, i) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="w-full glass rounded-2xl px-5 py-4 flex items-center gap-4 text-left transition-all duration-150 active:scale-[0.98]"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <span className="text-xl w-8 text-center">{action.icon}</span>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{action.label}</div>
              </div>
              <div
                className="ml-auto w-2 h-2 rounded-full"
                style={{ background: action.color }}
              />
            </button>
          ))}
        </div>
        <p className="label">Select entry type</p>
      </div>

      <AddIncomeSheet isOpen={activeAction === 'income'} onClose={() => setActiveAction(null)} />
    </>
  )
}
