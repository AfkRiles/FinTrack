import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { subMonths, format } from 'date-fns'
import { GlassCard } from '../components/ui/GlassCard'
import { CurrencyToggle } from '../components/ui/CurrencyToggle'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { formatZAR, formatUSD } from '../lib/fx'

export function StatsPage() {
  const { currency, fxRate } = useAppStore()
  const rate = fxRate?.usdToZar || 18.5
  const fmt = (usd: number) => currency === 'ZAR' ? formatZAR(usd * rate) : formatUSD(usd)

  const entries  = useLiveQuery(() => db.incomeEntries.orderBy('date').toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const clientStats = useMemo(() => {
    if (!entries) return []
    const map = new Map<string, { name: string; total: number; count: number; first: number; last: number }>()
    entries.forEach(e => {
      const key = e.sourceName.toLowerCase().trim()
      const existing = map.get(key) || { name: e.sourceName, total: 0, count: 0, first: e.date, last: e.date }
      existing.total += e.amountUSD
      existing.count++
      existing.first = Math.min(existing.first, e.date)
      existing.last  = Math.max(existing.last, e.date)
      if (!map.has(key)) existing.name = e.sourceName
      map.set(key, existing)
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [entries])

  const totalAll = entries?.reduce((s, e) => s + e.amountUSD, 0) || 0
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

  // Yearly totals
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

        <div className="flex items-center justify-between">
          <CurrencyToggle />
        </div>

        {/* Growth + concentration row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Growth */}
          <GlassCard className="col-span-2">
            <div className="label mb-4">GROWTH OVERVIEW</div>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">This Month</div>
                <div className="font-bold text-xl text-[var(--text-primary)]">{fmt(thisMonthTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">vs Last Month</div>
                <div className={`font-bold text-xl ${momChange !== null ? (momChange >= 0 ? 'text-[#00C27C]' : 'text-red-400') : 'text-[var(--text-muted)]'}`}>
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

            {/* Year-by-year bars */}
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
                          <div className="h-full rounded-full bg-[#00C27C] transition-all" style={{ width: `${(total / maxYear) * 100}%` }} />
                        </div>
                        <div className="w-28 text-right text-sm font-bold text-[var(--text-primary)]">{fmt(total)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Concentration */}
          <GlassCard>
            <div className="label mb-3">INCOME CONCENTRATION</div>
            {topClient ? (
              <>
                <div className="text-4xl font-black text-[var(--text-primary)]">{concentration.toFixed(0)}%</div>
                <div className="text-sm text-[var(--text-muted)] mt-1">from top client</div>
                <div className="font-bold text-[var(--text-primary)] mt-2">{topClient.name}</div>
                <div className="mt-4 h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${concentration > 70 ? 'bg-red-400' : concentration > 50 ? 'bg-yellow-400' : 'bg-[#00C27C]'}`}
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
          <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
            <div className="label">CLIENT LEADERBOARD — ALL TIME</div>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {clientStats.map((client, i) => (
              <div key={client.name} className="flex items-center gap-5 px-6 py-4 hover:bg-[var(--bg-secondary)] transition-colors">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-400/20 text-yellow-500' : i === 1 ? 'bg-gray-300/30 text-gray-400' : i === 2 ? 'bg-orange-400/20 text-orange-400' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--text-primary)] capitalize">{client.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {client.count} payment{client.count !== 1 ? 's' : ''} · avg {fmt(client.total / client.count)} · first {format(new Date(client.first), 'MMM yyyy')}
                  </div>
                </div>
                <div className="w-40 hidden md:block">
                  <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#00C27C]" style={{ width: `${totalAll > 0 ? (client.total / totalAll) * 100 : 0}%` }} />
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">{totalAll > 0 ? ((client.total / totalAll) * 100).toFixed(1) : 0}% of total</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-[var(--text-primary)]">{fmt(client.total)}</div>
                  <div className="text-xs text-[var(--text-muted)]">last: {format(new Date(client.last), 'MMM yyyy')}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

      </div>
    </div>
  )
}
