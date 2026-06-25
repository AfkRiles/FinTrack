import { useState, useEffect } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { db } from '../../lib/db'
import type { CryptoHolding, StockHolding, CashHolding } from '../../types'

// ── shared dark-glass input style ─────────────────────────────────────────────
const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: '#F9FAFB',
  borderRadius: '12px',
  outline: 'none',
  transition: 'border-color 0.15s ease',
  width: '100%',
  padding: '12px 16px',
  fontSize: '14px',
  fontFamily: 'inherit',
}
function focus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(16,185,129,0.6)'
}
function blur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.10)'
}
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-2">
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD / EDIT CRYPTO
// ═══════════════════════════════════════════════════════════════════════════════
interface AddCryptoProps {
  isOpen: boolean
  onClose: () => void
  editHolding?: CryptoHolding
}

const POPULAR_CRYPTO = [
  { symbol: 'BTC',  name: 'Bitcoin',  tokenId: 'bitcoin' },
  { symbol: 'ETH',  name: 'Ethereum', tokenId: 'ethereum' },
  { symbol: 'SOL',  name: 'Solana',   tokenId: 'solana' },
  { symbol: 'BNB',  name: 'BNB',      tokenId: 'binancecoin' },
  { symbol: 'USDC', name: 'USD Coin', tokenId: 'usd-coin' },
  { symbol: 'USDT', name: 'Tether',   tokenId: 'tether' },
]

export function AddCryptoSheet({ isOpen, onClose, editHolding }: AddCryptoProps) {
  const [symbol,   setSymbol]   = useState('')
  const [name,     setName]     = useState('')
  const [tokenId,  setTokenId]  = useState('')
  const [quantity, setQuantity] = useState('')
  const [price,    setPrice]    = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editHolding) {
        setSymbol(editHolding.symbol)
        setName(editHolding.name)
        setTokenId(editHolding.tokenId)
        setQuantity(String(editHolding.quantity))
        setPrice(editHolding.lastPrice ? String(editHolding.lastPrice) : '')
      } else {
        setSymbol(''); setName(''); setTokenId(''); setQuantity(''); setPrice('')
      }
    }
  }, [isOpen, editHolding])

  const fillPreset = (p: typeof POPULAR_CRYPTO[0]) => {
    setSymbol(p.symbol); setName(p.name); setTokenId(p.tokenId)
  }

  const handleSave = async () => {
    if (!symbol || !name || !quantity) return
    setSaving(true)
    try {
      const qty = parseFloat(quantity)
      const px  = price ? parseFloat(price) : undefined
      if (editHolding) {
        await db.cryptoHoldings.update(editHolding.id, {
          symbol: symbol.toUpperCase(), name, tokenId: tokenId || symbol.toLowerCase(),
          quantity: qty, lastPrice: px, lastPriceUpdated: px ? Date.now() : undefined,
        })
      } else {
        await db.cryptoHoldings.add({
          id: crypto.randomUUID(),
          symbol: symbol.toUpperCase(), name,
          tokenId: tokenId || symbol.toLowerCase(),
          quantity: qty, source: 'manual',
          lastPrice: px, lastPriceUpdated: px ? Date.now() : undefined,
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = symbol.trim() && name.trim() && quantity && parseFloat(quantity) > 0

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editHolding ? 'Edit Crypto' : 'Add Crypto Holding'}>
      <div className="space-y-4 pb-2">

        {/* Quick-pick */}
        {!editHolding && (
          <div>
            <Label>Quick Pick</Label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CRYPTO.map(p => (
                <button
                  key={p.symbol}
                  onClick={() => fillPreset(p)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
                  style={
                    symbol === p.symbol
                      ? { background: '#D97706', color: '#fff', boxShadow: '0 4px 12px rgba(217,119,6,0.35)' }
                      : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.6)' }
                  }
                >
                  {p.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Symbol</Label>
            <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTC" style={inp} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <Label>Name</Label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Bitcoin" style={inp} onFocus={focus} onBlur={blur} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quantity</Label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
              placeholder="0.5" style={inp} inputMode="decimal" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <Label>Price (USD) — optional</Label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="Manual price" style={inp} inputMode="decimal" onFocus={focus} onBlur={blur} />
          </div>
        </div>

        {quantity && price && (
          <div className="px-4 py-3 rounded-xl text-sm text-[rgba(255,255,255,0.6)]"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
            Value: <span className="font-bold text-white">
              ${(parseFloat(quantity || '0') * parseFloat(price || '0')).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full py-4 rounded-2xl text-base font-bold transition-all cursor-pointer"
          style={
            canSave
              ? { background: 'linear-gradient(135deg, #FBB847, #D97706)', color: '#fff', boxShadow: '0 4px 20px rgba(217,119,6,0.30)' }
              : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }
          }
        >
          {saving ? 'Saving…' : editHolding ? 'Save Changes' : 'Add Crypto'}
        </button>
      </div>
    </BottomSheet>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD / EDIT STOCK
// ═══════════════════════════════════════════════════════════════════════════════
interface AddStockProps {
  isOpen: boolean
  onClose: () => void
  editHolding?: StockHolding
}

const EXCHANGES = ['NYSE', 'NASDAQ', 'JSE', 'LSE', 'ASX', 'Other']

export function AddStockSheet({ isOpen, onClose, editHolding }: AddStockProps) {
  const [ticker,   setTicker]   = useState('')
  const [exchange, setExchange] = useState('NYSE')
  const [quantity, setQuantity] = useState('')
  const [price,    setPrice]    = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editHolding) {
        setTicker(editHolding.ticker)
        setExchange(editHolding.exchange)
        setQuantity(String(editHolding.quantity))
        setPrice(editHolding.lastKnownPrice ? String(editHolding.lastKnownPrice) : '')
      } else {
        setTicker(''); setExchange('NYSE'); setQuantity(''); setPrice('')
      }
    }
  }, [isOpen, editHolding])

  const handleSave = async () => {
    if (!ticker || !quantity) return
    setSaving(true)
    try {
      const qty = parseFloat(quantity)
      const px  = price ? parseFloat(price) : undefined
      if (editHolding) {
        await db.stockHoldings.update(editHolding.id, {
          ticker: ticker.toUpperCase(), exchange, quantity: qty,
          lastKnownPrice: px, lastPriceSource: 'manual', lastUpdatedAt: Date.now(),
        })
      } else {
        await db.stockHoldings.add({
          id: crypto.randomUUID(),
          ticker: ticker.toUpperCase(), exchange, quantity: qty,
          lastKnownPrice: px, lastPriceSource: 'manual', lastUpdatedAt: Date.now(),
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = ticker.trim() && quantity && parseFloat(quantity) > 0

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editHolding ? 'Edit Stock' : 'Add Stock Holding'}>
      <div className="space-y-4 pb-2">

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ticker Symbol</Label>
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL" style={inp} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <Label>Exchange</Label>
            <select value={exchange} onChange={e => setExchange(e.target.value)}
              style={{ ...inp, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
              {EXCHANGES.map(ex => (
                <option key={ex} value={ex} style={{ background: '#14141E', color: '#F9FAFB' }}>{ex}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Shares / Units</Label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
              placeholder="10" style={inp} inputMode="decimal" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <Label>Price per share (USD)</Label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="0.00" style={inp} inputMode="decimal" onFocus={focus} onBlur={blur} />
          </div>
        </div>

        {quantity && price && (
          <div className="px-4 py-3 rounded-xl text-sm text-[rgba(255,255,255,0.6)]"
            style={{ background: 'rgba(79,70,229,0.10)', border: '1px solid rgba(79,70,229,0.20)' }}>
            Value: <span className="font-bold text-white">
              ${(parseFloat(quantity || '0') * parseFloat(price || '0')).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <div className="text-xs text-[rgba(255,255,255,0.35)] leading-relaxed">
          Live prices from Twelve Data coming in the next update — for now enter a manual price.
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full py-4 rounded-2xl text-base font-bold transition-all cursor-pointer"
          style={
            canSave
              ? { background: 'linear-gradient(135deg, #818CF8, #4F46E5)', color: '#fff', boxShadow: '0 4px 20px rgba(79,70,229,0.30)' }
              : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }
          }
        >
          {saving ? 'Saving…' : editHolding ? 'Save Changes' : 'Add Stock'}
        </button>
      </div>
    </BottomSheet>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD / EDIT CASH / BANK
// ═══════════════════════════════════════════════════════════════════════════════
interface AddCashProps {
  isOpen: boolean
  onClose: () => void
  editHolding?: CashHolding
}

const CASH_CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'USDC', 'USDT']

export function AddCashSheet({ isOpen, onClose, editHolding }: AddCashProps) {
  const [label,    setLabel]    = useState('')
  const [amount,   setAmount]   = useState('')
  const [currency, setCurrency] = useState('ZAR')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editHolding) {
        setLabel(editHolding.label)
        setAmount(String(editHolding.amount))
        setCurrency(editHolding.currency)
      } else {
        setLabel(''); setAmount(''); setCurrency('ZAR')
      }
    }
  }, [isOpen, editHolding])

  const handleSave = async () => {
    if (!label || !amount) return
    setSaving(true)
    try {
      const amt = parseFloat(amount)
      if (editHolding) {
        await db.cashHoldings.update(editHolding.id, { label, amount: amt, currency })
      } else {
        await db.cashHoldings.add({ id: crypto.randomUUID(), label, amount: amt, currency })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = label.trim() && amount && parseFloat(amount) > 0

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editHolding ? 'Edit Account' : 'Add Bank / Cash'}>
      <div className="space-y-4 pb-2">

        <div>
          <Label>Account / Label</Label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Discovery Bank, FNB Cheque, Savings" style={inp} onFocus={focus} onBlur={blur} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Balance</Label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" style={inp} inputMode="decimal" onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <Label>Currency</Label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              style={{ ...inp, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
              {CASH_CURRENCIES.map(c => (
                <option key={c} value={c} style={{ background: '#14141E', color: '#F9FAFB' }}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full py-4 rounded-2xl text-base font-bold transition-all cursor-pointer"
          style={
            canSave
              ? { background: 'linear-gradient(135deg, #2DD4BF, #0D9488)', color: '#fff', boxShadow: '0 4px 20px rgba(13,148,136,0.30)' }
              : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed' }
          }
        >
          {saving ? 'Saving…' : editHolding ? 'Save Changes' : 'Add Account'}
        </button>
      </div>
    </BottomSheet>
  )
}
