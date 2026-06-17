import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { GlassCard } from '../components/ui/GlassCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import type { Theme } from '../types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useAppStore()
  const [exporting, setExporting] = useState(false)
  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray(), [])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const entries = await db.incomeEntries.orderBy('date').toArray()
      const cats = await db.categories.toArray()
      const catMap = new Map(cats.map(c => [c.id, c.name]))
      const rows = [
        ['Date', 'Category', 'Source', 'Amount', 'Currency', 'Amount USD', 'Amount ZAR', 'Note'],
        ...entries.map(e => [
          new Date(e.date).toISOString().split('T')[0],
          catMap.get(e.categoryId) || '',
          e.sourceName,
          e.amount,
          e.currency,
          e.amountUSD.toFixed(2),
          e.amountZAR.toFixed(2),
          e.note || '',
        ]),
      ]
      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fintrack-income-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const handleExportJSON = async () => {
    const [entries, cats, crypto, stocks, cash, wallets] = await Promise.all([
      db.incomeEntries.toArray(),
      db.categories.toArray(),
      db.cryptoHoldings.toArray(),
      db.stockHoldings.toArray(),
      db.cashHoldings.toArray(),
      db.wallets.toArray(),
    ])
    const json = JSON.stringify({ entries, categories: cats, crypto, stocks, cash, wallets }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fintrack-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteCategory = async (id: string) => {
    const count = await db.incomeEntries.where('categoryId').equals(id).count()
    if (count > 0) {
      alert(`Cannot delete — ${count} entries use this category.`)
      return
    }
    await db.categories.delete(id)
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Settings" tall>
      <div className="space-y-5 pb-4">

        {/* Appearance */}
        <div>
          <div className="label mb-2">APPEARANCE</div>
          <GlassCard small className="flex gap-2">
            {(['light', 'dark', 'system'] as Theme[]).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  theme === t
                    ? 'bg-[#00C27C] text-white'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </GlassCard>
        </div>

        {/* Categories */}
        <div>
          <div className="label mb-2">CATEGORIES</div>
          <div className="space-y-2">
            {(categories || []).map(cat => (
              <GlassCard key={cat.id} small className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                <div className="flex-1 font-semibold text-[var(--text-primary)]">{cat.name}</div>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-red-400 text-sm px-2 py-1"
                >
                  Delete
                </button>
              </GlassCard>
            ))}
            {(categories || []).length === 0 && (
              <div className="text-sm text-[var(--text-muted)] text-center py-3">No categories yet</div>
            )}
          </div>
        </div>

        {/* Data */}
        <div>
          <div className="label mb-2">DATA</div>
          <div className="space-y-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="w-full glass rounded-2xl px-5 py-4 flex items-center gap-3 text-left"
            >
              <span className="text-xl">📥</span>
              <div>
                <div className="font-semibold text-[var(--text-primary)]">Export to CSV</div>
                <div className="text-xs text-[var(--text-muted)]">All income entries</div>
              </div>
            </button>
            <button
              onClick={handleExportJSON}
              className="w-full glass rounded-2xl px-5 py-4 flex items-center gap-3 text-left"
            >
              <span className="text-xl">💾</span>
              <div>
                <div className="font-semibold text-[var(--text-primary)]">Export JSON backup</div>
                <div className="text-xs text-[var(--text-muted)]">Full data backup for restore</div>
              </div>
            </button>
          </div>
        </div>

      </div>
    </BottomSheet>
  )
}
