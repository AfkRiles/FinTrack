import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { subMonths, format, startOfMonth, endOfMonth, startOfYear } from 'date-fns'
import { GlassCard } from '../components/ui/GlassCard'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { formatZAR, formatUSD, formatUSDFull, formatZARFull } from '../lib/fx'

export function StatsPage() {
  const { currency, fxRate } = useAppStore()
  const rate = fxRate?.usdToZar || 18.5
  const fmt = (usd: number) => currency === 'ZAR' ? formatZAR(usd * rate) : formatUSD(usd)
  const fmtFull = (usd: number) => currency === 'ZAR' ? formatZARFull(usd * rate) : formatUSDFull(usd)

  const entries    = useLiveQuery(() => db.incomeEntries.orderBy('date').toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const [selectedClient, setSelectedClient] = useState<string | null>(null)

  const now = new Date()

  // ── Client stats ─────────────────────────────────────────────────────────
  const clientStats = useMemo(() => {
    if (!entries) return []
    const map = new Map<string, { name: string; total: number; count: number; first: number; last: number }>()
    entries.forEach(e => {
      const key = e.sourceName.toLowerCase().trim()
      if (!map.has(key)) {
        map.set(key, { name: e.sourceName, total: 0, count: 0, first: e.date, last: e.date })
      }
      const rec = map.get(key)!
      rec.total += e.amountUSD
      rec.count++
      rec.first = Math.min(rec.first, e.date)
      rec.last  = Math.max(rec.last, e.date)
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [entries])

  const clientEntries = useMemo(() => {
    if (!selectedClient || !entries) return []
    const key = selectedClient.toLowerCase().trim()
    return [...entries]
      .filter(e => e.sourceName.toLowerCase().trim() === key)
      .sort((a, b) => b.date - a.date)
  }, [selectedClient, entries])

  const catMap = useMemo(() => new Map((categories || []).map(c => [c.id, c])), [categories])

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalAll = entries?.reduce((s, e) => s + e.amountUSD, 0) || 0
  const topClient = clientStats[0]
  const concentration = topClient && totalAll > 0 ? (topClient.total / totalAll) * 100 : 0

  const thisMonthStart = startOfMonth(now).getTime()
  const lastMonthStart = subMonths(startOfMonth(now), 1).getTime()
  const thisMonthTotal = entries?.filter(e => e.date >= thisMonthStart).reduce((s, e) => s + e.amountUSD, 0) || 0
  const lastMonthTotal = entries?.filter(e => e.date >= lastMonthStart && e.date < thisMonthStart).reduce((s, e) => s + e.amountUSD, 0) || 0
  const momChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null

  // Best month
  const monthlyTotals = new Map<string, number>()
  entries?.forEach(e => {
    const key = format(new Date(e.date), 'yyyy-MM')
    monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + e.amountUSD)
  })
  let bestMonth = { key: '', value: 0 }
  monthlyTotals.forEach((v, k) => { if (v > bestMonth.value) bestMonth = { key: k, value: v } })

  // YTD
  const ytdTotal = entries?.filter(e => e.date >= startOfYear(now).getTime()).reduce((s, e) => s + e.amountUSD, 0) || 0

  // Last 12 months trend
  const last12Months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i)
      const mStart = startOfMonth(d).getTime()
      const mEnd   = endOfMonth(d).getTime()
      const value  = (entries || []).filter(e => e.date >= mStart && e.date <= mEnd).reduce((s, e) => s + e.amountUSD, 0)
      return { label: format(d, 'MMM'), value }
    })
  }, [entries])

  const avg12 = last12Months.reduce((s, m) => s + m.value, 0) / 12

  // Category totals
  const categoryData = useMemo(() => {
    if (!entries || !categories) return []
    const map = new Map<string, number>()
    entries.forEach(e => map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amountUSD))
    return (categories || [])
      .map(cat => ({ ...cat, total: map.get(cat.id) || 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [entries, categories])

  // Year by year
  const yearlyTotals = new Map<number, number>()
  entries?.forEach(e => {
    const y = new Date(e.date).getFullYear()
    yearlyTotals.set(y, (yearlyTotals.get(y) || 0) + e.amountUSD)
  })
  const years = Array.from(yearlyTotals.entries()).sort((a, b) => a[0] - b[0])

  if (!entries || entries.length === 0) {
    return (
      <div className="page-scroll">
        <div className="p-8 page-enter">
          <div className="text-center py-32 text-[var(--text-muted)]">
            <div className="text-6xl mb-4">📊</div>
            <div className="font-semibold text-xl">No data yet</div>
            <div className="text-sm mt-2">Add income entries to see analytics here.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-scroll">
      <div className="p-8 space-y-5 page-enter">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Analytics</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Income trends and client breakdown</p>
        </div>

        {/* ── 5-card KPI row ── */}
        <div className="grid grid-cols-5 gap-3">
          <KPICard label="YEAR TO DATE" value={fmt(ytdTotal)} sub={String(now.getFullYear())} />
          <KPICard label="BEST MONTH" value={fmt(bestMonth.value)} sub={bestMonth.key ? format(new Date(bestMonth.key + '-15'), 'MMM yyyy') : '—'} />
          <KPICard label="12-MO AVG" value={fmt(avg12)} sub="per month" />
          <KPICard
            label="TOP CLIENT"
            value={`${concentration.toFixed(0)}%`}
            sub={topClient?.name || '—'}
            accent={concentration > 70 ? 'red' : concentration > 50 ? 'amber' : undefined}
          />
          <KPICard label="TOTAL CLIENTS" value={String(clientStats.length)} sub="all time" />
        </div>

        {/* ── Trend + Category charts ── */}
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="label">INCOME TREND — LAST 12 MONTHS</div>
              {momChange !== null && (
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${momChange >= 0 ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'bg-red-400/10 text-red-400'}`}>
                  MoM {momChange >= 0 ? '+' : ''}{momChange.toFixed(1)}%
                </div>
              )}
            </div>
            <TrendChart data={last12Months} fmt={fmt} />
          </GlassCard>

          <GlassCard>
            <div className="label mb-4">BY CATEGORY</div>
            <CategoryBars data={categoryData} totalAll={totalAll} fmt={fmt} />
          </GlassCard>
        </div>

        {/* ── Year by year + Concentration ── */}
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="col-span-2">
            <div className="label mb-4">YEAR BY YEAR</div>
            <div className="space-y-3">
              {years.map(([year, total]) => {
                const maxYear = Math.max(...Array.from(yearlyTotals.values()))
                const pct = (total / maxYear) * 100
                return (
                  <div key={year} className="flex items-center gap-3">
                    <div className="w-10 text-xs font-bold text-[var(--text-muted)] tabular-nums">{year}</div>
                    <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-24 text-right text-sm font-bold text-[var(--text-primary)] tabular-nums">{fmt(total)}</div>
                    <div className="w-10 text-right text-[10px] text-[var(--text-muted)] tabular-nums">{pct.toFixed(0)}%</div>
                  </div>
                )
              })}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="label mb-3">INCOME CONCENTRATION</div>
            {topClient ? (
              <>
                <div className="text-4xl font-black text-[var(--text-primary)]">{concentration.toFixed(0)}%</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">from top client</div>
                <div className="font-semibold text-[var(--text-primary)] mt-2 text-sm">{topClient.name}</div>
                <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${concentration > 70 ? 'bg-red-400' : concentration > 50 ? 'bg-amber-400' : 'bg-[var(--accent)]'}`}
                    style={{ width: `${Math.min(concentration, 100)}%` }}
                  />
                </div>
                {concentration > 70 && <div className="text-xs text-red-400 mt-2">⚠ High concentration risk</div>}
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                  {clientStats.slice(0, 5).map((c, i) => (
                    <div key={c.name} className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-muted)] truncate max-w-[120px]">{i + 1}. {c.name}</span>
                      <span className="font-semibold text-[var(--text-primary)] ml-2 flex-shrink-0">{totalAll > 0 ? ((c.total / totalAll) * 100).toFixed(1) : 0}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="text-[var(--text-muted)] text-sm">No data</div>}
          </GlassCard>
        </div>

        {/* ── Client table ── */}
        <GlassCard noPadding>
          <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="label">ALL CLIENTS</div>
            {selectedClient && (
              <button
                onClick={() => setSelectedClient(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕ close
              </button>
            )}
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {clientStats.map((client, i) => {
              const isSelected = selectedClient === client.name
              return (
                <div key={client.name}>
                  <div
                    onClick={() => setSelectedClient(isSelected ? null : client.name)}
                    className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors"
                    style={isSelected ? { background: 'var(--accent-dim)' } : undefined}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-400/20 text-yellow-500' :
                      i === 1 ? 'bg-[var(--text-faint)]/30 text-[var(--text-muted)]' :
                      i === 2 ? 'bg-orange-400/20 text-orange-400' :
                                'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}>{i + 1}</div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[var(--text-primary)] truncate">{client.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {client.count} payment{client.count !== 1 ? 's' : ''} · avg {fmt(client.total / client.count)}
                      </div>
                    </div>

                    <div className="w-36 hidden md:block">
                      <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${totalAll > 0 ? (client.total / totalAll) * 100 : 0}%` }} />
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{totalAll > 0 ? ((client.total / totalAll) * 100).toFixed(1) : 0}% of total</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-sm text-[var(--text-primary)] tabular-nums">{fmt(client.total)}</div>
                      <div className="text-xs text-[var(--text-muted)]">{format(new Date(client.last), 'MMM yyyy')}</div>
                    </div>

                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      className="w-3.5 h-3.5 text-[var(--text-faint)] flex-shrink-0 transition-transform"
                      style={{ transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {isSelected && (
                    <div className="border-t border-[var(--border-subtle)]" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="px-8 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)]">
                        All payments from {client.name}
                      </div>
                      {clientEntries.map(e => {
                        const cat = catMap.get(e.categoryId)
                        return (
                          <div key={e.id} className="flex items-center gap-4 px-8 py-2.5 border-t border-[var(--border-subtle)] hover:bg-[var(--bg-primary)] transition-colors">
                            <div className="w-24 flex-shrink-0 text-xs font-semibold text-[var(--text-primary)]">
                              {format(new Date(e.date), 'd MMM yyyy')}
                            </div>
                            {cat && (
                              <div className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: `${cat.color}18`, color: cat.color }}>
                                {cat.name}
                              </div>
                            )}
                            {e.note && <div className="flex-1 min-w-0 text-xs text-[var(--text-muted)] truncate">{e.note}</div>}
                            <div className="flex-1" />
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{fmtFull(e.amountUSD)}</div>
                              {e.currency !== 'USD' && (
                                <div className="text-[10px] text-[var(--text-muted)]">
                                  {e.amount.toLocaleString('en-ZA', { maximumFractionDigits: 2 })} {e.currency}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <div className="px-8 py-2.5 border-t border-[var(--border-subtle)] flex justify-between items-center">
                        <span className="text-xs text-[var(--text-muted)]">{clientEntries.length} entries</span>
                        <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">{fmtFull(client.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </GlassCard>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: 'red' | 'amber' }) {
  const color = accent === 'red' ? 'text-red-400' : accent === 'amber' ? 'text-amber-400' : 'text-[var(--text-primary)]'
  return (
    <GlassCard small>
      <div className="label mb-2">{label}</div>
      <div className={`text-xl font-extrabold tracking-tight leading-none ${color}`}>{value}</div>
      <div className="text-[10px] text-[var(--text-muted)] mt-1.5 truncate">{sub}</div>
    </GlassCard>
  )
}

function TrendChart({ data, fmt }: { data: { label: string; value: number }[]; fmt: (n: number) => string }) {
  const W = 560, H = 120
  const PAD = { t: 8, r: 8, b: 28, l: 8 }
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const n = data.length

  const pts = data.map((d, i) => ({
    x: PAD.l + (i / Math.max(n - 1, 1)) * cW,
    y: PAD.t + (1 - d.value / maxVal) * cH,
    ...d,
  }))

  // Smooth bezier line
  const linePath = pts.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i - 1]
    const cx = (prev.x + p.x) / 2
    return `C ${cx} ${prev.y} ${cx} ${p.y} ${p.x} ${p.y}`
  }).join(' ')

  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x} ${H - PAD.b} L ${pts[0].x} ${H - PAD.b} Z`
    : ''

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} aria-hidden>
        <defs>
          <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill="url(#trendArea)" />}
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="var(--accent)" />
            <text
              x={p.x} y={H - 4}
              textAnchor="middle" fontSize="9"
              fill="var(--text-muted)"
              fontFamily="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
            >{p.label}</text>
          </g>
        ))}
      </svg>
      {/* Hover-friendy value below the peak */}
      <div className="flex justify-between mt-1 px-1">
        <span className="text-[10px] text-[var(--text-faint)]">{fmt(0)}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-semibold">Peak: {fmt(maxVal)}</span>
      </div>
    </div>
  )
}

function CategoryBars({ data, totalAll, fmt }: { data: { name: string; color: string; total: number }[]; totalAll: number; fmt: (n: number) => string }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="space-y-3.5">
      {data.map(cat => (
        <div key={cat.name}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
              <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{cat.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">{fmt(cat.total)}</span>
              <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-8 text-right">
                {totalAll > 0 ? ((cat.total / totalAll) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(cat.total / max) * 100}%`, background: cat.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
