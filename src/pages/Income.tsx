import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { GlassCard } from '../components/ui/GlassCard'
import { DonutWithLegend } from '../components/ui/DonutChart'
import { BarChart } from '../components/ui/BarChart'
import { CurrencyToggle } from '../components/ui/CurrencyToggle'
import { AddIncomeSheet } from '../components/income/AddIncomeSheet'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { ensureFXRate, formatZAR, formatUSD } from '../lib/fx'
import type { Category, IncomeEntry } from '../types'

type ViewMode = 'monthly' | 'yearly' | 'all'

export function IncomePage() {
  const { currency, fxRate, setFXRate } = useAppStore()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [addOpen, setAddOpen] = useState(false)
  const [prefillDate, setPrefillDate] = useState<Date | undefined>()
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null)
  const [drillMonth, setDrillMonth] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray(), [])
  const allEntries = useLiveQuery(() => db.incomeEntries.orderBy('date').toArray(), [])

  // Fetch FX on mount
  useEffect(() => {
    ensureFXRate().then((rate) => {
      if (!fxRate || Math.abs(fxRate.usdToZar - rate) > 0.001) {
        setFXRate({ usdToZar: rate, fetchedAt: Date.now() })
      }
    })
  }, [])

  const rate = fxRate?.usdToZar || 18.5

  const fmt = useCallback((usd: number) => {
    return currency === 'ZAR' ? formatZAR(usd * rate) : formatUSD(usd)
  }, [currency, rate])

  // This month stats
  const now = new Date()
  const thisMonthStart = startOfMonth(now).getTime()
  const thisMonthEnd = endOfMonth(now).getTime()
  const thisMonthEntries = allEntries?.filter(e => e.date >= thisMonthStart && e.date <= thisMonthEnd) || []
  const thisMonthTotal = thisMonthEntries.reduce((s, e) => s + e.amountUSD, 0)

  // Year total
  const yearStart = startOfYear(new Date(selectedYear, 0)).getTime()
  const yearEnd = endOfYear(new Date(selectedYear, 0)).getTime()
  const yearEntries = allEntries?.filter(e => e.date >= yearStart && e.date <= yearEnd) || []
  const yearTotal = yearEntries.reduce((s, e) => s + e.amountUSD, 0)

  // 3-month rolling average
  const threeMonthsAgo = subMonths(now, 3).getTime()
  const recent3 = allEntries?.filter(e => e.date >= threeMonthsAgo) || []
  const avg3 = recent3.reduce((s, e) => s + e.amountUSD, 0) / 3

  // Category breakdown for year
  const catMap = new Map<string, number>()
  yearEntries.forEach(e => {
    catMap.set(e.categoryId, (catMap.get(e.categoryId) || 0) + e.amountUSD)
  })
  const catList = categories?.map(cat => ({
    ...cat,
    total: catMap.get(cat.id) || 0,
  })).filter(c => c.total > 0) || []

  const donutSegments = catList.map(c => ({ value: c.total, color: c.color, label: c.name }))
  const legendItems = catList.map(c => ({
    label: c.name,
    value: fmt(c.total),
    color: c.color,
    pct: `${yearTotal > 0 ? ((c.total / yearTotal) * 100).toFixed(1) : 0}%`,
  }))

  // Monthly bar data
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyBars = MONTHS.map((label, i) => {
    const mStart = new Date(selectedYear, i, 1).getTime()
    const mEnd = endOfMonth(new Date(selectedYear, i)).getTime()
    const entries = allEntries?.filter(e => e.date >= mStart && e.date <= mEnd) || []
    const value = entries.reduce((s, e) => s + e.amountUSD, 0)
    // Find dominant category for color
    const catTotals = new Map<string, number>()
    entries.forEach(e => catTotals.set(e.categoryId, (catTotals.get(e.categoryId) || 0) + e.amountUSD))
    let topCatId = ''
    let topVal = 0
    catTotals.forEach((v, k) => { if (v > topVal) { topVal = v; topCatId = k } })
    const color = categories?.find(c => c.id === topCatId)?.color || '#00C27C'
    return { label, value, color }
  })

  const handleBarClick = (i: number) => {
    setSelectedMonthIndex(i)
    setDrillMonth(new Date(selectedYear, i, 1))
  }

  const handleHeroTap = () => {
    setPrefillDate(now)
    setAddOpen(true)
  }

  const handleRefreshRate = async () => {
    setRefreshing(true)
    try {
      const { fetchFXRate } = await import('../lib/fx')
      const r = await fetchFXRate()
      setFXRate({ usdToZar: r, fetchedAt: Date.now() })
    } finally {
      setRefreshing(false)
    }
  }

  if (drillMonth) {
    return (
      <MonthDrillDown
        month={drillMonth}
        categories={categories || []}
        entries={allEntries || []}
        fmt={fmt}
        onBack={() => setDrillMonth(null)}
        onEditEntry={() => {}}
      />
    )
  }

  return (
    <div className="page-scroll">
      <div className="px-4 pb-28 max-w-lg mx-auto space-y-4 pt-2 page-enter">

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Income</h1>
        </div>

        {/* Currency toggle + rate */}
        <CurrencyToggle />

        {/* Hero card + stat cards */}
        <div className="flex gap-3">
          <GlassCard
            className="flex-[1.6] cursor-pointer"
            onClick={handleHeroTap}
            style={{ background: 'linear-gradient(135deg, #00C27C, #00A06A)' }}
          >
            <div className="label text-white/70">THIS MONTH</div>
            <div className="hero-number text-white mt-2">
              {thisMonthTotal === 0
                ? (currency === 'ZAR' ? 'R0' : '$0')
                : fmt(thisMonthTotal)}
            </div>
            <div className="text-white/80 text-sm font-medium mt-1">
              {format(now, 'MMMM')}
            </div>
          </GlassCard>

          <div className="flex flex-col gap-3 flex-1">
            <GlassCard small>
              <div className="label">YEAR TOTAL</div>
              <div className="amount-lg mt-1">{fmt(yearTotal)}</div>
            </GlassCard>
            <GlassCard small>
              <div className="label">3-MO AVG</div>
              <div className="amount-lg mt-1">{fmt(avg3)}</div>
            </GlassCard>
          </div>
        </div>

        {/* Donut chart */}
        {catList.length > 0 && (
          <GlassCard>
            <DonutWithLegend
              segments={donutSegments}
              total={fmt(yearTotal)}
              subtitle={String(selectedYear)}
              size={130}
              thickness={22}
              legendItems={legendItems}
            />
          </GlassCard>
        )}

        {/* Bar chart */}
        <GlassCard noPadding className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                className="w-7 h-7 glass-sm rounded-full flex items-center justify-center text-[var(--text-muted)]"
              >
                ‹
              </button>
              <span className="font-bold text-[var(--text-primary)]">{selectedYear}</span>
              <button
                onClick={() => setSelectedYear(y => y + 1)}
                className="w-7 h-7 glass-sm rounded-full flex items-center justify-center text-[var(--text-muted)]"
              >
                ›
              </button>
            </div>
            <div className="flex gap-1">
              {(['monthly', 'yearly', 'all'] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    viewMode === m
                      ? 'bg-[#00C27C] text-white'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-5">
            <BarChart
              bars={monthlyBars}
              onBarClick={handleBarClick}
              activeIndex={selectedMonthIndex ?? undefined}
              formatValue={(v) => currency === 'ZAR' ? formatZAR(v * rate) : formatUSD(v)}
            />
          </div>
        </GlassCard>

      </div>

      <AddIncomeSheet
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        prefillDate={prefillDate}
        onSaved={() => {}}
      />
    </div>
  )
}

// Month drill-down screen
function MonthDrillDown({
  month, categories, entries, fmt, onBack,
}: {
  month: Date
  categories: Category[]
  entries: IncomeEntry[]
  fmt: (usd: number) => string
  onBack: () => void
  onEditEntry: (id: string) => void
}) {
  const mStart = startOfMonth(month).getTime()
  const mEnd = endOfMonth(month).getTime()
  const monthEntries = entries.filter(e => e.date >= mStart && e.date <= mEnd)
  const total = monthEntries.reduce((s, e) => s + e.amountUSD, 0)

  const catTotals = new Map<string, number>()
  monthEntries.forEach(e => catTotals.set(e.categoryId, (catTotals.get(e.categoryId) || 0) + e.amountUSD))

  const catBreakdown = categories
    .map(cat => ({ ...cat, total: catTotals.get(cat.id) || 0 }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)

  const filteredEntries = selectedCatId
    ? monthEntries.filter(e => e.categoryId === selectedCatId)
    : monthEntries

  return (
    <div className="page-scroll">
      <div className="px-4 pb-28 max-w-lg mx-auto space-y-4 pt-2 page-enter">
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onBack}
            className="glass-sm rounded-xl px-3 py-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]"
          >
            ‹ Back
          </button>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {format(month, 'MMMM yyyy')}
          </h2>
        </div>

        {/* Total */}
        <GlassCard>
          <div className="label">TOTAL INCOME</div>
          <div className="hero-number mt-2">{fmt(total)}</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">{monthEntries.length} entries</div>
        </GlassCard>

        {/* Donut */}
        {catBreakdown.length > 0 && (
          <GlassCard>
            <DonutWithLegend
              segments={catBreakdown.map(c => ({ value: c.total, color: c.color, label: c.name }))}
              total={String(catBreakdown.length)}
              subtitle="categories"
              size={110}
              thickness={18}
              legendItems={catBreakdown.map(c => ({
                label: c.name,
                value: fmt(c.total),
                color: c.color,
                pct: `${total > 0 ? ((c.total / total) * 100).toFixed(1) : 0}%`,
              }))}
            />
          </GlassCard>
        )}

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !selectedCatId ? 'bg-[#00C27C] text-white' : 'glass-sm text-[var(--text-muted)]'
            }`}
          >
            All
          </button>
          {catBreakdown.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id === selectedCatId ? null : cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCatId === cat.id ? 'text-white' : 'glass-sm text-[var(--text-muted)]'
              }`}
              style={selectedCatId === cat.id ? { background: cat.color } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Entry list */}
        <div className="space-y-2">
          {filteredEntries
            .sort((a, b) => b.date - a.date)
            .map(entry => {
              const cat = categories.find(c => c.id === entry.categoryId)
              return (
                <GlassCard key={entry.id} small className="flex items-center gap-3">
                  <div
                    className="w-2 h-10 rounded-full flex-shrink-0"
                    style={{ background: cat?.color || '#00C27C' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--text-primary)] truncate">{entry.sourceName}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {cat?.name} · {format(new Date(entry.date), 'MMM d')}
                    </div>
                    {entry.note && (
                      <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">{entry.note}</div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-[var(--text-primary)]">{fmt(entry.amountUSD)}</div>
                    <div className="text-xs text-[var(--text-muted)]">{entry.amount} {entry.currency}</div>
                  </div>
                </GlassCard>
              )
            })}
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <div className="text-4xl mb-3">📭</div>
            <div className="font-semibold">No entries</div>
          </div>
        )}
      </div>
    </div>
  )
}
