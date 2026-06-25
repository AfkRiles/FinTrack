import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { GlassCard } from '../components/ui/GlassCard'
import { DonutWithLegend } from '../components/ui/DonutChart'
import { AddCryptoSheet, AddStockSheet, AddCashSheet } from '../components/networth/AddHoldingSheet'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { formatZAR, formatUSD, formatTime } from '../lib/fx'
import type { CryptoHolding, StockHolding, CashHolding } from '../types'

type Section = 'crypto' | 'stocks' | 'cash'

export function NetWorthPage() {
  const { currency, fxRate } = useAppStore()
  const [activeSection, setActiveSection] = useState<Section>('crypto')
  const [addCrypto,  setAddCrypto]  = useState(false)
  const [addStock,   setAddStock]   = useState(false)
  const [addCash,    setAddCash]    = useState(false)
  const [editCrypto, setEditCrypto] = useState<CryptoHolding | undefined>()
  const [editStock,  setEditStock]  = useState<StockHolding | undefined>()
  const [editCash,   setEditCash]   = useState<CashHolding | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: Section; name: string } | null>(null)

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
    { id: 'crypto' as Section, label: 'Crypto',      value: cryptoTotal, color: '#D97706', count: cryptoHoldings?.length || 0 },
    { id: 'stocks' as Section, label: 'Stocks',      value: stockTotal,  color: '#4F46E5', count: stockHoldings?.length || 0 },
    { id: 'cash'   as Section, label: 'Bank / Cash', value: cashTotal,   color: '#0D9488', count: cashHoldings?.length || 0 },
  ]

  const donutSegments = sections.filter(s => s.value > 0).map(s => ({ value: s.value, color: s.color, label: s.label }))
  const legendItems   = donutSegments.map(s => ({
    label: s.label, value: fmt(s.value), color: s.color,
    pct: `${totalUSD > 0 ? ((s.value / totalUSD) * 100).toFixed(1) : 0}%`,
  }))

  const handleDelete = async () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'crypto')  await db.cryptoHoldings.delete(deleteConfirm.id)
    if (deleteConfirm.type === 'stocks')  await db.stockHoldings.delete(deleteConfirm.id)
    if (deleteConfirm.type === 'cash')    await db.cashHoldings.delete(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  const activeSec = sections.find(s => s.id === activeSection)!

  return (
    <div className="page-scroll">
      <div className="p-8 space-y-5 page-enter">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Net Worth</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {fxRate
              ? `Rate: 1 USD = ${fxRate.usdToZar.toFixed(2)} ZAR · Updated ${formatTime(fxRate.fetchedAt)}`
              : 'Fetching exchange rate…'}
          </p>
        </div>

        {/* Hero + category cards */}
        <div className="grid grid-cols-4 gap-4">
          {/* Total */}
          <GlassCard>
            <div className="label">NET WORTH</div>
            <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">
              {fmt(totalUSD)}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1.5">
              {(cryptoHoldings?.length || 0) + (stockHoldings?.length || 0) + (cashHoldings?.length || 0)} holdings
            </div>
          </GlassCard>

          {sections.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="glass rounded-3xl p-5 cursor-pointer card-hover transition-all"
              style={
                activeSection === s.id
                  ? { boxShadow: `0 0 0 2px ${s.color}, var(--shadow-hover)`, transform: 'translateY(-2px)' }
                  : {}
              }
            >
              <div className="h-0.5 rounded-full mb-3 w-8" style={{ background: s.color }} />
              <div className="label">{s.label.toUpperCase()}</div>
              <div className="mt-2 text-2xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{fmt(s.value)}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1.5">{s.count} {s.count === 1 ? 'holding' : 'holdings'}</div>
            </div>
          ))}
        </div>

        {/* Charts + holdings */}
        <div className="grid grid-cols-5 gap-4">
          {/* Allocation donut */}
          <GlassCard className="col-span-2">
            <div className="label mb-4">ALLOCATION</div>
            {donutSegments.length > 0
              ? <DonutWithLegend segments={donutSegments} total={fmt(totalUSD)} subtitle="Total" size={160} thickness={24} legendItems={legendItems} />
              : (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
                  <div className="text-4xl mb-3 opacity-20">◎</div>
                  <div className="text-sm font-medium">Add holdings to see allocation</div>
                </div>
              )
            }
          </GlassCard>

          {/* Holdings panel */}
          <GlassCard className="col-span-3" noPadding>
            {/* Section tabs */}
            <div className="flex border-b border-[var(--border-subtle)]">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="flex-1 py-3.5 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer relative"
                  style={
                    activeSection === s.id
                      ? { color: s.color }
                      : { color: 'var(--text-muted)' }
                  }
                >
                  {s.label}
                  {activeSection === s.id && (
                    <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full" style={{ background: s.color }} />
                  )}
                </button>
              ))}
            </div>

            {/* Table header with add button */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)]">
              <div className="text-xs text-[var(--text-muted)] font-medium">
                {(activeSection === 'crypto' ? cryptoHoldings?.length : activeSection === 'stocks' ? stockHoldings?.length : cashHoldings?.length) || 0} entries
              </div>
              <button
                onClick={() => {
                  if (activeSection === 'crypto') setAddCrypto(true)
                  else if (activeSection === 'stocks') setAddStock(true)
                  else setAddCash(true)
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all hover:scale-[1.03]"
                style={{ background: activeSec.color, boxShadow: `0 4px 12px ${activeSec.color}44` }}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Add {activeSec.label}
              </button>
            </div>

            {/* Rows */}
            <div className="overflow-y-auto" style={{ maxHeight: 340, scrollbarWidth: 'none' }}>
              {activeSection === 'crypto' && (
                cryptoHoldings?.length === 0
                  ? <EmptyState label="No crypto holdings yet." onAdd={() => setAddCrypto(true)} color="#D97706" />
                  : cryptoHoldings?.map(h => (
                    <HoldingRow
                      key={h.id}
                      symbol={h.symbol}
                      name={h.name}
                      detail={`${h.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} coins × ${h.lastPrice ? `$${h.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'no price'}`}
                      value={h.lastPrice ? fmt(h.quantity * h.lastPrice) : '—'}
                      color="#D97706"
                      badge={h.source === 'wallet' ? 'synced' : 'manual'}
                      onEdit={() => { setEditCrypto(h); setAddCrypto(true) }}
                      onDelete={() => setDeleteConfirm({ id: h.id, type: 'crypto', name: `${h.name} (${h.symbol})` })}
                    />
                  ))
              )}
              {activeSection === 'stocks' && (
                stockHoldings?.length === 0
                  ? <EmptyState label="No stock holdings yet." onAdd={() => setAddStock(true)} color="#4F46E5" />
                  : stockHoldings?.map(h => (
                    <HoldingRow
                      key={h.id}
                      symbol={h.ticker}
                      name={h.exchange}
                      detail={`${h.quantity} shares × ${h.lastKnownPrice ? `$${h.lastKnownPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'no price'}`}
                      value={h.lastKnownPrice ? fmt(h.quantity * h.lastKnownPrice) : '—'}
                      color="#4F46E5"
                      badge="manual"
                      onEdit={() => { setEditStock(h); setAddStock(true) }}
                      onDelete={() => setDeleteConfirm({ id: h.id, type: 'stocks', name: `${h.ticker} (${h.exchange})` })}
                    />
                  ))
              )}
              {activeSection === 'cash' && (
                cashHoldings?.length === 0
                  ? <EmptyState label="No accounts yet." onAdd={() => setAddCash(true)} color="#0D9488" />
                  : cashHoldings?.map(h => {
                    const amtUSD = h.currency === 'ZAR' ? h.amount / rate : h.amount
                    return (
                      <HoldingRow
                        key={h.id}
                        symbol={h.currency}
                        name={h.label}
                        detail={`${h.amount.toLocaleString('en-ZA', { maximumFractionDigits: 2 })} ${h.currency}`}
                        value={fmt(amtUSD)}
                        color="#0D9488"
                        onEdit={() => { setEditCash(h); setAddCash(true) }}
                        onDelete={() => setDeleteConfirm({ id: h.id, type: 'cash', name: h.label })}
                      />
                    )
                  })
              )}
            </div>
          </GlassCard>
        </div>

      </div>

      {/* Add / Edit sheets */}
      <AddCryptoSheet
        isOpen={addCrypto}
        onClose={() => { setAddCrypto(false); setEditCrypto(undefined) }}
        editHolding={editCrypto}
      />
      <AddStockSheet
        isOpen={addStock}
        onClose={() => { setAddStock(false); setEditStock(undefined) }}
        editHolding={editStock}
      />
      <AddCashSheet
        isOpen={addCash}
        onClose={() => { setAddCash(false); setEditCash(undefined) }}
        editHolding={editCash}
      />

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative modal-glass rounded-2xl p-6 w-full max-w-sm animate-[scaleIn_0.18s_ease-out]">
            <div className="text-lg font-bold text-white mb-2">Delete holding?</div>
            <div className="text-sm text-[rgba(255,255,255,0.55)] mb-5">
              This will permanently remove <span className="text-white font-semibold">{deleteConfirm.name}</span> from your net worth.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white cursor-pointer transition-all"
                style={{ background: 'linear-gradient(135deg, #f87171, #dc2626)', boxShadow: '0 4px 16px rgba(220,38,38,0.30)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Holding row ────────────────────────────────────────────────────────────────
function HoldingRow({ symbol, name, detail, value, color, badge, onEdit, onDelete }: {
  symbol: string; name: string; detail: string; value: string
  color: string; badge?: string; onEdit: () => void; onDelete: () => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-secondary)] transition-colors group cursor-pointer border-b border-[var(--border-subtle)] last:border-0"
      onClick={() => setShowActions(v => !v)}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
        style={{ background: `${color}18`, color }}
      >
        {symbol.length <= 4 ? symbol.slice(0, 4) : symbol.slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[var(--text-primary)]">{name}</span>
          {badge && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
              style={{ background: `${color}18`, color }}
            >{badge}</span>
          )}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{detail}</div>
      </div>

      {/* Value + actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="font-bold text-sm text-[var(--text-primary)] tabular-nums text-right">{value}</div>

        {/* Action buttons — visible on hover or tap */}
        <div className={`flex items-center gap-1 transition-all ${showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-[var(--bg-tertiary)]"
            title="Edit"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:bg-red-500/10"
            title="Delete"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ label, onAdd, color }: { label: string; onAdd: () => void; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${color}12` }}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={color} strokeWidth={2}>
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-sm text-[var(--text-muted)] mb-4">{label}</div>
      <button
        onClick={onAdd}
        className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer transition-all hover:scale-[1.03]"
        style={{ background: color, boxShadow: `0 4px 12px ${color}44` }}
      >
        Add now
      </button>
    </div>
  )
}
