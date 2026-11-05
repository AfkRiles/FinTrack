import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import type { AddressBookEntry } from '../../types'

const CURRENCIES: AddressBookEntry['currency'][] = ['USDT', 'USDC', 'ETH']

function truncate(addr: string) {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function WalletBook() {
  const entries = useLiveQuery(() => db.addressBook.orderBy('createdAt').toArray(), [])
  const [copied, setCopied] = useState<string | null>(null)
  const [adding, setAdding] = useState<AddressBookEntry['currency'] | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newAddr, setNewAddr] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ USDT: false, USDC: false, ETH: false })

  const handleCopy = async (id: string, address: string) => {
    await navigator.clipboard.writeText(address)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleDelete = async (id: string) => {
    await db.addressBook.delete(id)
  }

  const handleAdd = async (currency: AddressBookEntry['currency']) => {
    if (!newLabel.trim() || !newAddr.trim()) return
    await db.addressBook.add({
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      address: newAddr.trim(),
      currency,
      createdAt: Date.now(),
    })
    setNewLabel('')
    setNewAddr('')
    setAdding(null)
  }

  const toggle = (c: string) => setExpanded(prev => ({ ...prev, [c]: !prev[c] }))

  return (
    <div className="px-3 space-y-1">
      {CURRENCIES.map(cur => {
        const list = (entries || []).filter(e => e.currency === cur)
        const open = expanded[cur]
        return (
          <div key={cur}>
            {/* Section header */}
            <div className="flex items-center gap-1.5 px-1 py-1.5">
              <button
                onClick={() => toggle(cur)}
                className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                  className="w-2.5 h-2.5 text-[var(--text-faint)] flex-shrink-0 transition-transform"
                  style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{cur}</span>
              </button>
              <button
                onClick={() => { setAdding(adding === cur ? null : cur); setNewLabel(''); setNewAddr('') }}
                className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-all cursor-pointer flex-shrink-0"
                title={`Add ${cur} address`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Add form */}
            {adding === cur && (
              <div className="mb-1.5 px-1 space-y-1.5">
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. Ledger)"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', outline: 'none' }}
                  autoFocus
                />
                <input
                  value={newAddr}
                  onChange={e => setNewAddr(e.target.value)}
                  placeholder="0x… address"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg font-mono"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && handleAdd(cur)}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAdd(cur)}
                    disabled={!newLabel.trim() || !newAddr.trim()}
                    className="flex-1 py-1.5 text-[11px] font-bold text-white rounded-lg cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                  >Save</button>
                  <button
                    onClick={() => setAdding(null)}
                    className="px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] rounded-lg cursor-pointer"
                    style={{ background: 'var(--bg-secondary)' }}
                  >Cancel</button>
                </div>
              </div>
            )}

            {/* Wallet rows */}
            {open && (
              <div className="space-y-0.5 mb-1">
                {list.length === 0 && adding !== cur && (
                  <div className="px-2 py-1 text-[10px] text-[var(--text-faint)]">No addresses</div>
                )}
                {list.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg group hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {/* Label + address */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-[var(--text-primary)] leading-none">{entry.label}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{truncate(entry.address)}</div>
                    </div>
                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(entry.id, entry.address)}
                      className="w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                      style={{ color: copied === entry.id ? 'var(--accent)' : 'var(--text-faint)' }}
                      title="Copy address"
                    >
                      {copied === entry.id
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                      }
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-red-400 transition-all cursor-pointer flex-shrink-0 opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
