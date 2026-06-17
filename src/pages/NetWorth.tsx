import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { GlassCard } from '../components/ui/GlassCard'
import { DonutWithLegend } from '../components/ui/DonutChart'
import { CurrencyToggle } from '../components/ui/CurrencyToggle'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { formatZAR, formatUSD, formatTime } from '../lib/fx'

export function NetWorthPage() {
  const { currency, fxRate } = useAppStore()
  const [expandedSection, setExpandedSection] = useState<string | null>('crypto')

  const cryptoHoldings = useLiveQuery(() => db.cryptoHoldings.toArray(), [])
  const stockHoldings  = useLiveQuery(() => db.stockHoldings.toArray(), [])
  const cashHoldings   = useLiveQuery(() => db.cashHoldings.toArray(), [])

  const rate = fxRate?.usdToZar || 18.5
  const fmt = (usd: number) => currency === 'ZAR' ? formatZAR(usd * rate) : formatUSD(usd)

  const cryptoTotal = (cryptoHoldings || []).reduce((s, h) => s + h.quantity * (h.lastPrice || 0), 0)
  const stockTotal  = (stockHoldings || []).reduce((s, h) => s + h.quantity * (h.lastKnownPrice || 0), 0)
  const cashTotal   = (cashHoldings || []).reduce((s, h) => s + (h.currency === 'ZAR' ? h.amount / rate : h.amount), 0)
  const totalUSD    = cryptoTotal + stockTotal + cashTotal

  const sections = [
    { id: 'crypto', label: 'Crypto', value: cryptoTotal, color: '#F7931A', count: cryptoHoldings?.length || 0 },
    { id: 'stocks', label: 'Stocks', value: stockTotal,  color: '#2196F3', count: stockHoldings?.length || 0 },
    { id: 'cash',   label: 'Bank / Cash', value: cashTotal, color: '#00C27C', count: cashHoldings?.length || 0 },
  ]

  const donutSegments = sections.filter(s => s.value > 0).map(s => ({ value: s.value, color: s.color, label: s.label }))
  const legendItems   = donutSegments.map(s => ({
    label: s.label, value: fmt(s.value), color: s.color,
    pct: `${totalUSD > 0 ? ((s.value / totalUSD) * 100).toFixed(1) : 0}%`,
  }))

  return (
    <div className="page-scroll">
      <div className="p-8 space-y-6 page-enter">

        <div className="flex items-center justify-between">
          <CurrencyToggle />
          {fxRate && (
            <span className="text-xs text-[var(--text-muted)]">Updated {formatTime(fxRate.fetchedAt)}</span>
          )}
        </div>

        {/* Top row: hero + 3 category cards */}
        <div className="grid grid-cols-4 gap-4">
          <GlassCard className="col-span-1">
            <div className="label">NET WORTH</div>
            <div className="hero-number mt-2 text-3xl">{fmt(totalUSD)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {(cryptoHoldings?.length || 0) + (stockHoldings?.length || 0) + (cashHoldings?.length || 0)} holdings
            </div>
          </GlassCard>

          {sections.map(s => (
            <GlassCard
              key={s.id}
              onClick={() => setExpandedSection(expandedSection === s.id ? null : s.id)}
              className={`cursor-pointer transition-all hover:scale-[1.01] ${expandedSection === s.id ? 'ring-2' : ''}`}
              style={expandedSection === s.id ? { '--tw-ring-color': s.color } as React.CSSProperties : {}}
            >
              <div className="h-1 rounded-full mb-3 w-full" style={{ background: s.color }} />
              <div className="label">{s.label.toUpperCase()}</div>
              <div className="amount-lg mt-2">{fmt(s.value)}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{s.count} holdings</div>
            </GlassCard>
          ))}
        </div>

        {/* Charts + holdings */}
        <div className="grid grid-cols-5 gap-4">
          {/* Allocation donut */}
          <GlassCard className="col-span-2">
            <div className="label mb-4">ALLOCATION</div>
            {donutSegments.length > 0
              ? <DonutWithLegend segments={donutSegments} total={fmt(totalUSD)} subtitle="Total" size={160} thickness={26} legendItems={legendItems} />
              : <div className="text-center py-10 text-[var(--text-muted)] text-sm">Add holdings to see allocation</div>
            }
          </GlassCard>

          {/* Holdings detail */}
          <GlassCard className="col-span-3" noPadding>
            {expandedSection === 'crypto' && (
              <HoldingsTable
                title="Crypto Holdings"
                color="#F7931A"
                rows={(cryptoHoldings || []).map(h => ({
                  id: h.id, symbol: h.symbol, name: h.name,
                  detail: `${h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} × ${h.lastPrice ? `$${h.lastPrice.toLocaleString()}` : 'N/A'}`,
                  value: fmt(h.quantity * (h.lastPrice || 0)),
                  badge: h.source === 'wallet' ? 'synced' : undefined,
                }))}
                emptyLabel="No crypto holdings. Use + Add Entry to add some."
              />
            )}
            {expandedSection === 'stocks' && (
              <HoldingsTable
                title="Stock Holdings"
                color="#2196F3"
                rows={(stockHoldings || []).map(h => ({
                  id: h.id, symbol: h.ticker, name: h.exchange,
                  detail: `${h.quantity} × ${h.lastKnownPrice ? `$${h.lastKnownPrice.toLocaleString()}` : 'N/A'}`,
                  value: fmt(h.quantity * (h.lastKnownPrice || 0)),
                  badge: h.lastPriceSource === 'manual' ? 'manual price' : undefined,
                }))}
                emptyLabel="No stock holdings yet."
              />
            )}
            {expandedSection === 'cash' && (
              <HoldingsTable
                title="Bank / Cash"
                color="#00C27C"
                rows={(cashHoldings || []).map(h => {
                  const amtUSD = h.currency === 'ZAR' ? h.amount / rate : h.amount
                  return {
                    id: h.id, symbol: '🏦', name: h.label,
                    detail: `${h.amount.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} ${h.currency}`,
                    value: fmt(amtUSD),
                  }
                })}
                emptyLabel="No cash holdings yet."
              />
            )}
            {!expandedSection && (
              <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">
                Click a category card to view holdings
              </div>
            )}
          </GlassCard>
        </div>

      </div>
    </div>
  )
}

function HoldingsTable({ title, color, rows, emptyLabel }: {
  title: string
  color: string
  rows: Array<{ id: string; symbol: string; name: string; detail: string; value: string; badge?: string }>
  emptyLabel: string
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <div className="label">{title.toUpperCase()}</div>
      </div>
      {rows.length === 0
        ? <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm px-6 text-center">{emptyLabel}</div>
        : (
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {rows.map(row => (
              <div key={row.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-secondary)] transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{ background: `${color}18`, color }}>
                  {row.symbol.length <= 2 ? row.symbol : row.symbol.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">{row.name}</span>
                    {row.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#00C27C]/15 text-[#00C27C]">{row.badge}</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{row.detail}</div>
                </div>
                <div className="font-bold text-[var(--text-primary)]">{row.value}</div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
