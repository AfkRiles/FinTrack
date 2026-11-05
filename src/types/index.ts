export type Currency = 'USD' | 'ZAR'
export type Theme = 'light' | 'dark' | 'system'
export type Tab = 'income' | 'networth' | 'stats' | 'spending'

export interface Category {
  id: string
  name: string
  color: string
  createdAt: number
}

export interface IncomeEntry {
  id: string
  categoryId: string
  amount: number
  currency: string
  amountZAR: number
  amountUSD: number
  date: number
  sourceName: string
  note?: string
  createdAt: number
}

export interface CryptoHolding {
  id: string
  tokenId: string
  symbol: string
  name: string
  quantity: number
  source: 'manual' | 'wallet' | 'wallet-manual'  // wallet-manual = wallet-sourced but qty manually overridden
  walletId?: string
  lastPrice?: number
  lastPriceUpdated?: number
}

export interface Wallet {
  id: string
  address: string
  chain: string
  label: string
  zpub?: string        // BTC only: zpub enables full HD wallet scanning (auto-discovers all addresses)
  lastSyncedAt?: number
}

export interface StockHolding {
  id: string
  ticker: string
  exchange: string
  quantity: number
  lastKnownPrice?: number
  lastPriceSource: 'api' | 'manual'
  lastUpdatedAt?: number
}

export interface CashHolding {
  id: string
  label: string
  amount: number
  currency: string
}

export interface NetWorthSnapshot {
  id: string
  date: number
  totalUSD: number
  totalZAR: number
}

export interface FXRate {
  usdToZar: number
  fetchedAt: number
}

export interface AddressBookEntry {
  id: string
  label: string
  address: string
  currency: 'USDT' | 'USDC' | 'ETH'
  createdAt: number
}

// ── Spending / Ether.fi ──────────────────────────────────────────────────────

export type SpendingTxType = 'card_spend' | 'topup' | 'affiliate_reward' | 'affiliate_payout' | 'card_refund' | 'fee' | 'other'
export type SpendingTxStatus = 'CLEARED' | 'DECLINED' | 'CANCELLED' | 'pending' | 'paid' | 'unknown'

export type FintrackCategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Health & Personal Care'
  | 'Fitness & Sport'
  | 'Travel'
  | 'Subscriptions & Digital'
  | 'Bills & Services'
  | 'Fees'
  | 'Other'
  | 'Uncategorized'

export interface BankTransaction {
  id: string              // deterministic fingerprint
  source: 'etherfi'
  timestamp: number       // ms UTC
  monthKey: string        // 'YYYY-MM'
  type: SpendingTxType
  description: string
  status: SpendingTxStatus
  amountUsd: number
  currency: string
  originalAmount: number | null
  originalCurrency: string | null
  amountZar: number       // ZAR amount used for display
  rawCategory: string
  fintrackCategory: FintrackCategory
  card: string
  cardHolder: string
  cashbackAmount: number
  cashbackCurrency: string
  spendingMode: string
  importedAt: number
  merchantOverrideApplied: boolean
}

export interface MerchantRule {
  id: string              // normalized merchant name
  category: FintrackCategory
  createdAt: number
}

export interface ImportRecord {
  id: string
  filename: string
  importedAt: number
  txCount: number
  addedCount: number
  updatedCount: number
  skippedCount: number
  monthsAffected: string[]
}
