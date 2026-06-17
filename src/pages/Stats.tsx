import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { subMonths, format } from 'date-fns'
import { GlassCard } from '../components/ui/GlassCard'
import { CurrencyToggle } from '../components/ui/CurrencyToggle'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { formatZAR, formatUSD } from '../lib/fx'

type RankMode = 'earners' | 'frequency' | 'recent'

export function StatsPage() {
  const { currency, fxRate } = useAppStore()
  const rate = fxRate?.usdToZar || 18.5
  const fmt = (usd: number) => currency === 'ZAR' ? formatZAR(usd * rate) : formatUSD(usd)

  const entries = useLiveQuery(() => db.incomeEntries.orderBy('date').toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const clientStats = useMemo(() => {
    if (!entries) return []
    const map = new Map<string, {
      name: string; total: number; count: number; first: number; last: number; payments: number[]
    }>()
    entries.forEach(e => {
      const existing = map.get(e.sourceName) || { name: e.sourceName, total: 0, count: 0, first: e.date, last: e.date, payments: [] }
      existing.total += e.amountUSD
      existing.count++
      existing.first = Math.min(existing.first, e.date)
      existing.last = Math.max(existing.last, e.date)
      existing.payments.push(e.amountUSD)
      map.set(e.sourceName, existing)
    })
    return Array.from(map.values())
  }, [entries])

  const topEarners = [...clientStats].sort((a, b) => b.total - a.total)
  const mostFrequent = [...clientStats].sort((a, b) => b.count - a.count)
  const mostRecent = [...clientStats].sort((a, b) => b.last - a.last)

  const totalAll = entries?.reduce((s, e) => s + e.amountUSD, 0) || 0
  const topClient = topEarners[0]
  const concentration = topClient && totalAll > 0 ? (topClient.total / totalAll) * 100 : 0

  // Month-over-month
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const lastMonthStart = subMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1).getTime()
  const lastMonthEnd = thisMonthStart - 1

  const thisMonthTotal = entries?.filter(e => e.date >= thisMonthStart).reduce((s, e) => s + e.amountUSD, 0) || 0
  const lastMonthTotal = entries?.filter(e => e.date >= lastMonthStart && e.date <= lastMonthEnd).reduce((s, e) => s + e.amountUSD, 0) || 0
  const momChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null

  // Best month
  const monthlyTotals = new Map<string, number>()
  entries?.forEach(e => {
    const key = format(new Date(e.date), 'yyyy-MM')
    monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + e.amountUSD)
  })
  let bestMonth = { key: '', value: 0 }
  monthlyTotals.forEach((v, k) => { if (v > bestMonth.value) bestMonth = { key: k, value: v } })

  if (!entries || entries.length === 0) {
    return (
      <div className="page-scroll">
        <div className="px-4 pb-28 max-w-lg mx-auto pt-2 page-enter">
          <div className="flex items-center justify-between pt-2 mb-4">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stats</h1>
          </div>
          <div className="text-center py-20 text-[var(--text-muted)]">
            <div className="text-5xl mb-4">📊</div>
            <div className="font-semibold text-lg">No data yet</div>
            <div className="text-sm mt-1">Add some income entries to see stats here.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-scroll">
      <div className="px-4 pb-28 max-w-lg mx-auto space-y-4 pt-2 page-enter">

        <div className="flex items-center justify-between pt-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stats</h1>
        </div>

        <CurrencyToggle />

        {/* Growth card */}
        <GlassCard>
          <div className="label mb-3">GROWTH</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">This month</div>
              <div className="font-bold text-[var(--text-primary)]">{fmt(thisMonthTotal)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">vs last month</div>
              <div className={`font-bold ${momChange !== null ? (momChange >= 0 ? 'text-[#00C27C]' : 'text-red-400') : 'text-[var(--text-muted)]'}`}>
                {momChange !== null ? `${momChange >= 0 ? '+' : ''}${momChange.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">Best month</div>
              <div className="font-bold text-[var(--text-primary)]">{bestMonth.key ? fmt(bestMonth.value) : '—'}</div>
              {bestMonth.key && (
                <div className="text-[10px] text-[var(--text-muted)]">{format(new Date(bestMonth.key), 'MMM yyyy')}</div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Income concentration */}
        {topClient && (
          <GlassCard>
            <div className="label mb-2">CONCENTRATION</div>
            <div className="text-[var(--text-primary)]">
              <span className="font-black text-2xl">{concentration.toFixed(0)}%</span>
              <span className="text-sm text-[var(--text-muted)] ml-2">of income from</span>
            </div>
            <div className="font-bold text-[var(--text-primary)] mt-0.5">{topClient.name}</div>
            <div className="mt-3 h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${concentration > 70 ? 'bg-red-400' : concentration > 50 ? 'bg-yellow-400' : 'bg-[#00C27C]'}`}
                style={{ width: `${Math.min(concentration, 100)}%` }}
              />
            </div>
            {concentration > 70 && (
              <div className="text-xs text-red-400 mt-1.5">High concentration risk</div>
            )}
          </GlassCard>
        )}

        {/* Client leaderboard */}
        <GlassCard noPadding className="overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="label mb-3">CLIENT LEADERBOARD</div>
            <div className="flex gap-2">
              {(['earners', 'frequency', 'recent'] as RankMode[]).map(mode => (
                <span
                  key={mode}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#00C27C] text-white"
                >
                  {mode === 'earners' ? 'Top Earners' : mode === 'frequency' ? 'Most Frequent' : 'Most Recent'}
                </span>
              )).slice(0, 1)}
            </div>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {topEarners.slice(0, 10).map((client, i) => (
              <div key={client.name} className="flex items-center gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${i === 0 ? 'bg-yellow-400/20 text-yellow-500' : i === 1 ? 'bg-gray-400/20 text-gray-400' : i === 2 ? 'bg-orange-400/20 text-orange-400' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--text-primary)] truncate">{client.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {client.count} payment{client.count !== 1 ? 's' : ''} · avg {fmt(client.total / client.count)}
                  </div>
                </div>
                <div className="font-bold text-[var(--text-primary)] flex-shrink-0">{fmt(client.total)}</div>
              </div>
            ))}
          </div>
        </GlassCard>

      </div>
    </div>
  )
}
