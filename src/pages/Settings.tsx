import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { GlassCard } from '../components/ui/GlassCard'
import { BottomSheet } from '../components/ui/BottomSheet'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { saveBTCZpub, getBTCZpub } from '../lib/walletSync'
import type { Theme } from '../types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useAppStore()
  const [exporting, setExporting] = useState(false)
  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray(), [])

  // BTC zpub configuration
  const [zpubInput,   setZpubInput]   = useState('')
  const [currentZpub, setCurrentZpub] = useState<string | null>(null)
  const [zpubSaving,  setZpubSaving]  = useState(false)
  const [zpubMsg,     setZpubMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (isOpen) getBTCZpub().then(setCurrentZpub)
  }, [isOpen])

  const handleSaveZpub = async () => {
    const val = zpubInput.trim()
    if (!val.startsWith('zpub') && !val.startsWith('xpub')) {
      setZpubMsg({ text: 'Must start with zpub (native SegWit) or xpub', ok: false })
      return
    }
    setZpubSaving(true)
    setZpubMsg(null)
    try {
      await saveBTCZpub(val)
      setCurrentZpub(val)
      setZpubInput('')
      setZpubMsg({ text: 'Saved — next sync will scan all addresses automatically', ok: true })
    } catch {
      setZpubMsg({ text: 'Failed to save', ok: false })
    } finally {
      setZpubSaving(false)
    }
  }

  const handleClearZpub = async () => {
    await saveBTCZpub(null)
    setCurrentZpub(null)
    setZpubMsg({ text: 'Cleared — using manual address list', ok: true })
  }

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

        {/* Bitcoin Wallet */}
        <div>
          <div className="label mb-2">BITCOIN WALLET (BTC)</div>
          <GlassCard small className="space-y-3">
            {/* Current mode */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {currentZpub ? 'HD Wallet (zpub)' : 'Manual addresses (3)'}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {currentZpub
                    ? `${currentZpub.slice(0, 14)}…${currentZpub.slice(-6)} · auto-discovers all addresses`
                    : '3 addresses hardcoded — add zpub to track all future change addresses'}
                </div>
              </div>
              {currentZpub && (
                <button
                  onClick={handleClearZpub}
                  className="text-xs text-red-400 font-semibold px-2 py-1 rounded-lg hover:bg-red-400/10 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* zpub input */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                {currentZpub ? 'Replace zpub' : 'Enter zpub or xpub'}
              </div>
              <div className="flex gap-2">
                <input
                  value={zpubInput}
                  onChange={e => { setZpubInput(e.target.value); setZpubMsg(null) }}
                  placeholder="zpub6…"
                  className="flex-1 rounded-xl px-3 py-2 text-xs font-mono bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  style={{ transition: 'border-color 0.15s' }}
                />
                <button
                  onClick={handleSaveZpub}
                  disabled={!zpubInput.trim() || zpubSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                >
                  {zpubSaving ? '…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Feedback message */}
            {zpubMsg && (
              <div className={`text-xs px-3 py-2 rounded-xl ${zpubMsg.ok ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-400/10' : 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-400/10'}`}>
                {zpubMsg.text}
              </div>
            )}

            {/* Help text */}
            <div className="text-[10px] text-[var(--text-faint)] leading-relaxed">
              In Ledger Live → your Bitcoin account → wrench icon → "Export account" or "Advanced" to find your zpub.
              The zpub is an <em>extended public key</em> — it reveals addresses but never private keys or the ability to spend.
            </div>
          </GlassCard>
        </div>

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
