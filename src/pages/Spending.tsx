import { useState, useMemo, useRef, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { db } from '../lib/db'
import { parseEtherfiCSV, importTransactions } from '../lib/spendingParser'
import { normalizeMerchant } from '../lib/categoryMapper'
import { useAppStore } from '../store/useAppStore'
import type { BankTransaction, FintrackCategory, SpendingTxType } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatMonthKey(mk: string): string {
  const [y, m] = mk.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}

function fmtZAR(n: number): string {
  return 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(ts: number): string {
  return format(new Date(ts), 'd MMM yyyy')
}

function prevMonth(mk: string): string {
  const [y, m] = mk.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(mk: string): string {
  const [y, m] = mk.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Which transactions count as spending
function isSpend(tx: BankTransaction): boolean {
  return tx.type === 'card_spend' && tx.status === 'CLEARED'
}
function isMoneyIn(tx: BankTransaction): boolean {
  return (tx.type === 'topup' && (tx.status === 'CLEARED' || tx.status === 'unknown')) ||
    ((tx.type === 'affiliate_payout' || tx.type === 'affiliate_reward') && tx.status === 'paid')
}
function isFee(tx: BankTransaction): boolean {
  return tx.type === 'fee' && tx.status === 'CLEARED'
}
function isRefund(tx: BankTransaction): boolean {
  return tx.type === 'card_refund' && tx.status === 'CLEARED'
}

// ── Category colors (muted, works light + dark) ───────────────────────────
const CAT_COLORS: Record<FintrackCategory, string> = {
  'Food & Dining':         '#FF7A00',
  'Transport':             '#7C3AED',
  'Shopping':              '#3B82F6',
  'Entertainment':         '#EC4899',
  'Health & Personal Care':'#14B8A6',
  'Fitness & Sport':       '#10B981',
  'Travel':                '#6366F1',
  'Subscriptions & Digital':'#8B5CF6',
  'Bills & Services':      '#64748B',
  'Fees':                  '#94A3B8',
  'Other':                 '#78716C',
  'Uncategorized':         '#A8A29E',
}

const ALL_CATEGORIES: FintrackCategory[] = [
  'Food & Dining','Transport','Shopping','Entertainment','Health & Personal Care',
  'Fitness & Sport','Travel','Subscriptions & Digital','Bills & Services','Fees','Other','Uncategorized',
]

// ── Import Modal ─────────────────────────────────────────────────────────────

interface PreviewData {
  months: string[]
  txCount: number
  transactions: BankTransaction[]
  filename: string
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const { fxRate } = useAppStore()
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const rate = fxRate?.usdToZar ?? 16

  const processFile = useCallback(async (file: File) => {
    setError(null)
    setPreview(null)
    if (!file.name.endsWith('.csv')) { setError('Please select a .csv file.'); return }
    try {
      const text = await file.text()
      const { transactions, monthsDetected, totalRows } = await parseEtherfiCSV(text, rate)
      setPreview({ months: monthsDetected, txCount: totalRows, transactions, filename: file.name })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not read the file.')
    }
  }, [rate])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleConfirm = async () => {
    if (!preview) return
    setImporting(true)
    try {
      const r = await importTransactions(preview.transactions, preview.filename)
      setResult(r)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-glass rounded-2xl w-full max-w-md p-6 space-y-5" style={{ background: 'var(--surface-modal)' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Import Ether.fi statement</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Upload your Ether.fi transaction-history CSV. FinTrack will automatically organize transactions by month and spending category.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer ml-3 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Result state */}
        {result ? (
          <div className="space-y-3">
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-2xl font-bold text-[var(--accent)] mb-1">{result.total} transactions processed</div>
              <div className="text-sm text-[var(--text-muted)] space-y-0.5">
                <div>{result.added} added · {result.updated} updated · {result.skipped} already imported</div>
              </div>
            </div>
            <button onClick={onClose} className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold">Done</button>
          </div>
        ) : preview ? (
          /* Preview state */
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="text-xs text-[var(--text-muted)] mb-1 font-semibold uppercase tracking-wider">Statement detected</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {preview.months.length > 0 ? `${formatMonthKey(preview.months[0])} – ${formatMonthKey(preview.months[preview.months.length - 1])}` : 'No months detected'}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{preview.txCount} transactions · {preview.months.length} month{preview.months.length !== 1 ? 's' : ''} detected</div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-muted)] cursor-pointer transition-colors hover:bg-[var(--bg-secondary)]" style={{ border: '1px solid var(--border)' }}>Cancel</button>
              <button onClick={handleConfirm} disabled={importing} className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-bold">
                {importing ? 'Importing…' : 'Import Transactions'}
              </button>
            </div>
          </div>
        ) : (
          /* Upload state */
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                background: dragging ? 'var(--accent-dim)' : 'var(--input-bg)',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/>
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
              </svg>
              <div className="text-center">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Drop your CSV here</div>
                <div className="text-xs text-[var(--text-muted)]">or click to choose a file</div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
            {error && <p className="text-xs text-red-400 px-1">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Bar chart with axes ───────────────────────────────────────────────────────

function WeeklyBarChart({ monthKey, spends }: { monthKey: string; spends: BankTransaction[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [y, m] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()

  const periods = [
    { label: '1–7', start: 1, end: 7 },
    { label: '8–14', start: 8, end: 14 },
    { label: '15–21', start: 15, end: 21 },
    { label: '22–28', start: 22, end: 28 },
    { label: `29–${daysInMonth}`, start: 29, end: daysInMonth },
  ].filter(p => p.start <= daysInMonth)

  const buckets = periods.map(p => {
    const total = spends
      .filter(tx => { const day = new Date(tx.timestamp).getDate(); return day >= p.start && day <= p.end })
      .reduce((s, tx) => s + (isRefund(tx) ? -tx.amountZar : tx.amountZar), 0)
    const count = spends.filter(tx => { const day = new Date(tx.timestamp).getDate(); return day >= p.start && day <= p.end && isSpend(tx) }).length
    return { ...p, total: Math.max(0, total), count }
  })

  const maxVal = Math.max(...buckets.map(b => b.total), 1)

  // Y-axis ticks: 4 nice round steps from 0 to max
  const niceMax = Math.ceil(maxVal / 1000) * 1000 || 1000
  const yTicks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax].map(v => Math.round(v))

  const CHART_H = 160  // px height of bar area
  const Y_LABEL_W = 52 // px width for y-axis labels
  const BAR_GAP = 10

  return (
    <div className="relative w-full select-none">
      <div className="flex">
        {/* Y-axis labels */}
        <div className="flex flex-col-reverse justify-between pb-6" style={{ width: Y_LABEL_W, height: CHART_H + 24 }}>
          {yTicks.map(v => (
            <span key={v} className="text-[10px] text-[var(--text-faint)] font-medium leading-none text-right pr-2">
              {v >= 1000 ? `R${(v/1000).toFixed(0)}k` : `R${v}`}
            </span>
          ))}
        </div>

        {/* Bars + x-axis */}
        <div className="flex-1 relative">
          {/* Horizontal grid lines */}
          <div className="absolute inset-0 pb-6 flex flex-col-reverse justify-between pointer-events-none" style={{ height: CHART_H + 24 }}>
            {yTicks.map((_, i) => (
              <div key={i} className="border-t w-full" style={{ borderColor: 'var(--border-subtle)', opacity: i === 0 ? 0.8 : 0.4 }} />
            ))}
          </div>

          {/* Bars */}
          <div className="flex items-end gap-2 pb-6" style={{ height: CHART_H + 24 }}>
            {buckets.map((b, i) => {
              const barH = Math.max(b.total > 0 ? 4 : 0, (b.total / niceMax) * CHART_H)
              const isHovered = hoveredIdx === i
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end cursor-pointer relative"
                  style={{ height: CHART_H }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Tooltip */}
                  {isHovered && b.total > 0 && (
                    <div
                      className="absolute z-20 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold pointer-events-none"
                      style={{
                        bottom: barH + 10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--surface-modal)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                      }}
                    >
                      <div style={{ color: 'var(--accent)' }}>{fmtZAR(b.total)}</div>
                      <div style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{b.count} transaction{b.count !== 1 ? 's' : ''}</div>
                    </div>
                  )}
                  <div
                    className="w-full rounded-t-lg transition-all duration-150"
                    style={{
                      height: barH,
                      background: b.total > 0
                        ? (isHovered ? 'var(--accent)' : 'var(--accent-light)')
                        : 'var(--bg-secondary)',
                      opacity: b.total > 0 ? (isHovered ? 1 : 0.7) : 1,
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex gap-2" style={{ marginTop: -20 }}>
            {buckets.map((b, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[10px] font-medium" style={{ color: hoveredIdx === i ? 'var(--accent)' : 'var(--text-faint)' }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ data, total }: { data: { cat: FintrackCategory; amount: number }[]; total: number }) {
  const SIZE = 160, R = 60, STROKE = 22
  const circumference = 2 * Math.PI * R

  let offset = 0
  const slices = data.slice(0, 8).map(d => {
    const pct = total > 0 ? d.amount / total : 0
    const dash = pct * circumference
    const gap = circumference - dash
    const slice = { cat: d.cat, dash, gap, offset, color: CAT_COLORS[d.cat] ?? '#888' }
    offset += dash
    return slice
  })

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
            />
          ))}
          {/* Background ring */}
          {total === 0 && (
            <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="var(--bg-secondary)" strokeWidth={STROKE} />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'none' }}>
          <div className="text-lg font-bold text-[var(--text-primary)] leading-tight">{total >= 1000 ? `R${(total/1000).toFixed(1)}K` : fmtZAR(total)}</div>
          <div className="text-[10px] text-[var(--text-muted)] font-medium">Spent</div>
        </div>
      </div>
    </div>
  )
}

// ── Category Override Modal ──────────────────────────────────────────────────

function CategoryOverrideModal({
  tx,
  onClose,
  onSave,
}: {
  tx: BankTransaction
  onClose: () => void
  onSave: (txId: string, cat: FintrackCategory, applyAll: boolean, merchantKey: string) => Promise<void>
}) {
  const [selected, setSelected] = useState<FintrackCategory>(tx.fintrackCategory)
  const [applyAll, setApplyAll] = useState(false)
  const [saving, setSaving] = useState(false)

  const merchantKey = normalizeMerchant(tx.description)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-glass rounded-2xl w-full max-w-sm p-5 space-y-4" style={{ background: 'var(--surface-modal)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Change category</h3>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] cursor-pointer">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] -mt-1">{tx.description.trim()}</p>
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelected(cat)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left"
              style={{
                background: selected === cat ? 'var(--accent-dim)' : 'transparent',
                color: selected === cat ? 'var(--accent)' : 'var(--text-secondary)',
                border: selected === cat ? '1px solid var(--accent)' : '1px solid transparent',
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[cat] }} />
              {cat}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={applyAll} onChange={e => setApplyAll(e.target.checked)} className="rounded" />
          <span className="text-xs text-[var(--text-secondary)]">Always categorize "{merchantKey}" as {selected}</span>
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors" style={{ border: '1px solid var(--border)' }}>Cancel</button>
          <button
            onClick={async () => { setSaving(true); await onSave(tx.id, selected, applyAll, merchantKey); setSaving(false); onClose() }}
            disabled={saving}
            className="btn-primary flex-1 py-2 rounded-xl text-xs font-bold"
          >Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx, onReCat }: { tx: BankTransaction; onReCat: (tx: BankTransaction) => void }) {
  const [expanded, setExpanded] = useState(false)
  const isNeg = isRefund(tx)
  const isInc = isMoneyIn(tx)

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--bg-secondary)] text-left cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)] truncate leading-tight">{tx.description.trim()}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{fmtDate(tx.timestamp)}</div>
        </div>
        <div className="text-sm font-bold flex-shrink-0" style={{ color: isNeg ? 'var(--accent)' : isInc ? 'var(--accent)' : 'var(--text-primary)' }}>
          {isNeg ? '+' : ''}{fmtZAR(tx.amountZar)}
        </div>
      </button>
      {expanded && (
        <div className="mx-3 mb-2 px-3 py-3 rounded-xl text-xs space-y-1.5" style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Time</span>
            <span className="text-[var(--text-secondary)] font-medium">{format(new Date(tx.timestamp), 'd MMM yyyy HH:mm')}</span>
          </div>
          {tx.originalAmount !== null && tx.originalCurrency && tx.originalCurrency !== 'ZAR' && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Original</span>
              <span className="text-[var(--text-secondary)] font-medium">{tx.originalAmount} {tx.originalCurrency}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">USD settlement</span>
            <span className="text-[var(--text-secondary)] font-medium">${tx.amountUsd.toFixed(2)}</span>
          </div>
          {tx.cashbackAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Cashback</span>
              <span className="font-medium" style={{ color: 'var(--accent)' }}>${tx.cashbackAmount.toFixed(2)} {tx.cashbackCurrency}</span>
            </div>
          )}
          {tx.rawCategory && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Raw category</span>
              <span className="text-[var(--text-secondary)] font-medium text-right max-w-[55%]">{tx.rawCategory}</span>
            </div>
          )}
          {tx.card && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Card</span>
              <span className="text-[var(--text-secondary)] font-medium">···{tx.card}</span>
            </div>
          )}
          {tx.spendingMode && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Mode</span>
              <span className="text-[var(--text-secondary)] font-medium">{tx.spendingMode}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Status</span>
            <span className="text-[var(--text-secondary)] font-medium">{tx.status}</span>
          </div>
          <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => onReCat(tx)} className="text-[var(--accent)] font-semibold hover:opacity-80 transition-opacity cursor-pointer">
              Change category →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

type ViewMode = 'categories' | 'all'
type AllFilter = 'all' | 'spending' | 'moneyin' | 'refunds' | 'fees'

export function SpendingPage() {
  const { fxRate } = useAppStore()

  // All transactions from DB
  const allTxs = useLiveQuery(() => db.bankTransactions.orderBy('timestamp').reverse().toArray(), []) ?? []
  const importHistory = useLiveQuery(() => db.importRecords.orderBy('importedAt').reverse().toArray(), []) ?? []

  // Month navigation
  const availableMonths = useMemo(() => {
    const s = new Set(allTxs.map(t => t.monthKey))
    return Array.from(s).sort().reverse()
  }, [allTxs])

  const [activeMonth, setActiveMonth] = useState<string>(currentMonthKey)
  const [importOpen, setImportOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('categories')
  const [allFilter, setAllFilter] = useState<AllFilter>('all')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [reCatTx, setReCatTx] = useState<BankTransaction | null>(null)
  const [search, setSearch] = useState('')

  const hasData = availableMonths.includes(activeMonth)

  // Filter to active month
  const monthTxs = useMemo(() => allTxs.filter(t => t.monthKey === activeMonth), [allTxs, activeMonth])

  // Summaries
  const spends = useMemo(() => monthTxs.filter(isSpend), [monthTxs])
  const refunds = useMemo(() => monthTxs.filter(isRefund), [monthTxs])
  const moneyIns = useMemo(() => monthTxs.filter(isMoneyIn), [monthTxs])
  const fees = useMemo(() => monthTxs.filter(isFee), [monthTxs])

  const totalSpent = useMemo(() => spends.reduce((s, t) => s + t.amountZar, 0) - refunds.reduce((s, t) => s + t.amountZar, 0), [spends, refunds])
  const totalIn = useMemo(() => moneyIns.reduce((s, t) => s + t.amountZar, 0), [moneyIns])
  const totalFees = useMemo(() => fees.reduce((s, t) => s + t.amountZar, 0), [fees])
  const netFlow = totalIn - totalSpent - totalFees
  const totalCashback = useMemo(() => spends.reduce((s, t) => s + t.cashbackAmount, 0), [spends])

  // Category breakdown (spending only)
  const catData = useMemo(() => {
    const map = new Map<FintrackCategory, number>()
    for (const tx of spends) {
      map.set(tx.fintrackCategory, (map.get(tx.fintrackCategory) ?? 0) + tx.amountZar)
    }
    for (const tx of refunds) {
      const cur = map.get(tx.fintrackCategory) ?? 0
      const next = cur - tx.amountZar
      if (next <= 0) map.delete(tx.fintrackCategory)
      else map.set(tx.fintrackCategory, next)
    }
    return Array.from(map.entries())
      .map(([cat, amount]) => ({ cat, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [spends, refunds])

  // Insights
  const insights = useMemo(() => {
    const topCat = catData[0] ?? null
    const largest = [...spends].sort((a, b) => b.amountZar - a.amountZar)[0] ?? null
    const merchantCounts = new Map<string, number>()
    for (const tx of spends) {
      const k = tx.description.trim()
      merchantCounts.set(k, (merchantCounts.get(k) ?? 0) + 1)
    }
    const mostVisited = [...merchantCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null
    const avg = spends.length > 0 ? totalSpent / spends.length : 0
    return { topCat, largest, mostVisited, avg }
  }, [catData, spends, totalSpent])

  // "All transactions" filter
  const filteredAll = useMemo(() => {
    let txs = monthTxs
    if (allFilter === 'spending') txs = txs.filter(t => isSpend(t) || isRefund(t))
    else if (allFilter === 'moneyin') txs = txs.filter(isMoneyIn)
    else if (allFilter === 'refunds') txs = txs.filter(isRefund)
    else if (allFilter === 'fees') txs = txs.filter(isFee)
    if (search) txs = txs.filter(t => t.description.toLowerCase().includes(search.toLowerCase()))
    return txs
  }, [monthTxs, allFilter, search])

  const handleReCat = async (txId: string, cat: FintrackCategory, applyAll: boolean, merchantKey: string) => {
    await db.bankTransactions.update(txId, { fintrackCategory: cat, merchantOverrideApplied: true })
    if (applyAll) {
      const existing = await db.merchantRules.get(merchantKey)
      if (existing) await db.merchantRules.update(merchantKey, { category: cat })
      else await db.merchantRules.add({ id: merchantKey, category: cat, createdAt: Date.now() })
      // Update all existing transactions for this merchant
      const related = await db.bankTransactions
        .filter(t => normalizeMerchant(t.description) === merchantKey && t.id !== txId)
        .toArray()
      await Promise.all(related.map(t => db.bankTransactions.update(t.id, { fintrackCategory: cat, merchantOverrideApplied: true })))
    }
  }

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Spending</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Monthly cash flow and card activity</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Month selector */}
            <div className="flex items-center gap-1">
              <button onClick={() => setActiveMonth(prevMonth(activeMonth))} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>
              </button>
              <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[130px] text-center">{formatMonthKey(activeMonth)}</span>
              <button
                onClick={() => setActiveMonth(nextMonth(activeMonth))}
                disabled={activeMonth >= currentMonthKey()}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Import + history */}
            <button onClick={() => setImportOpen(true)} className="btn-primary px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import Statement
            </button>
            <button onClick={() => setHistoryOpen(v => !v)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer" style={{ border: '1px solid var(--border)' }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
          </div>
        </div>

        {/* Import history dropdown */}
        {historyOpen && (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Imported statements</div>
            {importHistory.length === 0
              ? <p className="text-xs text-[var(--text-faint)]">No imports yet.</p>
              : importHistory.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs py-1.5">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">{r.filename}</div>
                    <div className="text-[var(--text-muted)]">{format(new Date(r.importedAt), 'd MMM yyyy')} · {r.txCount} transactions</div>
                  </div>
                  <div className="text-[var(--text-muted)]">{r.addedCount} added · {r.updatedCount} updated</div>
                </div>
              ))
            }
          </div>
        )}

        {/* Empty state */}
        {!hasData ? (
          <div className="rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-[var(--text-primary)]">No activity for {formatMonthKey(activeMonth)}</div>
              <div className="text-sm text-[var(--text-muted)] mt-1">Import an Ether.fi statement to build your monthly spending breakdown.</div>
            </div>
            <button onClick={() => setImportOpen(true)} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold">Import Statement</button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Money In</div>
                <div className="text-xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>{fmtZAR(totalIn)}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{moneyIns.length} deposit{moneyIns.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Spent</div>
                <div className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{fmtZAR(totalSpent)}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{spends.length} transaction{spends.length !== 1 ? 's' : ''}{totalCashback > 0 ? ` · $${totalCashback.toFixed(2)} cashback` : ''}</div>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weekly bar chart */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-bold text-[var(--text-primary)] mb-4">Spending this month</div>
                <WeeklyBarChart monthKey={activeMonth} spends={[...spends, ...refunds]} />
              </div>

              {/* Donut */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-sm font-bold text-[var(--text-primary)] mb-3">Spending by category</div>
                <div className="flex items-center gap-4">
                  <DonutChart data={catData} total={totalSpent} />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {catData.slice(0, 5).map(d => (
                      <div key={d.cat} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[d.cat] }} />
                        <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">{d.cat}</span>
                        <span className="text-xs font-semibold text-[var(--text-primary)] flex-shrink-0">{totalSpent > 0 ? Math.round(d.amount / totalSpent * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 text-sm font-semibold">
              {(['categories', 'all'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className="px-3 py-1.5 rounded-lg transition-colors cursor-pointer capitalize"
                  style={{
                    background: viewMode === v ? 'var(--accent-dim)' : 'transparent',
                    color: viewMode === v ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {v === 'categories' ? 'Categories' : 'All Transactions'}
                </button>
              ))}
            </div>

            {/* Categories view */}
            {viewMode === 'categories' && (
              <div className="space-y-2">
                {catData.map(({ cat, amount }) => {
                  const pct = totalSpent > 0 ? amount / totalSpent : 0
                  const txs = spends.filter(t => t.fintrackCategory === cat)
                  const rfds = refunds.filter(t => t.fintrackCategory === cat)
                  const isOpen = expandedCats.has(cat)
                  return (
                    <div key={cat} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <button
                        onClick={() => toggleCat(cat)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[cat] }} />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">{cat}</div>
                          <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)', maxWidth: '180px' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(pct * 100)}%`, background: CAT_COLORS[cat] }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-[var(--text-primary)]">{fmtZAR(amount)}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{txs.length + rfds.length} tx · {Math.round(pct * 100)}%</div>
                        </div>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--text-faint)] flex-shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }} fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
                      </button>
                      {isOpen && (
                        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                          {[...txs, ...rfds]
                            .sort((a, b) => b.timestamp - a.timestamp)
                            .map(tx => <TxRow key={tx.id} tx={tx} onReCat={setReCatTx} />)
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* All transactions view */}
            {viewMode === 'all' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {(['all','spending','moneyin','refunds','fees'] as AllFilter[]).map(f => (
                    <button key={f} onClick={() => setAllFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer capitalize"
                      style={{ background: allFilter === f ? 'var(--accent-dim)' : 'var(--bg-secondary)', color: allFilter === f ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {f === 'moneyin' ? 'Money In' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search merchant…"
                    className="ml-auto px-3 py-1.5 text-xs rounded-lg"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', outline: 'none', minWidth: '150px' }}
                  />
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {filteredAll.length === 0
                    ? <div className="p-8 text-center text-sm text-[var(--text-muted)]">No transactions match.</div>
                    : filteredAll.map(tx => <TxRow key={tx.id} tx={tx} onReCat={setReCatTx} />)
                  }
                </div>
              </div>
            )}

            {/* Monthly insights */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-sm font-bold text-[var(--text-primary)] mb-4">Monthly insights</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {insights.topCat && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Top category</div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">{insights.topCat.cat}</div>
                    <div className="text-xs text-[var(--text-muted)]">{fmtZAR(insights.topCat.amount)}</div>
                  </div>
                )}
                {insights.largest && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Largest purchase</div>
                    <div className="text-sm font-bold text-[var(--text-primary)] truncate">{insights.largest.description.trim()}</div>
                    <div className="text-xs text-[var(--text-muted)]">{fmtZAR(insights.largest.amountZar)}</div>
                  </div>
                )}
                {insights.mostVisited && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Most visited</div>
                    <div className="text-sm font-bold text-[var(--text-primary)] truncate">{insights.mostVisited[0]}</div>
                    <div className="text-xs text-[var(--text-muted)]">{insights.mostVisited[1]} transactions</div>
                  </div>
                )}
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Avg transaction</div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{fmtZAR(insights.avg)}</div>
                  <div className="text-xs text-[var(--text-muted)]">{spends.length} transactions</div>
                </div>
                {totalCashback > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Cashback earned</div>
                    <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>${totalCashback.toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {reCatTx && (
        <CategoryOverrideModal
          tx={reCatTx}
          onClose={() => setReCatTx(null)}
          onSave={async (id, cat, applyAll, key) => { await handleReCat(id, cat, applyAll, key) }}
        />
      )}
    </div>
  )
}
