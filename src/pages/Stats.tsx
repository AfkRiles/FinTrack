import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { subMonths, format } from 'date-fns'
import { GlassCard } from '../components/ui/GlassCard'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { formatZAR, formatUSD } from '../lib/fx'

export function StatsPage() {
  const { currency, fxRate } = useAppStore()
  const rate = fxRate?.usdToZar || 18.5
  const fmt = (usd: number) => currency === 'ZAR' ? formatZAR(usd * rate) : formatUSD(usd)

  const entries    = useLiveQuery(() => db.incomeEntries.orderBy('date').toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const [selectedClient, setSelectedClient] = useState<string | null>(null)

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

  // Entries for the selected client (newest first)
  const clientEntries = useMemo(() => {
    if (!selectedClient || !entries) return []
    const key = selectedClient.toLowerCase().trim()
    return [...entries]
      .filter(e => e.sourceName.toLowerCase().trim() === key)
      .sort((a, b) => b.date - a.date)
  }, [selectedClient, entries])

  // Category map for entry detail
  const catMap = useMemo(() => new Map((categories || []).map(c => [c.id, c])), [categories])

  const totalAll  = entries?.reduce((s, e) => s + e.amountUSD, 0) || 0
  const topClient = clientStats[0]
  const concentration = topClient && totalAll > 0 ? (topClient.total / totalAll) * 100 : 0

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const lastMonthStart = subMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1).getTime()
  const thisMonthTotal = entries?.filter(e => e.date >= thisMonthStart).reduce((s, e) => s + e.amountUSD, 0) || 0
  const lastMonthTotal = entries?.filter(e => e.date >= lastMonthStart && e.date < thisMonthStart).reduce((s, e) => s + e.amountUSD, 0) || 0
  const momChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null

  const monthlyTotals = new Map<string, number>()
  entries?.forEach(e => {
    const key = format(new Date(e.date), 'yyyy-MM')
    monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + e.amountUSD)
  })
  let bestMonth = { key: '', value: 0 }
  monthlyTotals.forEach((v, k) => { if (v > bestMonth.value) bestMonth = { key: k, value: v } })

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
      <div className="p-8 space-y-6 page-enter">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Analytics</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Income trends and client breakdown</p>
        </div>

        {/* Growth + concentration row */}
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="col-span-2">
            <div className="label mb-4">GROWTH OVERVIEW</div>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">This Month</div>
                <div className="font-bold text-xl text-[var(--text-primary)]">{fmt(thisMonthTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">vs Last Month</div>
                <div className={`font-bold text-xl ${momChange !== null ? (momChange >= 0 ? 'text-[var(--accent)]' : 'text-red-400') : 'text-[var(--text-muted)]'}`}>
                  {momChange !== null ? `${momChange >= 0 ? '+' : ''}${momChange.toFixed(1)}%` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">Best Month Ever</div>
                <div className="font-bold text-xl text-[var(--text-primary)]">{bestMonth.key ? fmt(bestMonth.value) : '—'}</div>
                {bestMonth.key && <div className="text-[10px] text-[var(--text-muted)]">{format(new Date(bestMonth.key + '-15'), 'MMM yyyy')}</div>}
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">All Time</div>
                <div className="font-bold text-xl text-[var(--text-primary)]">{fmt(totalAll)}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{entries?.length} entries</div>
              </div>
            </div>

            {years.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
                <div className="label mb-3">YEAR BY YEAR</div>
                <div className="space-y-2">
                  {years.map(([year, total]) => {
                    const maxYear = Math.max(...Array.from(yearlyTotals.values()))
                    return (
                      <div key={year} className="flex items-center gap-3">
                        <div className="w-10 text-xs font-semibold text-[var(--text-muted)]">{year}</div>
                        <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${(total / maxYear) * 100}%` }} />
                        </div>
                        <div className="w-28 text-right text-sm font-bold text-[var(--text-primary)]">{fmt(total)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="label mb-3">INCOME CONCENTRATION</div>
            {topClient ? (
              <>
                <div className="text-4xl font-black text-[var(--text-primary)]">{concentration.toFixed(0)}%</div>
                <div className="text-sm text-[var(--text-muted)] mt-1">from top client</div>
                <div className="font-bold text-[var(--text-primary)] mt-2">{topClient.name}</div>
                <div className="mt-4 h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${concentration > 70 ? 'bg-red-400' : concentration > 50 ? 'bg-yellow-400' : 'bg-[var(--accent)]'}`}
                    style={{ width: `${Math.min(concentration, 100)}%` }}
                  />
                </div>
                {concentration > 70 && <div className="text-xs text-red-400 mt-2">⚠ High concentration risk</div>}
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-1.5">
                  {clientStats.slice(0, 4).map((c, i) => (
                    <div key={c.name} className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{i + 1}. {c.name}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{totalAll > 0 ? ((c.total / totalAll) * 100).toFixed(1) : 0}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="text-[var(--text-muted)] text-sm">No data</div>}
          </GlassCard>
        </div>

        {/* Client leaderboard */}
        <GlassCard noPadding>
          <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="label">CLIENT LEADERBOARD — ALL TIME</div>
            {selectedClient && (
              <button
                onClick={() => setSelectedClient(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                ✕ close detail
              </button>
            )}
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {clientStats.map((client, i) => {
              const isSelected = selectedClient === client.name
              return (
                <div key={client.name}>
                  {/* Client row */}
                  <div
                    onClick={() => setSelectedClient(isSelected ? null : client.name)}
                    className="flex items-center gap-5 px-6 py-4 cursor-pointer transition-colors"
                    style={isSelected
                      ? { background: 'var(--accent-dim)' }
                      : undefined}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-400/20 text-yellow-500' :
                      i === 1 ? 'bg-gray-300/30 text-gray-400' :
                      i === 2 ? 'bg-orange-400/20 text-orange-400' :
                                'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}>{i + 1}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">{client.name}</span>
                        {isSelected && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">expanded</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {client.count} payment{client.count !== 1 ? 's' : ''} · avg {fmt(client.total / client.count)} · first {format(new Date(client.first), 'MMM yyyy')}
                      </div>
                    </div>

                    <div className="w-40 hidden md:block">
                      <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${totalAll > 0 ? (client.total / totalAll) * 100 : 0}%` }} />
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-1">{totalAll > 0 ? ((client.total / totalAll) * 100).toFixed(1) : 0}% of total</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-[var(--text-primary)]">{fmt(client.total)}</div>
                      <div className="text-xs text-[var(--text-muted)]">last: {format(new Date(client.last), 'MMM yyyy')}</div>
                    </div>

                    {/* Expand chevron */}
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      className="w-4 h-4 text-[var(--text-faint)] flex-shrink-0 transition-transform"
                      style={{ transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Expanded entries */}
                  {isSelected && (
                    <div className="border-t border-[var(--border-subtle)]" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="px-6 py-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)]">All payments from {client.name}</span>
                      </div>
                      {clientEntries.map(e => {
                        const cat = catMap.get(e.categoryId)
                        return (
                          <div key={e.id} className="flex items-center gap-4 px-8 py-2.5 border-t border-[var(--border-subtle)] hover:bg-[var(--bg-primary)] transition-colors">
                            {/* Date */}
                            <div className="w-24 flex-shrink-0">
                              <div className="text-xs font-semibold text-[var(--text-primary)]">
                                {format(new Date(e.date), 'd MMM yyyy')}
                              </div>
                            </div>
                            {/* Category pill */}
                            {cat && (
                              <div
                                className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: `${cat.color}18`, color: cat.color }}
                              >
                                {cat.name}
                              </div>
                            )}
                            {/* Note */}
                            {e.note && (
                              <div className="flex-1 min-w-0 text-xs text-[var(--text-muted)] truncate">{e.note}</div>
                            )}
                            <div className="flex-1" />
                            {/* Amount */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-bold text-[var(--text-primary)]">{fmt(e.amountUSD)}</div>
                              {e.currency !== 'USD' && (
                                <div className="text-[10px] text-[var(--text-muted)]">
                                  {e.amount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {e.currency}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <div className="px-8 py-2.5 border-t border-[var(--border-subtle)] flex justify-between items-center">
                        <span className="text-xs text-[var(--text-muted)]">{clientEntries.length} entries</span>
                        <span className="text-sm font-extrabold text-[var(--text-primary)]">{fmt(client.total)}</span>
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
