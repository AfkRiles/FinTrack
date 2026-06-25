import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { GlassCard } from '../components/ui/GlassCard'
import { DonutWithLegend } from '../components/ui/DonutChart'
import { BarChart } from '../components/ui/BarChart'
import { AddIncomeSheet } from '../components/income/AddIncomeSheet'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { ensureFXRate, formatZAR, formatUSD } from '../lib/fx'
import type { Category, IncomeEntry } from '../types'

export function IncomePage() {
  const { currency, fxRate, setFXRate } = useAppStore()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [addOpen, setAddOpen] = useState(false)
  const [prefillDate, setPrefillDate] = useState<Date | undefined>()
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null)
  const [drillMonth, setDrillMonth] = useState<Date | null>(null)

  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray(), [])
  const allEntries = useLiveQuery(() => db.incomeEntries.orderBy('date').toArray(), [])

  useEffect(() => {
    ensureFXRate().then(rate => {
      if (!fxRate || Math.abs(fxRate.usdToZar - rate) > 0.001) {
        setFXRate({ usdToZar: rate, fetchedAt: Date.now() })
      }
    })
  }, [])

  const rate = fxRate?.usdToZar || 18.5
  const fmt = useCallback((usd: number) =>
    currency === 'ZAR' ? formatZAR(usd * rate) : formatUSD(usd),
    [currency, rate])

  const now = new Date()
  const thisMonthStart = startOfMonth(now).getTime()
  const thisMonthEnd = endOfMonth(now).getTime()
  const thisMonthEntries = allEntries?.filter(e => e.date >= thisMonthStart && e.date <= thisMonthEnd) || []
  const thisMonthTotal = thisMonthEntries.reduce((s, e) => s + e.amountUSD, 0)

  const lastMonthStart = subMonths(startOfMonth(now), 1).getTime()
  const lastMonthEntries = allEntries?.filter(e => e.date >= lastMonthStart && e.date < thisMonthStart) || []
  const lastMonthTotal = lastMonthEntries.reduce((s, e) => s + e.amountUSD, 0)
  const momPct = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null

  const yearStart = startOfYear(new Date(selectedYear, 0)).getTime()
  const yearEnd = endOfYear(new Date(selectedYear, 0)).getTime()
  const yearEntries = allEntries?.filter(e => e.date >= yearStart && e.date <= yearEnd) || []
  const yearTotal = yearEntries.reduce((s, e) => s + e.amountUSD, 0)

  const threeMonthsAgo = subMonths(now, 3).getTime()
  const avg3 = (allEntries?.filter(e => e.date >= threeMonthsAgo).reduce((s, e) => s + e.amountUSD, 0) || 0) / 3

  const allTimeTotal = allEntries?.reduce((s, e) => s + e.amountUSD, 0) || 0

  // Category breakdown for selected year
  const catMap = new Map<string, number>()
  yearEntries.forEach(e => catMap.set(e.categoryId, (catMap.get(e.categoryId) || 0) + e.amountUSD))
  const catList = (categories || []).map(cat => ({ ...cat, total: catMap.get(cat.id) || 0 })).filter(c => c.total > 0)

  const donutSegments = catList.map(c => ({ value: c.total, color: c.color, label: c.name }))
  const legendItems = catList.map(c => ({
    label: c.name,
    value: fmt(c.total),
    color: c.color,
    pct: `${yearTotal > 0 ? ((c.total / yearTotal) * 100).toFixed(1) : 0}%`,
  }))

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthlyBars = MONTHS.map((label, i) => {
    const mStart = new Date(selectedYear, i, 1).getTime()
    const mEnd = endOfMonth(new Date(selectedYear, i)).getTime()
    const entries = allEntries?.filter(e => e.date >= mStart && e.date <= mEnd) || []
    const value = entries.reduce((s, e) => s + e.amountUSD, 0)
    const catTotals = new Map<string, number>()
    entries.forEach(e => catTotals.set(e.categoryId, (catTotals.get(e.categoryId) || 0) + e.amountUSD))
    let topCatId = ''; let topVal = 0
    catTotals.forEach((v, k) => { if (v > topVal) { topVal = v; topCatId = k } })
    const color = (categories || []).find(c => c.id === topCatId)?.color || 'var(--accent)'
    return { label, value, color, fullLabel: `${MONTH_NAMES[i]} ${selectedYear}` }
  })

  if (drillMonth) {
    return (
      <MonthDrillDown
        month={drillMonth}
        categories={categories || []}
        entries={allEntries || []}
        fmt={fmt}
        onBack={() => { setDrillMonth(null); setSelectedMonthIndex(null) }}
      />
    )
  }

  return (
    <div className="page-scroll">
      <div className="p-8 space-y-5 page-enter">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-4 gap-4">
          {/* This Month — primary hero card */}
          <div
            className="glass rounded-3xl p-5 card-hover cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={() => { setPrefillDate(now); setAddOpen(true) }}
          >
            <div className="label text-white/60">THIS MONTH</div>
            <div className="mt-2 text-3xl font-extrabold text-white tracking-tight leading-none">
              {thisMonthTotal === 0 ? (currency === 'ZAR' ? 'R0' : '$0') : fmt(thisMonthTotal)}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="text-white/60 text-xs">{format(now, 'MMMM yyyy')}</div>
              {momPct !== null && (
                <div className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${momPct >= 0 ? 'bg-white/15 text-white' : 'bg-black/15 text-white/80'}`}>
                  {momPct >= 0 ? '↑' : '↓'} {Math.abs(momPct).toFixed(0)}%
                </div>
              )}
            </div>
          </div>

          <GlassCard className="card-hover">
            <div className="label">YEAR TO DATE</div>
            <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{fmt(yearTotal)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1.5">{selectedYear}</div>
          </GlassCard>

          <GlassCard className="card-hover">
            <div className="label">ROLLING 3-MO AVG</div>
            <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{fmt(avg3)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1.5">Per month</div>
          </GlassCard>

          <GlassCard className="card-hover">
            <div className="label">LIFETIME INCOME</div>
            <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{fmt(allTimeTotal)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1.5">{allEntries?.length || 0} total entries</div>
          </GlassCard>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-5 gap-4">
          {/* Donut — 2/5 */}
          <GlassCard className="col-span-2">
            <div className="label mb-4">YEAR BREAKDOWN — {selectedYear}</div>
            {catList.length > 0
              ? <DonutWithLegend
                  segments={donutSegments}
                  total={fmt(yearTotal)}
                  subtitle={String(selectedYear)}
                  size={160}
                  thickness={24}
                  legendItems={legendItems}
                />
              : (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
                  <div className="text-3xl mb-2 opacity-30">◎</div>
                  <div className="text-sm font-medium">No data for {selectedYear}</div>
                </div>
              )
            }
          </GlassCard>

          {/* Bar chart — 3/5 */}
          <GlassCard className="col-span-3" noPadding>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="label">MONTHLY INCOME — {selectedYear}</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedYear(y => y - 1)}
                  className="w-7 h-7 glass-sm rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all font-bold cursor-pointer"
                >
                  ‹
                </button>
                <span className="font-bold text-sm text-[var(--text-primary)] w-12 text-center tabular-nums">{selectedYear}</span>
                <button
                  onClick={() => setSelectedYear(y => y + 1)}
                  className="w-7 h-7 glass-sm rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all font-bold cursor-pointer"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="px-5 pb-5">
              <BarChart
                bars={monthlyBars}
                onBarClick={i => { setSelectedMonthIndex(i); setDrillMonth(new Date(selectedYear, i, 1)) }}
                activeIndex={selectedMonthIndex ?? undefined}
                formatValue={v => currency === 'ZAR' ? formatZAR(v * rate) : formatUSD(v)}
                height={190}
              />
            </div>
          </GlassCard>
        </div>

        {/* Recent entries — scrollable, capped height */}
        <RecentEntries entries={allEntries || []} categories={categories || []} fmt={fmt} />

      </div>

      <AddIncomeSheet isOpen={addOpen} onClose={() => setAddOpen(false)} prefillDate={prefillDate} onSaved={() => {}} />
    </div>
  )
}

function RecentEntries({ entries, categories, fmt }: {
  entries: IncomeEntry[]; categories: Category[]; fmt: (usd: number) => string
}) {
  const recent = [...entries].sort((a, b) => b.date - a.date).slice(0, 30)
  if (recent.length === 0) return null

  const ROW_HEIGHT = 60 // px per row
  const VISIBLE_ROWS = 4
  const maxHeight = ROW_HEIGHT * VISIBLE_ROWS

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="label">RECENT ENTRIES</div>
        <div className="text-[10px] text-[var(--text-muted)] font-medium">{entries.length} total</div>
      </div>

      {/* Scrollable container with fade */}
      <div className="relative">
        <div
          className="divide-y divide-[var(--border-subtle)] overflow-y-auto"
          style={{ maxHeight, scrollbarWidth: 'none' }}
        >
          {recent.map(entry => {
            const cat = categories.find(c => c.id === entry.categoryId)
            return (
              <div
                key={entry.id}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--bg-secondary)] transition-colors group cursor-default"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Color bar */}
                <div
                  className="w-1 h-7 rounded-full flex-shrink-0 transition-all group-hover:h-9"
                  style={{ background: cat?.color || 'var(--accent)' }}
                />
                {/* Date */}
                <div className="w-24 flex-shrink-0">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)]">
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                  </div>
                </div>
                {/* Name + note */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[var(--text-primary)] truncate">{entry.sourceName}</div>
                  {entry.note && <div className="text-[11px] text-[var(--text-muted)] truncate">{entry.note}</div>}
                </div>
                {/* Category pill */}
                <div className="flex-shrink-0 w-28 flex justify-end">
                  <span
                    className="cat-pill"
                    style={{ background: `${cat?.color}1A`, color: cat?.color || 'var(--accent)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat?.color || 'var(--accent)' }} />
                    {cat?.name || '—'}
                  </span>
                </div>
                {/* Amount */}
                <div className="text-right flex-shrink-0 w-28">
                  <div className="font-bold text-sm text-[var(--text-primary)] tabular-nums">{fmt(entry.amountUSD)}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {entry.amount.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} {entry.currency}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {/* Bottom fade */}
        {recent.length > VISIBLE_ROWS && (
          <div
            className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--surface))' }}
          />
        )}
      </div>
    </GlassCard>
  )
}

function MonthDrillDown({ month, categories, entries, fmt, onBack }: {
  month: Date; categories: Category[]; entries: IncomeEntry[]; fmt: (usd: number) => string; onBack: () => void
}) {
  const mStart = startOfMonth(month).getTime()
  const mEnd = endOfMonth(month).getTime()
  const monthEntries = entries.filter(e => e.date >= mStart && e.date <= mEnd)
  const total = monthEntries.reduce((s, e) => s + e.amountUSD, 0)
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)

  const catTotals = new Map<string, number>()
  monthEntries.forEach(e => catTotals.set(e.categoryId, (catTotals.get(e.categoryId) || 0) + e.amountUSD))
  const catBreakdown = categories.map(cat => ({ ...cat, total: catTotals.get(cat.id) || 0 })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const filteredEntries = selectedCatId ? monthEntries.filter(e => e.categoryId === selectedCatId) : monthEntries

  return (
    <div className="page-scroll">
      <div className="p-8 space-y-5 page-enter">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="glass-sm rounded-xl px-4 py-2 text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5 hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6" strokeLinecap="round" /></svg>
            Back
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{format(month, 'MMMM yyyy')}</h2>
            <p className="text-sm text-[var(--text-muted)]">{monthEntries.length} entries</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <GlassCard>
            <div className="label">TOTAL INCOME</div>
            <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{fmt(total)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1.5">{monthEntries.length} entries</div>
          </GlassCard>
          {catBreakdown.slice(0, 2).map(cat => (
            <GlassCard key={cat.id}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                <div className="label">{cat.name.toUpperCase()}</div>
              </div>
              <div className="mt-1 text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{fmt(cat.total)}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1.5">{total > 0 ? ((cat.total / total) * 100).toFixed(1) : 0}% of total</div>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-4">
          <GlassCard className="col-span-2">
            <div className="label mb-4">BREAKDOWN</div>
            <DonutWithLegend
              segments={catBreakdown.map(c => ({ value: c.total, color: c.color, label: c.name }))}
              total={String(catBreakdown.length)}
              subtitle="categories"
              size={140}
              thickness={22}
              legendItems={catBreakdown.map(c => ({
                label: c.name, value: fmt(c.total), color: c.color,
                pct: `${total > 0 ? ((c.total / total) * 100).toFixed(1) : 0}%`,
              }))}
            />
          </GlassCard>

          <GlassCard className="col-span-3" noPadding>
            <div className="flex items-center gap-2 px-6 pt-4 pb-3 border-b border-[var(--border-subtle)] flex-wrap">
              <button
                onClick={() => setSelectedCatId(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${!selectedCatId ? 'bg-[var(--accent)] text-white' : 'glass-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >All</button>
              {catBreakdown.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCatId(cat.id === selectedCatId ? null : cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedCatId === cat.id ? 'text-white' : 'glass-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                  style={selectedCatId === cat.id ? { background: cat.color } : {}}>
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {filteredEntries.sort((a, b) => b.date - a.date).map(entry => {
                const cat = categories.find(c => c.id === entry.categoryId)
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-6 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                    <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: cat?.color || 'var(--accent)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[var(--text-primary)] truncate">{entry.sourceName}</div>
                      {entry.note && <div className="text-[11px] text-[var(--text-muted)]">{entry.note}</div>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-sm text-[var(--text-primary)] tabular-nums">{fmt(entry.amountUSD)}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{format(new Date(entry.date), 'MMM d')}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
