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

// Premium color palette for new categories
const PREMIUM_COLORS = ['#0D9488', '#4F46E5', '#D97706', '#2563EB', '#DC2626', '#7C3AED', '#0891B2']

// Input style for dark glass modal
const inputStyle = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#F9FAFB',
  borderRadius: '12px',
  outline: 'none',
  transition: 'border-color 0.15s ease',
}

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
    const color = PREMIUM_COLORS[categories.length % PREMIUM_COLORS.length]
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

      let amountUSD = raw
      if (currency === 'ZAR') amountUSD = raw / rate
      else if (currency === 'USDT' || currency === 'USDC') amountUSD = raw

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
      <div className="space-y-5 pb-2">

        {/* Category */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-2.5">Category</div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  categoryId === cat.id ? 'text-white' : 'text-[rgba(255,255,255,0.55)] hover:text-white'
                }`}
                style={
                  categoryId === cat.id
                    ? { background: cat.color, boxShadow: `0 4px 16px ${cat.color}44` }
                    : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: cat.color }} />
                {cat.name}
              </button>
            ))}
            <button
              onClick={() => setShowNewCat(!showNewCat)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[rgba(255,255,255,0.55)] hover:text-white transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              + New
            </button>
          </div>
          {showNewCat && (
            <div className="flex gap-2 mt-3">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category name"
                className="flex-1 px-3 py-2.5 text-sm"
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Amount + Currency */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-2.5">Amount</div>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-4 py-3.5 text-xl font-bold"
              style={inputStyle}
              inputMode="decimal"
              onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-3 py-3.5 text-sm font-bold cursor-pointer"
              style={{ ...inputStyle, minWidth: 80 }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} style={{ background: '#14141E', color: '#F9FAFB' }}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-2.5">Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3.5 text-sm"
            style={{ ...inputStyle, colorScheme: 'dark' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
          />
        </div>

        {/* Source name */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-2.5">Client / Source</div>
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. Acme Corp, Airdrop XYZ"
            className="w-full px-4 py-3.5 text-sm"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
          />
        </div>

        {/* Note */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-2.5">Note <span className="normal-case font-normal">(optional)</span></div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any details..."
            rows={2}
            className="w-full px-4 py-3.5 text-sm resize-none"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.6)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full py-4 rounded-2xl text-base font-bold transition-all cursor-pointer"
          style={
            canSave
              ? { background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', boxShadow: '0 4px 20px rgba(5,150,105,0.35)', transform: 'translateY(0)' }
              : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }
          }
          onMouseEnter={e => { if (canSave) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
        >
          {saving ? 'Saving…' : editEntry ? 'Save Changes' : 'Add Entry'}
        </button>
      </div>
    </BottomSheet>
  )
}
