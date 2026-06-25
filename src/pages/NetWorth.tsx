import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { GlassCard } from '../components/ui/GlassCard'
import { DonutWithLegend } from '../components/ui/DonutChart'
import { AddCryptoSheet, AddStockSheet, AddCashSheet } from '../components/networth/AddHoldingSheet'
import { db } from '../lib/db'
import { useAppStore } from '../store/useAppStore'
import { formatZAR, formatUSD, formatTime } from '../lib/fx'
import { syncWallets, WALLET_CONFIGS, shortAddress, type WalletSyncResult, type WalletChain } from '../lib/walletSync'
import type { CryptoHolding, StockHolding, CashHolding } from '../types'

type Section = 'crypto' | 'stocks' | 'cash' | 'wallets'

// Chain info for display
const CHAIN_META: Record<WalletChain, { icon: string; color: string }> = {
  bitcoin:    { icon: '₿',  color: '#D97706' },
  ethereum:   { icon: 'Ξ',  color: '#627EEA' },
  solana:     { icon: '◎',  color: '#9945FF' },
  xrp:        { icon: '✕',  color: '#00AAE4' },
  'usdc-eth': { icon: '$',  color: '#2775CA' },
  cardano:    { icon: '₳',  color: '#0033AD' },
  avalanche:  { icon: '▲',  color: '#E84142' },
  sui:        { icon: '●',  color: '#6FBCF0' },
}

export function NetWorthPage() {
  const { currency, fxRate } = useAppStore()
  const [activeSection, setActiveSection] = useState<Section>('wallets')
  const [addCrypto,  setAddCrypto]  = useState(false)
  const [addStock,   setAddStock]   = useState(false)
  const [addCash,    setAddCash]    = useState(false)
  const [editCrypto, setEditCrypto] = useState<CryptoHolding | undefined>()
  const [editStock,  setEditStock]  = useState<StockHolding | undefined>()
  const [editCash,   setEditCash]   = useState<CashHolding | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'crypto' | 'stocks' | 'cash'; name: string } | null>(null)

  // Wallet sync state
  const [syncing, setSyncing]       = useState(false)
  const [syncResults, setSyncResults] = useState<Record<string, WalletSyncResult | null>>({})
  const [lastSyncAt, setLastSyncAt]  = useState<number | null>(null)
  const [syncLoadingSet, setSyncLoadingSet] = useState<Set<string>>(new Set())

  const cryptoHoldings = useLiveQuery(() => db.cryptoHoldings.toArray(), [])
  const stockHoldings  = useLiveQuery(() => db.stockHoldings.toArray(), [])
  const cashHoldings   = useLiveQuery(() => db.cashHoldings.toArray(), [])

  const rate = fxRate?.usdToZar || 18.5
  const fmt = (usd: number) => currency === 'ZAR' ? formatZAR(usd * rate) : formatUSD(usd)

  const cryptoTotal = (cryptoHoldings || []).reduce((s, h) => s + h.quantity * (h.lastPrice || 0), 0)
  const stockTotal  = (stockHoldings || []).reduce((s, h) => s + h.quantity * (h.lastKnownPrice || 0), 0)
  const cashTotal   = (cashHoldings || []).reduce((s, h) => s + (h.currency === 'ZAR' ? h.amount / rate : h.amount), 0)
  const totalUSD    = cryptoTotal + stockTotal + cashTotal

  // Wallet total from sync results
  const walletTotal = Object.values(syncResults).reduce((s, r) => s + (r?.valueUSD ?? 0), 0)

  const sections = [
    { id: 'wallets' as Section, label: 'Wallets',     value: walletTotal,  color: '#059669', count: WALLET_CONFIGS.length },
    { id: 'crypto'  as Section, label: 'Crypto',      value: cryptoTotal,  color: '#D97706', count: cryptoHoldings?.length || 0 },
    { id: 'stocks'  as Section, label: 'Stocks',      value: stockTotal,   color: '#4F46E5', count: stockHoldings?.length || 0 },
    { id: 'cash'    as Section, label: 'Bank / Cash', value: cashTotal,    color: '#0D9488', count: cashHoldings?.length || 0 },
  ]

  const donutSegments = sections.filter(s => s.value > 0).map(s => ({ value: s.value, color: s.color, label: s.label }))
  const legendItems   = donutSegments.map(s => ({
    label: s.label, value: fmt(s.value), color: s.color,
    pct: `${totalUSD + walletTotal > 0 ? ((s.value / (totalUSD + walletTotal)) * 100).toFixed(1) : 0}%`,
  }))

  const grandTotal = totalUSD + walletTotal

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncLoadingSet(new Set(WALLET_CONFIGS.map(w => w.chain)))
    setSyncResults({})
    try {
      await syncWallets((chain, result) => {
        if (result === null) {
          setSyncLoadingSet(prev => new Set(prev).add(chain))
        } else {
          setSyncLoadingSet(prev => { const next = new Set(prev); next.delete(chain); return next })
          setSyncResults(prev => ({ ...prev, [chain]: result }))
        }
      })
      setLastSyncAt(Date.now())
    } finally {
      setSyncing(false)
      setSyncLoadingSet(new Set())
    }
  }, [])

  // Auto-sync on mount
  useEffect(() => { handleSync() }, [])

  const handleDelete = async () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'crypto') await db.cryptoHoldings.delete(deleteConfirm.id)
    if (deleteConfirm.type === 'stocks') await db.stockHoldings.delete(deleteConfirm.id)
    if (deleteConfirm.type === 'cash')   await db.cashHoldings.delete(deleteConfirm.id)
    setDeleteConfirm(null)
  }

  const activeSec = sections.find(s => s.id === activeSection)!

  return (
    <div className="page-scroll">
      <div className="p-8 space-y-5 page-enter">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Net Worth</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {lastSyncAt
                ? `Wallets synced at ${formatTime(lastSyncAt)} · Rate: 1 USD = ${fxRate?.usdToZar.toFixed(2) ?? '—'} ZAR`
                : fxRate
                ? `Rate: 1 USD = ${fxRate.usdToZar.toFixed(2)} ZAR`
                : 'Fetching data…'
              }
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 16px rgba(5,150,105,0.28)' }}
          >
            <svg viewBox="0 0 24 24" className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Syncing…' : 'Sync Wallets'}
          </button>
        </div>

        {/* Hero + section cards */}
        <div className="grid grid-cols-5 gap-4">
          {/* Total net worth hero */}
          <GlassCard className="col-span-1">
            <div className="label">NET WORTH</div>
            <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">
              {fmt(grandTotal)}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1.5">
              {((cryptoHoldings?.length || 0) + (stockHoldings?.length || 0) + (cashHoldings?.length || 0))} manual + {WALLET_CONFIGS.length} wallets
            </div>
          </GlassCard>

          {sections.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className="glass rounded-3xl p-4 cursor-pointer card-hover transition-all"
              style={activeSection === s.id ? { boxShadow: `0 0 0 2px ${s.color}, var(--shadow-hover)`, transform: 'translateY(-2px)' } : {}}
            >
              <div className="h-0.5 rounded-full mb-2.5 w-6" style={{ background: s.color }} />
              <div className="label">{s.label.toUpperCase()}</div>
              <div className="mt-1.5 text-xl font-extrabold text-[var(--text-primary)] tracking-tight leading-none">{fmt(s.value)}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{s.count} {s.id === 'wallets' ? 'wallets' : s.count === 1 ? 'holding' : 'holdings'}</div>
            </div>
          ))}
        </div>

        {/* Charts + detail panel */}
        <div className="grid grid-cols-5 gap-4">
          {/* Allocation donut */}
          <GlassCard className="col-span-2">
            <div className="label mb-4">ALLOCATION</div>
            {donutSegments.length > 0
              ? <DonutWithLegend segments={donutSegments} total={fmt(grandTotal)} subtitle="Total" size={160} thickness={24} legendItems={legendItems} />
              : (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
                  <div className="text-4xl mb-3 opacity-20">◎</div>
                  <div className="text-sm font-medium">Sync wallets or add holdings</div>
                </div>
              )
            }
          </GlassCard>

          {/* Detail panel */}
          <GlassCard className="col-span-3" noPadding>
            {/* Section tabs */}
            <div className="flex border-b border-[var(--border-subtle)]">
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="flex-1 py-3 text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer relative"
                  style={activeSection === s.id ? { color: s.color } : { color: 'var(--text-muted)' }}
                >
                  {s.label}
                  {activeSection === s.id && (
                    <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ background: s.color }} />
                  )}
                </button>
              ))}
            </div>

            {/* Add button (not shown for wallets tab) */}
            {activeSection !== 'wallets' && (
              <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-muted)] font-medium">
                  {activeSec.count} {activeSec.count === 1 ? 'entry' : 'entries'}
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
            )}

            {/* Wallets panel */}
            {activeSection === 'wallets' && (
              <div className="overflow-y-auto" style={{ maxHeight: 360, scrollbarWidth: 'none' }}>
                {WALLET_CONFIGS.map(w => {
                  const meta = CHAIN_META[w.chain]
                  const result = syncResults[w.chain]
                  const loading = syncLoadingSet.has(w.chain)
                  return (
                    <div
                      key={w.chain}
                      className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={{ background: `${meta.color}18`, color: meta.color }}
                      >
                        {meta.icon}
                      </div>

                      {/* Name + address */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[var(--text-primary)]">{w.label}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                            style={{ background: `${meta.color}18`, color: meta.color }}>
                            {w.symbol}
                          </span>
                          {result?.status === 'error' && (
                            <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">error</span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">{shortAddress(w.address)}</div>
                      </div>

                      {/* Balance + value */}
                      <div className="text-right flex-shrink-0">
                        {loading ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="h-4 w-20 bg-[var(--bg-secondary)] rounded animate-pulse" />
                            <div className="h-3 w-14 bg-[var(--bg-secondary)] rounded animate-pulse" />
                          </div>
                        ) : result ? (
                          <>
                            <div className="font-bold text-sm text-[var(--text-primary)] tabular-nums">
                              {fmt(result.valueUSD)}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] tabular-nums">
                              {result.balance.toLocaleString('en-US', { maximumFractionDigits: 6 })} {w.symbol}
                            </div>
                            {result.status === 'error' && result.error && (
                              <div className="text-[10px] text-red-400 mt-0.5 max-w-28 truncate">{result.error}</div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-[var(--text-muted)]">—</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Crypto panel */}
            {activeSection === 'crypto' && (
              <div className="overflow-y-auto" style={{ maxHeight: 320, scrollbarWidth: 'none' }}>
                {(cryptoHoldings || []).length === 0
                  ? <EmptyState label="No crypto holdings yet." onAdd={() => setAddCrypto(true)} color="#D97706" />
                  : (cryptoHoldings || []).map(h => (
                    <HoldingRow
                      key={h.id}
                      symbol={h.symbol}
                      name={h.name}
                      detail={`${h.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} × ${h.lastPrice ? `$${h.lastPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'no price'}`}
                      value={h.lastPrice ? fmt(h.quantity * h.lastPrice) : '—'}
                      color="#D97706"
                      badge={h.source === 'wallet' ? 'synced' : 'manual'}
                      onEdit={() => { setEditCrypto(h); setAddCrypto(true) }}
                      onDelete={() => setDeleteConfirm({ id: h.id, type: 'crypto', name: `${h.name} (${h.symbol})` })}
                    />
                  ))
                }
              </div>
            )}

            {/* Stocks panel */}
            {activeSection === 'stocks' && (
              <div className="overflow-y-auto" style={{ maxHeight: 320, scrollbarWidth: 'none' }}>
                {(stockHoldings || []).length === 0
                  ? <EmptyState label="No stock holdings yet." onAdd={() => setAddStock(true)} color="#4F46E5" />
                  : (stockHoldings || []).map(h => (
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
                }
              </div>
            )}

            {/* Cash panel */}
            {activeSection === 'cash' && (
              <div className="overflow-y-auto" style={{ maxHeight: 320, scrollbarWidth: 'none' }}>
                {(cashHoldings || []).length === 0
                  ? <EmptyState label="No accounts yet." onAdd={() => setAddCash(true)} color="#0D9488" />
                  : (cashHoldings || []).map(h => {
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
                }
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* Sheets */}
      <AddCryptoSheet isOpen={addCrypto} onClose={() => { setAddCrypto(false); setEditCrypto(undefined) }} editHolding={editCrypto} />
      <AddStockSheet  isOpen={addStock}  onClose={() => { setAddStock(false);  setEditStock(undefined)  }} editHolding={editStock} />
      <AddCashSheet   isOpen={addCash}   onClose={() => { setAddCash(false);   setEditCash(undefined)   }} editHolding={editCash} />

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={() => setDeleteConfirm(null)} />
          <div className="relative modal-glass rounded-2xl p-6 w-full max-w-sm animate-[scaleIn_0.18s_ease-out]">
            <div className="text-lg font-bold text-white mb-2">Delete holding?</div>
            <div className="text-sm text-[rgba(255,255,255,0.55)] mb-5">
              This will permanently remove <span className="text-white font-semibold">{deleteConfirm.name}</span>.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-xl text-sm font-bold text-white cursor-pointer" style={{ background: 'linear-gradient(135deg, #f87171, #dc2626)' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HoldingRow({ symbol, name, detail, value, color, badge, onEdit, onDelete }: {
  symbol: string; name: string; detail: string; value: string
  color: string; badge?: string; onEdit: () => void; onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-secondary)] transition-colors group border-b border-[var(--border-subtle)] last:border-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: `${color}18`, color }}>
        {symbol.slice(0, 4)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[var(--text-primary)]">{name}</span>
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide" style={{ background: `${color}18`, color }}>{badge}</span>
          )}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{detail}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="font-bold text-sm text-[var(--text-primary)] tabular-nums">{value}</div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer" title="Edit">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all cursor-pointer" title="Delete">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ label, onAdd, color }: { label: string; onAdd: () => void; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${color}12` }}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={color} strokeWidth={2}><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
      </div>
      <div className="text-sm text-[var(--text-muted)] mb-4">{label}</div>
      <button onClick={onAdd} className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer" style={{ background: color }}>{label.includes('crypto') ? 'Add Crypto' : label.includes('stock') ? 'Add Stock' : 'Add Account'}</button>
    </div>
  )
}
