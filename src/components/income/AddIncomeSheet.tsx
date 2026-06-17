import { useState, useEffect } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { db } from '../../lib/db'
import type { Category } from '../../types'
import { ensureFXRate } from '../../lib/fx'
import { useAppStore } from '../../store/useAppStore'
import { format } from 'date-fns'

interface AddIncomeSheetProps {
  isOpen: boolean
  onClose: () => void
  prefillDate?: Date
  editEntry?: {
    id: string
    categoryId: string
    amount: number
    currency: string
    date: number
    sourceName: string
    note?: string
  }
  onSaved?: () => void
}

const CURRENCIES = ['ZAR', 'USD', 'USDT', 'USDC', 'ETH', 'SOL']

export function AddIncomeSheet({ isOpen, onClose, prefillDate, editEntry, onSaved }: AddIncomeSheetProps) {
  const { fxRate } = useAppStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('ZAR')
  const [date, setDate] = useState(format(prefillDate || new Date(), 'yyyy-MM-dd'))
  const [sourceName, setSourceName] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)

  useEffect(() => {
    if (isOpen) {
      db.categories.orderBy('createdAt').toArray().then(setCategories)
      if (editEntry) {
        setCategoryId(editEntry.categoryId)
        setAmount(String(editEntry.amount))
        setCurrency(editEntry.currency)
        setDate(format(new Date(editEntry.date), 'yyyy-MM-dd'))
        setSourceName(editEntry.sourceName)
        setNote(editEntry.note || '')
      } else {
        setCategoryId('')
        setAmount('')
        setCurrency('ZAR')
        setDate(format(prefillDate || new Date(), 'yyyy-MM-dd'))
        setSourceName('')
        setNote('')
      }
    }
  }, [isOpen, editEntry, prefillDate])

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    const COLORS = ['#00C27C', '#FF4D8F', '#9364FF', '#00BFFF', '#FF8C42', '#FFD700']
    const color = COLORS[categories.length % COLORS.length]
    const cat: Category = {
      id: crypto.randomUUID(),
      name: newCategory.trim(),
      color,
      createdAt: Date.now(),
    }
    await db.categories.add(cat)
    const updated = await db.categories.orderBy('createdAt').toArray()
    setCategories(updated)
    setCategoryId(cat.id)
    setNewCategory('')
    setShowNewCat(false)
  }

  const handleSave = async () => {
    if (!categoryId || !amount || !sourceName || !date) return
    setSaving(true)
    try {
      const rate = fxRate?.usdToZar || (await ensureFXRate())
      const raw = parseFloat(amount)

      // Convert to USD as base
      let amountUSD = raw
      if (currency === 'ZAR') amountUSD = raw / rate
      else if (currency === 'USDT' || currency === 'USDC') amountUSD = raw
      // For other currencies (ETH, SOL) we'd need crypto prices — store as USD for now

      const amountZAR = amountUSD * rate

      if (editEntry) {
        await db.incomeEntries.update(editEntry.id, {
          categoryId, amount: raw, currency, date: new Date(date).getTime(),
          sourceName, note, amountUSD, amountZAR,
        })
      } else {
        await db.incomeEntries.add({
          id: crypto.randomUUID(),
          categoryId, amount: raw, currency,
          date: new Date(date).getTime(),
          sourceName, note, amountUSD, amountZAR,
          createdAt: Date.now(),
        })
      }
      onSaved?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = categoryId && amount && parseFloat(amount) > 0 && sourceName.trim()

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editEntry ? 'Edit Entry' : 'Add Income'} tall>
      <div className="space-y-4 pb-4">

        {/* Category */}
        <div>
          <label className="label block mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  categoryId === cat.id
                    ? 'text-white border-transparent'
                    : 'text-[var(--text-secondary)] border-[var(--border-subtle)]'
                }`}
                style={categoryId === cat.id ? { background: cat.color, borderColor: cat.color } : {}}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                  style={{ background: cat.color }}
                />
                {cat.name}
              </button>
            ))}
            <button
              onClick={() => setShowNewCat(!showNewCat)}
              className="px-3 py-1.5 rounded-full text-sm font-semibold text-[#00C27C] border border-[#00C27C]/30"
            >
              + New
            </button>
          </div>
          {showNewCat && (
            <div className="flex gap-2 mt-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category name"
                className="flex-1 bg-[var(--bg-secondary)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[#00C27C]"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-[#00C27C] text-white rounded-xl text-sm font-semibold"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Amount + Currency */}
        <div>
          <label className="label block mb-2">Amount</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-[var(--bg-secondary)] rounded-xl px-4 py-3 text-lg font-bold text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[#00C27C]"
              inputMode="decimal"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-[var(--bg-secondary)] rounded-xl px-3 py-3 text-sm font-bold text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[#00C27C]"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="label block mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[#00C27C]"
          />
        </div>

        {/* Source name */}
        <div>
          <label className="label block mb-2">Client / Source</label>
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. Acme Corp, Airdrop XYZ"
            className="w-full bg-[var(--bg-secondary)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[#00C27C]"
          />
        </div>

        {/* Note */}
        <div>
          <label className="label block mb-2">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details..."
            rows={2}
            className="w-full bg-[var(--bg-secondary)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[#00C27C] resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
            canSave
              ? 'bg-[#00C27C] text-white shadow-[0_4px_20px_rgba(0,194,124,0.35)]'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving...' : editEntry ? 'Save Changes' : 'Add Entry'}
        </button>
      </div>
    </BottomSheet>
  )
}
