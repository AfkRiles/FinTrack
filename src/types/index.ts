export type Currency = 'USD' | 'ZAR'
export type Theme = 'light' | 'dark' | 'system'
export type Tab = 'income' | 'networth' | 'stats'

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
