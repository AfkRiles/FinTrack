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
  const stockHoldings = useLiveQuery(() => db.stockHoldings.toArray(), [])
  const cashHoldings = useLiveQuery(() => db.cashHoldings.toArray(), [])

  const rate = fxRate?.usdToZar || 18.5
  const fmt = (usd: number) => currency === 'ZAR' ? formatZAR(usd * rate) : formatUSD(usd)

  // Totals
  const cryptoTotal = (cryptoHoldings || []).reduce((s, h) => {
    const priceUSD = h.lastPrice || 0
    return s + h.quantity * priceUSD
  }, 0)

  const stockTotal = (stockHoldings || []).reduce((s, h) => {
    const priceUSD = h.lastKnownPrice || 0
    return s + h.quantity * priceUSD
  }, 0)

  const cashTotal = (cashHoldings || []).reduce((s, h) => {
    const amtUSD = h.currency === 'ZAR' ? h.amount / rate : h.amount
    return s + amtUSD
  }, 0)

  const totalUSD = cryptoTotal + stockTotal + cashTotal

  const donutSegments = [
    { value: cryptoTotal, color: '#F7931A', label: 'Crypto' },
    { value: stockTotal, color: '#2196F3', label: 'Stocks' },
    { value: cashTotal, color: '#00C27C', label: 'Bank / Cash' },
  ].filter(s => s.value > 0)

  const legendItems = donutSegments.map(s => ({
    label: s.label,
    value: fmt(s.value),
    color: s.color,
    pct: `${totalUSD > 0 ? ((s.value / totalUSD) * 100).toFixed(1) : 0}%`,
  }))

  const toggle = (section: string) =>
    setExpandedSection(expandedSection === section ? null : section)

  return (
    <div className="page-scroll">
      <div className="px-4 pb-28 max-w-lg mx-auto space-y-4 pt-2 page-enter">

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Net Worth</h1>
          <div className="flex gap-2">
            <button className="w-9 h-9 glass-sm rounded-full flex items-center justify-center text-[var(--text-muted)]">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button className="w-9 h-9 fab rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">+</span>
            </button>
          </div>
        </div>

        <CurrencyToggle />

        {/* Net worth hero */}
        <GlassCard>
          <div className="label">NET WORTH</div>
          <div className="hero-number mt-2">{fmt(totalUSD)}</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            {(cryptoHoldings?.length || 0) + (stockHoldings?.length || 0) + (cashHoldings?.length || 0)} holdings
            {fxRate && <> · Updated {formatTime(fxRate.fetchedAt)}</>}
          </div>
        </GlassCard>

        {/* Category cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'CRYPTO', value: cryptoTotal, color: '#F7931A', id: 'crypto' },
            { label: 'STOCKS', value: stockTotal, color: '#2196F3', id: 'stocks' },
            { label: 'BANK', value: cashTotal, color: '#00C27C', id: 'cash' },
          ].map(s => (
            <GlassCard
              key={s.id}
              small
              onClick={() => toggle(s.id)}
              className={expandedSection === s.id ? 'ring-2' : ''}
              style={expandedSection === s.id ? { borderColor: s.color, ringColor: s.color } as React.CSSProperties : {}}
            >
              <div
                className="w-full h-0.5 rounded-full mb-3"
                style={{ background: s.color }}
              />
              <div className="label">{s.label}</div>
              <div className="text-base font-bold text-[var(--text-primary)] mt-1 leading-tight">
                {fmt(s.value)}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Allocation donut */}
        {donutSegments.length > 0 && (
          <GlassCard>
            <div className="label mb-3">ALLOCATION</div>
            <DonutWithLegend
              segments={donutSegments}
              total={fmt(totalUSD)}
              subtitle="Total"
              size={130}
              thickness={22}
              legendItems={legendItems}
            />
          </GlassCard>
        )}

        {/* Crypto accordion */}
        {expandedSection === 'crypto' && (
          <HoldingSection
            title="Crypto"
            count={cryptoHoldings?.length || 0}
            total={fmt(cryptoTotal)}
            color="#F7931A"
          >
            {(cryptoHoldings || []).map(h => (
              <HoldingRow
                key={h.id}
                symbol={h.symbol}
                name={h.name}
                quantity={h.quantity}
                price={h.lastPrice}
                valueUSD={h.quantity * (h.lastPrice || 0)}
                fmt={fmt}
                badge={h.source === 'wallet' ? 'synced' : undefined}
              />
            ))}
            {(cryptoHoldings || []).length === 0 && (
              <EmptyHoldings label="No crypto holdings yet." />
            )}
          </HoldingSection>
        )}

        {/* Stocks accordion */}
        {expandedSection === 'stocks' && (
          <HoldingSection
            title="Stocks"
            count={stockHoldings?.length || 0}
            total={fmt(stockTotal)}
            color="#2196F3"
          >
            {(stockHoldings || []).map(h => (
              <HoldingRow
                key={h.id}
                symbol={h.ticker}
                name={h.exchange}
                quantity={h.quantity}
                price={h.lastKnownPrice}
                valueUSD={h.quantity * (h.lastKnownPrice || 0)}
                fmt={fmt}
                badge={h.lastPriceSource === 'manual' ? 'manual' : undefined}
              />
            ))}
            {(stockHoldings || []).length === 0 && (
              <EmptyHoldings label="No stock holdings yet." />
            )}
          </HoldingSection>
        )}

        {/* Cash accordion */}
        {expandedSection === 'cash' && (
          <HoldingSection
            title="Bank / Cash"
            count={cashHoldings?.length || 0}
            total={fmt(cashTotal)}
            color="#00C27C"
          >
            {(cashHoldings || []).map(h => {
              const amtUSD = h.currency === 'ZAR' ? h.amount / rate : h.amount
              return (
                <GlassCard key={h.id} small className="flex items-center justify-between gap-3">
                  <div className="w-9 h-9 glass-sm rounded-xl flex items-center justify-center text-base flex-shrink-0">
                    🏦
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--text-primary)] truncate">{h.label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{h.amount.toLocaleString()} {h.currency}</div>
                  </div>
                  <div className="font-bold text-[var(--text-primary)] flex-shrink-0">{fmt(amtUSD)}</div>
                </GlassCard>
              )
            })}
            {(cashHoldings || []).length === 0 && (
              <EmptyHoldings label="No cash holdings yet." />
            )}
          </HoldingSection>
        )}

      </div>
    </div>
  )
}

function HoldingSection({ title, count, total, color, children }: {
  title: string; count: number; total: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="font-bold text-[var(--text-primary)]">{title}</span>
          <span className="label">{count}</span>
        </div>
        <span className="font-bold text-[var(--text-primary)]">{total}</span>
      </div>
      {children}
    </div>
  )
}

function HoldingRow({ symbol, name, quantity, price, valueUSD, fmt, badge }: {
  symbol: string; name: string; quantity: number; price?: number;
  valueUSD: number; fmt: (usd: number) => string; badge?: string
}) {
  const initials = symbol.slice(0, 2).toUpperCase()
  return (
    <GlassCard small className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
        style={{ background: 'rgba(247,147,26,0.15)', color: '#F7931A' }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[var(--text-primary)]">{name || symbol}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00C27C]/15 text-[#00C27C] font-semibold">
              {badge}
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} × {price ? `$${price.toLocaleString()}` : 'N/A'}
        </div>
      </div>
      <div className="font-bold text-[var(--text-primary)] flex-shrink-0">{fmt(valueUSD)}</div>
    </GlassCard>
  )
}

function EmptyHoldings({ label }: { label: string }) {
  return (
    <div className="text-center py-8 text-[var(--text-muted)] text-sm">
      <div className="text-3xl mb-2">📭</div>
      {label}
    </div>
  )
}
